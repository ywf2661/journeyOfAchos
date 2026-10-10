import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMap } from '../src/map.js';
import { TILES, STAMPS } from '../data/tiles.js';

const O = { minX: 0, minZ: 0 };
const town = i => ['town', i];
const at = (m, x, z) => m.cells[z * m.w + x];

test('흙길은 이웃 풀밭 쪽에 가장자리·모서리 조각을 쓴다(맵 밖은 길이 이어진다고 본다)', () => {
  const m = parseMap([
    '.....',
    '.===.',
    '.===.',
    '.===.',
    '.....',
  ], O, TILES, STAMPS);
  assert.deepEqual([1, 2, 3].map(x => at(m, x, 1).ground), [town(12), town(13), town(14)]);
  assert.deepEqual([1, 2, 3].map(x => at(m, x, 2).ground), [town(24), town(25), town(26)]);
  assert.deepEqual([1, 2, 3].map(x => at(m, x, 3).ground), [town(36), town(37), town(38)]);
  const edge = parseMap(['===', '==='], O, TILES, STAMPS);
  assert.ok(edge.cells.every(c => c.ground[1] === 25), '맵 끝에는 가장자리를 두지 않는다');
});

test('흙길이 꺾이는 안쪽은 안쪽 모서리 조각을 쓴다', () => {
  const m = parseMap([
    '===',
    '===',
    '==.',
  ], O, TILES, STAMPS);
  assert.deepEqual(at(m, 1, 1).ground, town(42), '오른쪽 아래 대각선만 풀밭');
  assert.deepEqual(at(m, 2, 1).ground, town(37), '아래가 풀밭');
});

test('숲(T가 모인 곳)은 덩어리 조각으로, 한 줄짜리 나무는 한 그루 그림 그대로', () => {
  const m = parseMap([
    '.....',
    '.TTT.',
    '.TTT.',
    '.TTT.',
    '..T..',
  ], O, TILES, STAMPS);
  assert.deepEqual([1, 2, 3].map(x => at(m, x, 1).top), [town(6), town(7), town(8)]);
  assert.deepEqual(at(m, 2, 2).top, town(19));
  assert.deepEqual(at(m, 1, 3).top, town(30));
  assert.deepEqual(at(m, 2, 4).top, town(28), '한 줄(좌우가 비었다)');
  assert.ok([1, 2, 3].every(x => at(m, x, 2).solid));
  const edge = parseMap(['....', 'TTTT'], O, TILES, STAMPS);
  assert.ok(edge.cells.slice(4).every(c => c.top[1] === 28), '맵 끝 한 줄 나무는 온전한 한 그루(맵 밖은 빈 땅으로 본다 — 윗부분만 잘려 보이지 않게)');
});

test('잔디에는 칸마다 정해진 풀 포기·꽃이 드문드문 섞이고, 같은 맵은 언제나 같은 그림이다', () => {
  const lines = Array.from({ length: 20 }, () => '.'.repeat(20));
  const a = parseMap(lines, O, TILES, STAMPS), b = parseMap(lines, O, TILES, STAMPS);
  assert.deepEqual(a.cells, b.cells);
  const kinds = a.cells.map(c => c.ground[1]);
  const plain = kinds.filter(k => k === 0).length;
  assert.ok(plain > 300 && plain < 400, `민 잔디 ${plain}/400`);
  assert.ok(kinds.every(k => [0, 1, 2].includes(k)));
  assert.ok(parseMap([',,,', '***'], O, TILES, STAMPS).cells.every((c, i) => c.ground[1] === (i < 3 ? 1 : 2)), '직접 적은 기호는 그대로');
});

test('키 큰 것(나무·건물·울타리) 바로 아래 지나갈 수 있는 칸에는 그림자가 진다', () => {
  const m = parseMap(['T.', '..'], O, TILES, STAMPS);
  assert.equal(at(m, 0, 1).shade, true);
  assert.ok(!at(m, 1, 1).shade && !at(m, 1, 0).shade && !at(m, 0, 0).shade);
});
