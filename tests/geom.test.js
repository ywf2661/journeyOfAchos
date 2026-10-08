import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dist, inArc } from '../src/geom.js';

test('dist: 평면 거리', () => {
  assert.equal(dist({ x: 0, z: 0 }, { x: 3, z: 4 }), 5);
});

test('inArc: 앞쪽 사거리 안만 맞는다', () => {
  const o = { x: 0, z: 0 };
  assert.equal(inArc(o, 0, { x: 0, z: 2 }, 2.4, Math.PI / 3), true);
  assert.equal(inArc(o, 0, { x: 0, z: -2 }, 2.4, Math.PI / 3), false);
  assert.equal(inArc(o, 0, { x: 0, z: 3 }, 2.4, Math.PI / 3), false);
  assert.equal(inArc(o, 0, { x: 2, z: 0.1 }, 2.4, Math.PI / 3), false);
  assert.equal(inArc(o, 0, o, 2.4, Math.PI / 3), true);
});

test('inArc: 위(북쪽, θ = π)를 보면 z가 작은 쪽을 벤다', () => {
  assert.equal(inArc({ x: 0, z: 0 }, Math.PI, { x: 0, z: -1 }, 2.4, Math.PI / 3), true);
  assert.equal(inArc({ x: 0, z: 0 }, Math.PI, { x: 0, z: 1 }, 2.4, Math.PI / 3), false);
});
