// 순수 전투 규칙. 좌표는 x,z 평면, 시간은 초. 화면 연출은 main.js가 이벤트를 보고 처리한다.
import { dist, inArc } from './geom.js';

export const PLAYER_MAX_HP = 5;
export const ENEMY_HP = 3;
export const ENEMY_SPEED = 2.2;
export const ENEMY_REACH = 1.4;      // 이 거리 안이면 공격 준비에 들어간다
export const ENEMY_WINDUP = 0.5;     // 공격 준비 시간. 이 사이에 피하면 맞지 않는다
export const ENEMY_COOLDOWN = 1.2;
export const SWING_RANGE = 2.4;
export const SWING_HALF = Math.PI / 3;
export const SWING_COOLDOWN = 0.45;
export const DODGE_TIME = 0.4;
export const HOLY_GAUGE = 3;       // 성휘 게이지: 베기로 맞힌 적마다 한 칸, 가득 차면 성휘참을 쓸 수 있다
export const HOLY_CHARGE = 0.6;    // Z를 이만큼(초) 누르고 있다가 떼면 성휘참(누른 시간은 main.js가 잰다)
export const HOLY_RANGE = 4.5;     // 성휘참이 닿는 앞쪽 거리(칸 가운데 기준 4칸)
export const HOLY_HALF = 1.5;      // 성휘참 폭의 절반(폭 3칸)
export const HOLY_DAMAGE = 2;
// 적 종류(enemies의 세 번째 값, 없으면 걸음꾼). 걸음꾼은 위의 ENEMY_* 수치.
export const THROWER_HP = 2;
export const THROW_EVERY = 1.5;    // 투척꾼이 오물을 던지는 간격(초)
export const SHOT_SPEED = 6;       // 오물: 초당 칸
export const SHOT_RANGE = 8;       // 오물이 날아가는 최대 거리
export const SHOT_HIT = 0.5;
export const THROWER_NEAR = 3;     // 이보다 가까우면 물러난다
export const THROWER_FAR = 6;      // 이보다 멀면 다가온다
export const THROW_MAX = 7;        // 이 거리 안이면 던진다(물러나는 중에는 안 던진다)
export const CHARGER_HP = 4;
export const CHARGE_WINDUP = 0.7;  // 같은 줄에 서면 이만큼 준비(붉은 깜빡임) 뒤 돌진
export const CHARGE_SPEED = 12;
export const CHARGE_RANGE = 6;     // 이 거리 안의 같은 줄이면 돌진, 돌진은 이만큼 간다
export const CHARGE_HIT = 0.7;
export const STUN_TIME = 1.5;      // 막힌 칸에 부딪히면 기절
const HP = { walker: ENEMY_HP, thrower: THROWER_HP, charger: CHARGER_HP };

// hp: 아코스가 이 체력으로 시작한다(전투 사이에 이어지는 체력)
export function createFight(def, hp = PLAYER_MAX_HP) {
  return {
    def,
    hp,
    // 투척꾼은 첫 오물까지 한 박자 쉰다
    enemies: def.enemies.map(([x, z, kind = 'walker']) => ({
      x, z, kind, hp: def.enemyHp ?? HP[kind], cd: kind === 'thrower' ? THROW_EVERY : 0, windup: 0, dash: null, stun: 0,
    })),
    shots: [],    // 날아가는 오물
    time: 0,
    swingCd: 0,
    invuln: 0,
    gauge: 0,     // 성휘 게이지(전투마다 0부터)
    result: null,
  };
}

// ponytail: 적끼리는 겹쳐도 밀어내지 않는다. 한 번에 3마리라 티가 덜 난다. 거슬리면 resolve로 서로 밀어낸다.
// blocked(x, z): 막힌 칸. 적은 막힌 칸에 들어가지 않고, 곧게 못 오면 칸 길(아코스까지의 걸음 수)을 따라 돌아온다.
export function update(f, dt, player, blocked = () => false) {
  const events = [];
  if (f.result) return events;
  f.time += dt;
  f.swingCd = Math.max(0, f.swingCd - dt);
  f.invuln = Math.max(0, f.invuln - dt);
  if (f.def.frozen) {
    if (f.time >= f.def.timeLimit) { f.result = 'lost'; events.push('lost'); }
    return events;
  }
  moveShots(f, dt, player, blocked, events);   // 이번 프레임에 던진 오물은 다음 프레임부터 난다
  let steps = null;   // 아코스까지의 칸 걸음 수(필요할 때 한 번만 센다)
  const way = { blocked, steps: () => (steps ??= stepsTo(player, blocked)) };
  f.enemies.forEach((e, i) => {
    if (e.hp <= 0) return;
    e.cd = Math.max(0, e.cd - dt);
    if (e.kind === 'thrower') return thrower(f, e, dt, player, way);
    if (e.kind === 'charger') return charger(f, e, i, dt, player, way, events);
    const d = dist(e, player);
    if (e.windup > 0) {
      e.windup -= dt;
      if (e.windup <= 0) {
        e.cd = ENEMY_COOLDOWN;
        if (d <= ENEMY_REACH + 0.4 && f.invuln <= 0) { f.hp -= 1; events.push('hurt'); }
      }
    } else if (d > ENEMY_REACH) {
      chase(e, player, Math.min(ENEMY_SPEED * dt, d - ENEMY_REACH), way);
    } else if (e.cd <= 0) {
      e.windup = ENEMY_WINDUP;
      events.push(`windup:${i}`);
    }
  });
  if (f.hp <= 0) { f.result = 'lost'; events.push('lost'); }
  return events;
}

