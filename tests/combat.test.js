import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFight, update, swing, dodge, holySlash, PLAYER_MAX_HP, ENEMY_HP, ENEMY_REACH, ENEMY_SPEED, SWING_COOLDOWN, HOLY_GAUGE,
  THROWER_HP, CHARGER_HP, THROW_EVERY, CHARGE_WINDUP, STUN_TIME } from '../src/combat.js';

const P = { x: 0, z: 0, facing: 0 };   // +z를 바라본다

test('전투를 만들면 아코스 체력 5, 적 체력은 기본값 또는 지정값', () => {
  const f = createFight({ enemies: [[0, 5], [1, 5]] });
  assert.equal(f.hp, PLAYER_MAX_HP);
  assert.deepEqual(f.enemies.map(e => e.hp), [ENEMY_HP, ENEMY_HP]);
  assert.equal(createFight({ enemies: [[0, 5]], enemyHp: 1 }).enemies[0].hp, 1);
});

test('적은 아코스 쪽으로 다가오다 공격 거리에서 멈춘다', () => {
  const f = createFight({ enemies: [[0, 10]] });
  update(f, 1, P);
  assert.ok(Math.abs(f.enemies[0].z - (10 - ENEMY_SPEED)) < 1e-9);
  for (let i = 0; i < 100; i++) update(f, 0.05, P);
  assert.ok(f.enemies[0].z >= ENEMY_REACH - 1e-9);
});

test('공격 거리 안이면 준비 동작 뒤에 맞는다', () => {
  const f = createFight({ enemies: [[0, 1]] });
  assert.deepEqual(update(f, 0.01, P), ['windup:0']);
  assert.deepEqual(update(f, 0.5, P), ['hurt']);
  assert.equal(f.hp, PLAYER_MAX_HP - 1);
});

test('준비 동작 끝 무렵에 피하면 맞지 않는다', () => {
  const f = createFight({ enemies: [[0, 1]] });
  update(f, 0.01, P);
  update(f, 0.2, P);
  assert.equal(dodge(f), true);
  assert.equal(dodge(f), false);
  assert.deepEqual(update(f, 0.3, P), []);
  assert.equal(f.hp, PLAYER_MAX_HP);
});

test('베기는 앞쪽 적만 맞히고, 쿨다운 동안은 나가지 않는다', () => {
  const f = createFight({ enemies: [[0, 2], [0, -2]] });
  assert.deepEqual(swing(f, P), ['swing', 'hit:0']);
  assert.deepEqual(f.enemies.map(e => e.hp), [ENEMY_HP - 1, ENEMY_HP]);
  assert.deepEqual(swing(f, P), []);
  update(f, 0.5, P);
  assert.deepEqual(swing(f, P), ['swing', 'hit:0']);
});

test('모두 쓰러뜨리면 이긴다', () => {
  const f = createFight({ enemies: [[0, 2]], enemyHp: 1 });
  assert.deepEqual(swing(f, P), ['swing', 'down:0', 'won']);
  assert.equal(f.result, 'won');
  assert.deepEqual(swing(f, P), []);
});

test('체력이 다 떨어지면 진다', () => {
  const f = createFight({ enemies: [[0, 1]] });
  f.hp = 1;
  update(f, 0.01, P);
  assert.deepEqual(update(f, 0.5, P), ['hurt', 'lost']);
  assert.equal(f.result, 'lost');
});

test('멈춘 시간: 적은 움직이지 않고, 제한 시간이 지나면 진다', () => {
  const f = createFight({ enemies: [[0, 1]], frozen: true, enemyHp: 1, timeLimit: 2 });
  assert.deepEqual(update(f, 1, P), []);
  const e = f.enemies[0];
  assert.deepEqual([e.x, e.z, e.hp, e.windup], [0, 1, 1, 0]);
  assert.deepEqual(update(f, 1, P), ['lost']);
});

// ───────── 성휘참 ─────────
const cool = f => { f.swingCd = 0; };   // 베기 쿨다운을 건너뛴다

test('베기가 적을 맞히면 성휘 게이지가 한 칸 차고, 가득(HOLY_GAUGE)에서 멈춘다', () => {
  const f = createFight({ enemies: [[0, 1.5]], enemyHp: 99 });
  assert.equal(f.gauge, 0);
  swing(f, P);
  assert.equal(f.gauge, 1);
  for (let i = 0; i < HOLY_GAUGE + 2; i++) { cool(f); swing(f, P); }
  assert.equal(f.gauge, HOLY_GAUGE);
});

test('한 번에 여러 적을 맞히면 맞힌 적마다 한 칸씩 찬다', () => {
  const f = createFight({ enemies: [[-0.5, 1.5], [0.5, 1.5]], enemyHp: 99 });
  swing(f, P);
  assert.equal(f.gauge, 2);
});

test('아무도 못 맞힌 베기는 게이지를 채우지 않는다', () => {
  const f = createFight({ enemies: [[0, -2]] });
  swing(f, P);
  assert.equal(f.gauge, 0);
});

test('성휘참은 게이지가 가득해야 나가고, 쓰면 게이지가 빈다', () => {
  const f = createFight({ enemies: [[0, 2]], enemyHp: 99 });
  assert.deepEqual(holySlash(f, P), []);
  f.gauge = HOLY_GAUGE;
  assert.deepEqual(holySlash(f, P), ['holy', 'hit:0']);
  assert.equal(f.gauge, 0);
  assert.equal(f.enemies[0].hp, 97);
  assert.equal(f.swingCd, SWING_COOLDOWN);
});

