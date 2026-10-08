import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFight, update, swing, dodge, PLAYER_MAX_HP, ENEMY_HP, ENEMY_REACH, ENEMY_SPEED } from '../src/combat.js';

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
  assert.deepEqual(f.enemies[0], { x: 0, z: 1, hp: 1, cd: 0, windup: 0 });
  assert.deepEqual(update(f, 1, P), ['lost']);
});