// 이동: 막힌 칸으로는 들어가지 않는다(움직였으면 true)
const STEPS4 = [[0, -1], [0, 1], [-1, 0], [1, 0]];
const STEP_LIMIT = 30;   // 칸 길은 아코스에게서 이만큼까지만 센다
function moveTo(e, t, s, blocked) {
  const d = dist(e, t);
  if (d < 1e-9) return false;
  const k = Math.min(s, d) / d, nx = e.x + (t.x - e.x) * k, nz = e.z + (t.z - e.z) * k;
  if (blocked(Math.round(nx), Math.round(nz))) return false;
  e.x = nx;
  e.z = nz;
  return true;
}
// a에서 b까지 곧게 가는 길에 막힌 칸이 없나(0.25칸마다 본다)
function clear(a, b, blocked) {
  const n = Math.ceil(dist(a, b) / 0.25);
  for (let k = 1; k < n; k++) {
    if (blocked(Math.round(a.x + ((b.x - a.x) * k) / n), Math.round(a.z + ((b.z - a.z) * k) / n))) return false;
  }
  return true;
}
// 아코스가 선 칸에서 4방향으로 센 걸음 수(막힌 칸은 빼고, STEP_LIMIT까지): Map('x,z' → 걸음)
function stepsTo(player, blocked) {
  const x0 = Math.round(player.x), z0 = Math.round(player.z), steps = new Map([[`${x0},${z0}`, 0]]), q = [[x0, z0]];
  for (let i = 0; i < q.length; i++) {
    const [x, z] = q[i], n = steps.get(`${x},${z}`);
    if (n >= STEP_LIMIT) continue;
    for (const [dx, dz] of STEPS4) {
      const k = `${x + dx},${z + dz}`;
      if (!steps.has(k) && !blocked(x + dx, z + dz)) { steps.set(k, n + 1); q.push([x + dx, z + dz]); }
    }
  }
  return steps;
}
// 아코스에게 s만큼 다가간다: 곧게 갈 수 있으면 곧게, 아니면 걸음 수가 하나 적은 이웃 칸 가운데로.
// (지금 칸 안의 점에서 이웃 칸 가운데로 가는 선은 두 칸 안에만 있어서 모서리를 파고들지 않는다)
function chase(e, player, s, way) {
  if (clear(e, player, way.blocked)) return moveTo(e, player, s, way.blocked);
  const x = Math.round(e.x), z = Math.round(e.z), steps = way.steps(), here = steps.get(`${x},${z}`);
  const next = here === undefined ? null : STEPS4.map(([dx, dz]) => ({ x: x + dx, z: z + dz }))
    .find(c => steps.get(`${c.x},${c.z}`) === here - 1);
  return moveTo(e, next ?? player, s, way.blocked);
}

// 투척꾼: 3칸 안이면 물러나고(뒤가 막혔으면 그대로) 6칸 밖이면 돌아서라도 다가온다. 3~7칸이면 오물을 던진다.
function thrower(f, e, dt, player, way) {
  const d = dist(e, player);
  if (d < 1e-6) return;
  const ux = (player.x - e.x) / d, uz = (player.z - e.z) / d, s = ENEMY_SPEED * dt;
  if (d < THROWER_NEAR) moveTo(e, { x: e.x - ux, z: e.z - uz }, s, way.blocked);
  else if (d > THROWER_FAR) chase(e, player, s, way);
  if (e.cd <= 0 && d >= THROWER_NEAR && d <= THROW_MAX) {
    e.cd = THROW_EVERY;
    f.shots.push({ x: e.x, z: e.z, dx: ux, dz: uz, left: SHOT_RANGE });
  }
}

// 오물: 맞으면 1피해 후 사라진다. 피하는 중(무적)이면 지나간다. 막힌 칸이나 사거리 끝에서 사라진다.
function moveShots(f, dt, player, blocked, events) {
  f.shots = f.shots.filter(s => {
    const step = SHOT_SPEED * dt;
    s.x += s.dx * step;
    s.z += s.dz * step;
    s.left -= step;
    if (dist(s, player) < SHOT_HIT && f.invuln <= 0) { f.hp -= 1; events.push('hurt'); return false; }
    return s.left > 0 && !blocked(Math.round(s.x), Math.round(s.z));
  });
}

