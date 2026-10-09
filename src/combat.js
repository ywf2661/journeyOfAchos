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

export function createFight(def) {
  return {
    def,
    hp: PLAYER_MAX_HP,
    enemies: def.enemies.map(([x, z]) => ({ x, z, hp: def.enemyHp ?? ENEMY_HP, cd: 0, windup: 0 })),
    time: 0,
    swingCd: 0,
    invuln: 0,
    gauge: 0,     // 성휘 게이지(전투마다 0부터)
    result: null,
  };
}

// ponytail: 적끼리는 겹쳐도 밀어내지 않는다. 한 번에 3마리라 티가 덜 난다. 거슬리면 resolve로 서로 밀어낸다.
export function update(f, dt, player) {
  const events = [];
  if (f.result) return events;
  f.time += dt;
  f.swingCd = Math.max(0, f.swingCd - dt);
  f.invuln = Math.max(0, f.invuln - dt);
  if (f.def.frozen) {
    if (f.time >= f.def.timeLimit) { f.result = 'lost'; events.push('lost'); }
    return events;
  }
  f.enemies.forEach((e, i) => {
    if (e.hp <= 0) return;
    e.cd = Math.max(0, e.cd - dt);
    const d = dist(e, player);
    if (e.windup > 0) {
      e.windup -= dt;
      if (e.windup <= 0) {
        e.cd = ENEMY_COOLDOWN;
        if (d <= ENEMY_REACH + 0.4 && f.invuln <= 0) { f.hp -= 1; events.push('hurt'); }
      }
    } else if (d > ENEMY_REACH) {
      const step = Math.min(ENEMY_SPEED * dt, d - ENEMY_REACH);
      e.x += ((player.x - e.x) / d) * step;
      e.z += ((player.z - e.z) / d) * step;
    } else if (e.cd <= 0) {
      e.windup = ENEMY_WINDUP;
      events.push(`windup:${i}`);
    }
  });
  if (f.hp <= 0) { f.result = 'lost'; events.push('lost'); }
  return events;
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
