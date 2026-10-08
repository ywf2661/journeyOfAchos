import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMap, cellAt, isSolid } from '../src/map.js';

const TILES = {
  '.': { ground: ['town', 0] },
  T: { ground: ['town', 0], top: ['town', 4], solid: true },
  l: { ground: ['town', 25], top: ['dungeon', 29], solid: true, light: true },
  F: { ground: ['town', 25], solid: true, light: true, fire: true },
};
const STAMPS = { H: { ground: ['town', 25], rows: [[['town', 48], ['town', 49]], [['town', 60], ['town', 61]]] } };
const ORIGIN = { minX: -2, minZ: 10 };

test('기호마다 바닥·위 그림·막힘을 정하고, 맵 왼쪽 위가 (minX, minZ)다', () => {
  const m = parseMap(['.T', 'l.'], ORIGIN, TILES, STAMPS);
  assert.equal(m.w, 2);
  assert.equal(m.h, 2);
  assert.deepEqual(cellAt(m, -2, 10), { ground: ['town', 0], top: null, solid: false });
  assert.deepEqual(cellAt(m, -1, 10), { ground: ['town', 0], top: ['town', 4], solid: true });
  assert.equal(isSolid(m, -2, 11), true);
  assert.equal(isSolid(m, -1, 11), false);
});

test('맵 밖은 막힌 칸이고 cellAt은 null', () => {
  const m = parseMap(['..'], ORIGIN, TILES, STAMPS);
  assert.equal(cellAt(m, -3, 10), null);
  assert.equal(isSolid(m, -3, 10), true);
  assert.equal(isSolid(m, 0, 10), true);
  assert.equal(isSolid(m, -2, 11), true);
});

test('도장은 왼쪽 위 글자부터 여러 칸을 덮고 모두 막힌다', () => {
  const m = parseMap(['H..', '...'], ORIGIN, TILES, STAMPS);
  assert.deepEqual(cellAt(m, -1, 11), { ground: ['town', 25], top: ['town', 61], solid: true });
  assert.equal(isSolid(m, -2, 10), true);
  assert.equal(isSolid(m, 0, 10), false);
});

test('불빛 칸을 모은다', () => {
  const m = parseMap(['l.F'], ORIGIN, TILES, STAMPS);
  assert.deepEqual(m.lights, [{ x: -2, z: 10, fire: false }, { x: 0, z: 10, fire: true }]);
});

test('모르는 기호, 줄 길이가 다름, 맵 밖으로 나가는 도장은 오류', () => {
  assert.throws(() => parseMap(['.?'], ORIGIN, TILES, STAMPS), /모르는 기호 '\?'/);
  assert.throws(() => parseMap(['..', '.'], ORIGIN, TILES, STAMPS), /줄 길이/);
  assert.throws(() => parseMap(['.H'], ORIGIN, TILES, STAMPS), /도장/);
});
