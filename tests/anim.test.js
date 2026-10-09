import { test } from 'node:test';
import assert from 'node:assert/strict';
import { frameOf, SLASH_TIME } from '../src/anim.js';

// 프레임 번호는 data/sprites.js의 아코스와 같은 꼴
const S = {
  idle: { down: 0, side: 1, up: 2 },
  walk: { down: [3, 4, 5], side: [6, 7, 8], up: [9, 10, 11] },
  slash: { down: [12, 13], side: [14, 15], up: [16, 17] },
};

test('서 있으면 방향별 서 있기 프레임이고, 왼쪽은 오른쪽 옆모습을 뒤집는다', () => {
  assert.deepEqual(frameOf(S, { dir: 'down' }), { index: 0, flip: false });
  assert.deepEqual(frameOf(S, { dir: 'up' }), { index: 2, flip: false });
  assert.deepEqual(frameOf(S, { dir: 'right' }), { index: 1, flip: false });
  assert.deepEqual(frameOf(S, { dir: 'left' }), { index: 1, flip: true });
});

test('걸으면 초당 8번 왼발·가운데·오른발·가운데를 돈다', () => {
  const at = t => frameOf(S, { dir: 'down', moving: true, t }).index;
  assert.deepEqual([0, 0.125, 0.25, 0.375, 0.5].map(at), [3, 4, 5, 4, 3]);
  assert.deepEqual(frameOf(S, { dir: 'left', moving: true, t: 0.25 }), { index: 8, flip: true });
});

test('베는 동안(남은 시간) 앞 절반은 들어 올리기, 뒤 절반은 휘두르기이고 걷기보다 먼저다', () => {
  assert.equal(frameOf(S, { dir: 'up', slash: SLASH_TIME }).index, 16);
  assert.equal(frameOf(S, { dir: 'up', slash: SLASH_TIME * 0.3 }).index, 17);
  assert.equal(frameOf(S, { dir: 'right', slash: 0.01, moving: true, t: 0.25 }).index, 15);
  assert.equal(frameOf(S, { dir: 'down', slash: 0 }).index, 0);
});

test('걷기·베기 프레임이 없는 인물(아이온)은 언제나 서 있기 프레임', () => {
  const A = { idle: { down: 0, side: 1, up: 2 } };
  assert.deepEqual(frameOf(A, { dir: 'up', moving: true, t: 0.3, slash: 0.1 }), { index: 2, flip: false });
});
