import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWalker, step, dash, front, WALK, RUN, TURN } from '../src/player.js';

const open = () => false;
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≈ ${b}`);

test('방향키를 누르고 있으면 한 칸에 1/WALK초씩 이어 걷는다', () => {
  const w = createWalker(0, 0, 'up');
  step(w, { dir: 'up' }, 1 / WALK, open);
  assert.deepEqual([w.x, w.z, w.moving], [0, -1, true]);
  step(w, { dir: 'up' }, 1 / WALK, open);
  assert.deepEqual([w.x, w.z], [0, -2]);
});

test('칸 중간에서 손을 떼도 다음 칸까지는 가서 선다', () => {
  const w = createWalker(0, 0, 'up');
  step(w, { dir: 'up' }, 0.1, open);
  near(w.z, -0.4);
  step(w, { dir: null }, 0.5, open);
  assert.deepEqual([w.x, w.z, w.moving], [0, -1, false]);
});

test('선 자리에서 다른 방향을 짧게 누르면 돌아서기만 한다', () => {
  const w = createWalker(0, 0, 'up');
  step(w, { dir: 'left' }, TURN / 2, open);
  step(w, { dir: null }, 0.5, open);
  assert.deepEqual([w.x, w.z, w.dir], [0, 0, 'left']);
  near(w.facing, -Math.PI / 2);
});

test('다른 방향을 길게 누르면 돌아선 뒤 걷는다', () => {
  const w = createWalker(0, 0, 'up');
  step(w, { dir: 'right' }, TURN + 1 / WALK, open);
  assert.deepEqual([w.x, w.z], [1, 0]);
});

test('걷던 중에 방향을 바꾸면 기다리지 않고 꺾는다', () => {
  const w = createWalker(0, 0, 'up');
  step(w, { dir: 'up' }, 1 / WALK, open);
  step(w, { dir: 'right' }, 1 / WALK, open);
  assert.deepEqual([w.x, w.z], [1, -1]);
});

test('막힌 칸으로는 못 가고 방향만 바뀐다', () => {
  const w = createWalker(0, 0, 'up');
  step(w, { dir: 'down' }, 1, (x, z) => x === 0 && z === 1);
  assert.deepEqual([w.x, w.z, w.dir, w.moving], [0, 0, 'down', false]);
});

test('X를 누르고 있으면 RUN 속도로 달린다', () => {
  const w = createWalker(0, 0, 'up');
  step(w, { dir: 'up', run: true }, 1 / WALK, open);
  assert.deepEqual([w.x, w.z], [0, -RUN / WALK]);
});

test('피하기는 한 칸을 빠르게 가고, 바라보는 방향은 그대로다', () => {
  const w = createWalker(0, 0, 'up');
  assert.equal(dash(w, 'down', open), true);
  step(w, {}, 0.1, open);
  assert.deepEqual([w.x, w.z, w.dir], [0, 1, 'up']);
  assert.equal(dash(w, 'down', () => true), false);
});

test('걷는 중에 피하면 지금 칸을 마저 끝내고 바로 한 칸 더 간다', () => {
  const w = createWalker(0, 0, 'up');
  step(w, { dir: 'up' }, 0.1, open);
  assert.equal(dash(w, 'left', open), true);
  step(w, {}, 0.1, open);
  assert.deepEqual([w.x, w.z], [-1, -1]);
});

test('front는 바라보는 앞 칸', () => {
  assert.deepEqual(front(createWalker(3, 4, 'left')), { x: 2, z: 4 });
  assert.deepEqual(front(createWalker(3, 4, 'down')), { x: 3, z: 5 });
});

test('성휘참을 모으는 동안(slow)은 걷는 속도가 절반이다', () => {
  const w = createWalker(0, 0, 'up');
  step(w, { dir: 'up', slow: true }, 1 / WALK, open);
  near(w.z, -0.5);
});