// 돌진꾼: 같은 줄(6칸 안)이면 준비 뒤 그 방향으로 6칸 돌진(닿으면 1피해, 한 번), 막힌 칸에 부딪히면 기절.
// 줄이 안 맞으면 차이가 작은 축을 줄이고, 줄은 맞는데 멀면 긴 축으로 다가간다.
function charger(f, e, i, dt, player, way, events) {
  const { blocked } = way;
  if (e.stun > 0) { e.stun -= dt; return; }
  if (e.dash) {
    // 반 칸씩 나눠 움직인다(프레임이 길어도 벽을 뚫지 않게)
    for (let move = Math.min(CHARGE_SPEED * dt, e.dash.left); move > 1e-9;) {
      const step = Math.min(0.5, move), nx = e.x + e.dash.dx * step, nz = e.z + e.dash.dz * step;
      if (blocked(Math.round(nx), Math.round(nz))) {
        e.dash = null;
        e.stun = STUN_TIME;
        events.push(`stun:${i}`);
        return;
      }
      e.x = nx;
      e.z = nz;
      e.dash.left -= step;
      move -= step;
      if (!e.dash.hit && dist(e, player) < CHARGE_HIT && f.invuln <= 0) { e.dash.hit = true; f.hp -= 1; events.push('hurt'); }
    }
    if (e.dash.left <= 1e-9) { e.dash = null; e.cd = ENEMY_COOLDOWN; }
    return;
  }
  if (e.windup > 0) {
    e.windup -= dt;
    if (e.windup <= 1e-9) { e.windup = 0; e.dash = { ...e.aim, left: CHARGE_RANGE, hit: false }; }
    return;
  }
  const dx = player.x - e.x, dz = player.z - e.z, ax = Math.abs(dx), az = Math.abs(dz);
  // 같은 줄이고 1칸 넘게 떨어져 있어야 돌진한다(붙어 있으면 방향이 없다)
  const inRow = az < 0.5 && ax >= 1 && ax <= CHARGE_RANGE, inCol = ax < 0.5 && az >= 1 && az <= CHARGE_RANGE;
  if ((inRow || inCol) && e.cd <= 0) {
    e.windup = CHARGE_WINDUP;
    e.aim = inRow ? { dx: Math.sign(dx), dz: 0 } : { dx: 0, dz: Math.sign(dz) };
    events.push(`windup:${i}`);
    return;
  }
  // 줄이 안 맞으면 차이가 작은 축을 줄인다. 그쪽이 막혔거나 줄이 맞았으면 돌아서라도 다가간다.
  const s = ENEMY_SPEED * dt;
  if (Math.min(ax, az) >= 0.5 && moveTo(e, ax < az ? { x: player.x, z: e.z } : { x: e.x, z: player.z }, s, blocked)) return;
  chase(e, player, s, way);
}

export function swing(f, player) {
  if (f.result || f.swingCd > 0) return [];
  f.swingCd = SWING_COOLDOWN;
  const events = ['swing'];
  f.enemies.forEach((e, i) => {
    if (e.hp <= 0 || !inArc(player, player.facing, e, SWING_RANGE, SWING_HALF)) return;
    e.hp -= 1;
    events.push(e.hp > 0 ? `hit:${i}` : `down:${i}`);
  });
  f.gauge = Math.min(HOLY_GAUGE, f.gauge + events.filter(e => /^(hit|down):/.test(e)).length);   // 맞힌 적마다 한 칸
  if (f.enemies.every(e => e.hp <= 0)) { f.result = 'won'; events.push('won'); }
  return events;
}

// 성휘참: 바라보는 쪽 앞 4칸·폭 3칸 안의 적 모두에게 큰 피해. 게이지가 가득해야 나가고, 쓰면 빈다.
export function holySlash(f, player) {
  if (f.result || f.gauge < HOLY_GAUGE) return [];
  f.gauge = 0;
  f.swingCd = SWING_COOLDOWN;
  const events = ['holy'];
  const fx = Math.sin(player.facing), fz = Math.cos(player.facing);
  f.enemies.forEach((e, i) => {
    if (e.hp <= 0) return;
    const dx = e.x - player.x, dz = e.z - player.z;
    const ahead = dx * fx + dz * fz, side = Math.abs(dx * fz - dz * fx);
    if (ahead < 0 || ahead > HOLY_RANGE || side > HOLY_HALF) return;
    e.hp -= HOLY_DAMAGE;
    events.push(e.hp > 0 ? `hit:${i}` : `down:${i}`);
  });
  if (f.enemies.every(e => e.hp <= 0)) { f.result = 'won'; events.push('won'); }
  return events;
}

export function dodge(f) {
  if (f.result || f.invuln > 0) return false;
  f.invuln = DODGE_TIME;
  return true;
}
