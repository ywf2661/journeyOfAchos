import { test } from 'node:test';
import assert from 'node:assert/strict';
import { moveVector, facingOf, dist, resolve, inArc, circlesAlong } from '../src/geom.js';

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≈ ${b}`);

test('카메라가 +z 뒤에 있을 때(yaw 0) 앞(f=1)은 -z, 오른쪽(r=1)은 +x', () => {
  const w = moveVector({ f: 1, r: 0 }, 0);
  near(w.x, 0); near(w.z, -1);
  const d = moveVector({ f: 0, r: 1 }, 0);
  near(d.x, 1); near(d.z, 0);
});

test('기울기가 얼마든 방향은 길이 1이고, 데드존 안이면 null', () => {
  const v = moveVector({ f: 1, r: 1 }, 0);
  near(Math.hypot(v.x, v.z), 1);
  const half = moveVector({ f: 0.3, r: 0 }, 0);
  near(half.x, 0); near(half.z, -1);
  assert.equal(moveVector({ f: 0, r: 0 }, 0), null);
  assert.equal(moveVector({ f: 0.1, r: 0.05 }, 0), null);
});

test('카메라를 돌리면 이동 방향도 돈다', () => {
  const v = moveVector({ f: 1, r: 0 }, Math.PI / 2);
  near(v.x, -1); near(v.z, 0);
});

test('facingOf: +z는 0, +x는 π/2', () => {
  near(facingOf({ x: 0, z: 1 }), 0);
  near(facingOf({ x: 1, z: 0 }), Math.PI / 2);
});

test('resolve: 장애물 안으로 들어가면 바깥으로 밀어낸다', () => {
  const p = resolve({ x: 0.5, z: 0 }, 0.5, [{ x: 0, z: 0, r: 1 }], { minX: -9, maxX: 9, minZ: -9, maxZ: 9 });
  near(dist(p, { x: 0, z: 0 }), 1.5);
});

test('resolve: 장애물 정중앙이면 +x로 밀어내고, 경계 밖은 잘라 낸다', () => {
  const b = { minX: -5, maxX: 5, minZ: -5, maxZ: 5 };
  assert.deepEqual(resolve({ x: 0, z: 0 }, 0.5, [{ x: 0, z: 0, r: 1 }], b), { x: 1.5, z: 0 });
  assert.deepEqual(resolve({ x: 9, z: -9 }, 0.5, [], b), { x: 5, z: -5 });
});

test('inArc: 앞쪽 사거리 안만 맞는다', () => {
  const o = { x: 0, z: 0 };
  assert.equal(inArc(o, 0, { x: 0, z: 2 }, 2.4, Math.PI / 3), true);
  assert.equal(inArc(o, 0, { x: 0, z: -2 }, 2.4, Math.PI / 3), false);
  assert.equal(inArc(o, 0, { x: 0, z: 3 }, 2.4, Math.PI / 3), false);
  assert.equal(inArc(o, 0, { x: 2, z: 0.1 }, 2.4, Math.PI / 3), false);
  assert.equal(inArc(o, 0, o, 2.4, Math.PI / 3), true);
});

test('circlesAlong: 양 끝을 포함하고 간격이 r 이하다', () => {
  const cs = circlesAlong(0, 0, 10, 0, 1.5);
  assert.deepEqual(cs[0], { x: 0, z: 0, r: 1.5 });
  assert.deepEqual(cs.at(-1), { x: 10, z: 0, r: 1.5 });
  for (let i = 1; i < cs.length; i++) assert.ok(dist(cs[i], cs[i - 1]) <= 1.5 + 1e-9);
});
