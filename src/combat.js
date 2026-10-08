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

export function createFight(def) {
  return {
    def,
    hp: PLAYER_MAX_HP,
    enemies: def.enemies.map(([x, z]) => ({ x, z, hp: def.enemyHp ?? ENEMY_HP, cd: 0, windup: 0 })),
    time: 0,
    swingCd: 0,
    invuln: 0,
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
  if (f.enemies.every(e => e.hp <= 0)) { f.result = 'won'; events.push('won'); }
  return events;
}

export function dodge(f) {
  if (f.result || f.invuln > 0) return false;
  f.invuln = DODGE_TIME;
  return true;
}