test('성휘참은 바라보는 쪽 앞 4칸·폭 3칸 안의 적 모두에게 2피해를 준다', () => {
  // +z를 바라본다: 앞 1·4칸, 옆으로 1칸 비낀 3칸은 맞고, 앞 5칸·옆 2칸·뒤는 맞지 않는다
  const f = createFight({ enemies: [[0, 1], [0, 4], [1, 3], [0, 5.5], [2, 2], [0, -1]], enemyHp: 5 });
  f.gauge = HOLY_GAUGE;
  assert.deepEqual(holySlash(f, P), ['holy', 'hit:0', 'hit:1', 'hit:2']);
  assert.deepEqual(f.enemies.map(e => e.hp), [3, 3, 3, 5, 5, 5]);
});

test('성휘참으로 남은 적을 모두 쓰러뜨리면 이긴다', () => {
  const f = createFight({ enemies: [[-1, 2], [1, 3]] });
  f.gauge = HOLY_GAUGE;
  f.enemies.forEach(e => { e.hp = 2; });
  assert.deepEqual(holySlash(f, P), ['holy', 'down:0', 'down:1', 'won']);
  assert.equal(f.result, 'won');
});

test('위(북쪽)를 보면 z가 작은 쪽으로 나간다', () => {
  const f = createFight({ enemies: [[0, -3], [0, 3]], enemyHp: 5 });
  f.gauge = HOLY_GAUGE;
  assert.deepEqual(holySlash(f, { x: 0, z: 0, facing: Math.PI }), ['holy', 'hit:0']);
});

test('종류별 체력(걸음꾼 3·투척꾼 2·돌진꾼 4), 시작 체력을 줄 수 있다', () => {
  const f = createFight({ enemies: [[0, 5], [1, 5, 'thrower'], [2, 5, 'charger']] }, 2);
  assert.deepEqual(f.enemies.map(e => [e.kind, e.hp]), [['walker', ENEMY_HP], ['thrower', THROWER_HP], ['charger', CHARGER_HP]]);
  assert.equal(f.hp, 2);
});

test('투척꾼: 가까우면 물러나고(막힌 칸으로는 못 감), 거리를 두고 오물을 던진다', () => {
  const f = createFight({ enemies: [[0, 2, 'thrower']] });
  update(f, 0.1, P);
  assert.ok(f.enemies[0].z > 2, '물러난다');
  const g = createFight({ enemies: [[0, 2, 'thrower']] });
  update(g, 0.1, P, (x, z) => z >= 2);
  assert.equal(g.enemies[0].z, 2, '뒤가 막혀 있으면 그대로');
  const h = createFight({ enemies: [[0, 5, 'thrower']] });
  update(h, THROW_EVERY, P);
  assert.equal(h.shots.length, 1);
  assert.equal(h.enemies[0].z, 5, '알맞은 거리에서는 서 있다');
});

test('오물: 날아와 맞으면 1피해, 피하는 중이면 지나가고, 막힌 칸이나 사거리 끝에서 사라진다', () => {
  const f = createFight({ enemies: [[0, 5, 'thrower']] });
  update(f, THROW_EVERY, P);
  let hurt = 0;
  for (let i = 0; i < 20; i++) hurt += update(f, 0.05, P).filter(e => e === 'hurt').length;
  assert.equal(hurt, 1);
  assert.equal(f.hp, PLAYER_MAX_HP - 1);
  const g = createFight({ enemies: [[0, 5, 'thrower']] });
  update(g, THROW_EVERY, P);
  for (let i = 0; i < 14; i++) update(g, 0.05, P);   // 오물이 코앞(0.8칸)까지 온다
  dodge(g);
  for (let i = 0; i < 10; i++) update(g, 0.05, P);
  assert.equal(g.hp, PLAYER_MAX_HP, '피하는 중에는 지나간다');
  const w = createFight({ enemies: [[0, 5, 'thrower']] });
  update(w, THROW_EVERY, P, (x, z) => z === 3);
  update(w, 0.3, P, (x, z) => z === 3);
  assert.equal(w.shots.length, 0, '벽에서 사라짐');
});

test('돌진꾼: 같은 줄이면 준비 뒤 돌진해 1피해, 막힌 칸에 부딪히면 기절한다', () => {
  const f = createFight({ enemies: [[0, 4, 'charger']] });
  assert.deepEqual(update(f, 0.01, P), ['windup:0']);
  update(f, CHARGE_WINDUP, P);
  const ev = [];
  for (let i = 0; i < 10; i++) ev.push(...update(f, 0.05, P));
  assert.equal(ev.filter(e => e === 'hurt').length, 1);
  const g = createFight({ enemies: [[0, 4, 'charger']] });
  update(g, 0.01, P, (x, z) => z === 2);
  update(g, CHARGE_WINDUP, P, (x, z) => z === 2);
  const ev2 = [];
  for (let i = 0; i < 5; i++) ev2.push(...update(g, 0.05, P, (x, z) => z === 2));
  assert.ok(ev2.includes('stun:0'));
  const z = g.enemies[0].z;
  update(g, STUN_TIME / 2, P, (x, z2) => z2 === 2);
  assert.equal(g.enemies[0].z, z, '기절 중에는 그대로');
});

test('돌진꾼: 줄이 안 맞으면 줄을 맞추러 움직인다(차이가 작은 축부터)', () => {
  const f = createFight({ enemies: [[3, 1.5, 'charger']] });
  update(f, 0.1, P);
  assert.ok(f.enemies[0].z < 1.5 && f.enemies[0].x === 3);
});
