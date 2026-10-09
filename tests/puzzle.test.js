import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPuzzle, blockedBy, push, stepOn, toggleTime, tick, reset, deviceAt, applySolved, pieces, raftPos, RAFT_STEP } from '../src/puzzle.js';
import { createState } from '../src/story.js';

const open = () => false;
const PLATES = { id: 'p', boulders: [[1, 1], [3, 1]], plates: [[1, 0], [3, 0]], reset: [5, 5], set: 'gate_open', say: 'p_done' };
const PITS = { id: 'q', boulders: [[0, 0], [0, 1], [5, 5]], pits: [[2, 0], [2, 1]] };
const STEPS = { id: 's', steps: [[0, 0], [2, 0], [4, 0]] };
const CYCLE = [-1, 0, 1, 0];   // 좌우 왕복
const RAFTS = { id: 'r', clock: [9, 9], rafts: [
  { path: CYCLE.map(x => [x, 0]), start: 0, goal: [0, 0] },
  { path: CYCLE.map(x => [x, 1]), start: 2, goal: [0, 1] },
] };

test('미는 돌: 너머가 비면 한 칸 밀리고, 막혀 있거나 다른 돌이면 안 밀린다', () => {
  const p = createPuzzle(PLATES);
  assert.deepEqual(push(p, 1, 1, 1, 0, open), ['push']);
  assert.deepEqual(p.boulders[0], { x: 2, z: 1 });
  assert.deepEqual(push(p, 2, 1, 1, 0, open), []);                 // 너머 (3,1)에 다른 돌
  assert.deepEqual(push(p, 2, 1, 0, 1, (x, z) => z === 2), []);    // 너머가 막힌 칸
  assert.deepEqual(push(p, 4, 4, 1, 0, open), []);                 // 돌이 없는 칸
});

test('돌이 발판에 다 올라가면 풀리고, 풀린 뒤에는 밀리지 않는다', () => {
  const p = createPuzzle(PLATES);
  assert.deepEqual(push(p, 1, 1, 0, -1, open), ['push']);
  assert.deepEqual(push(p, 3, 1, 0, -1, open), ['push', 'solved']);
  assert.equal(p.solved, true);
  assert.deepEqual(push(p, 3, 0, 1, 0, open), []);
});

test('돌을 구덩이로 밀면 메워지고 돌은 사라진다. 구덩이가 다 메워지면 풀린다', () => {
  const p = createPuzzle(PITS);
  assert.equal(blockedBy(p, 2, 0), true);
  assert.deepEqual(push(p, 0, 0, 1, 0, open), ['push']);
  assert.deepEqual(push(p, 1, 0, 1, 0, open), ['push', 'fill']);
  assert.equal(blockedBy(p, 2, 0), null);
  assert.equal(p.boulders.length, 2);
  push(p, 0, 1, 1, 0, open);
  assert.deepEqual(push(p, 1, 1, 1, 0, open), ['push', 'fill', 'solved']);
});

test('blockedBy: 돌·안 메운 구덩이·시계 돌·다시 놓기 돌은 막힘, 발판은 바닥(맵이 정한다)', () => {
  const p = createPuzzle(PLATES);
  assert.equal(blockedBy(p, 1, 1), true);
  assert.equal(blockedBy(p, 5, 5), true);
  assert.equal(blockedBy(p, 1, 0), null);
  assert.equal(blockedBy(createPuzzle(RAFTS), 9, 9), true);
});

test('순서 돌: 차례대로 밟으면 켜지고, 건너뛰면 모두 꺼진다. 켜진 돌을 다시 밟아도 그대로', () => {
  const p = createPuzzle(STEPS);
  assert.deepEqual(stepOn(p, 0, 0), ['step']);
  assert.deepEqual(stepOn(p, 0, 0), []);
  assert.deepEqual(stepOn(p, 4, 0), ['wrong']);
  assert.equal(p.next, 0);
  assert.deepEqual(stepOn(p, 9, 9), []);
  stepOn(p, 0, 0);
  stepOn(p, 2, 0);
  assert.deepEqual(stepOn(p, 4, 0), ['step', 'solved']);
  assert.deepEqual(pieces(p).steps.map(s => s.lit), [true, true, true]);
});

test('낙엽은 시간이 흐르는 동안만 RAFT_STEP마다 한 칸 가고, 멈춘 낙엽은 물 위라도 밟는다', () => {
  const p = createPuzzle(RAFTS);
  assert.deepEqual(raftPos(p, 0), [-1, 0]);
  assert.equal(blockedBy(p, -1, 0), false);
  tick(p, 5);
  assert.deepEqual(raftPos(p, 0), [-1, 0]);
  assert.deepEqual(toggleTime(p), ['flow']);
  assert.equal(blockedBy(p, -1, 0), null);
  tick(p, RAFT_STEP * 2 + 0.01);
  assert.deepEqual(raftPos(p, 0), [1, 0]);
});

test('낙엽이 모두 목표 칸일 때 멈추면 풀리고, 아닐 때 멈추면 그대로. 풀린 뒤엔 시계 돌이 듣지 않는다', () => {
  const p = createPuzzle(RAFTS);
  toggleTime(p);
  tick(p, RAFT_STEP * 2);
  assert.deepEqual(toggleTime(p), ['stop']);
  toggleTime(p);
  tick(p, RAFT_STEP);
  assert.deepEqual(toggleTime(p), ['stop', 'solved']);
  assert.deepEqual(toggleTime(p), []);
});

test('다시 놓기: 처음 상태로 돌아간다. Z로 칠 수 있는 것은 다시 놓기 돌과 시계 돌뿐', () => {
  const p = createPuzzle(PLATES);
  push(p, 1, 1, 1, 0, open);
  assert.equal(deviceAt(p, 5, 5), 'reset');
  reset(p);
  assert.deepEqual(p.boulders, [{ x: 1, z: 1 }, { x: 3, z: 1 }]);
  assert.equal(deviceAt(createPuzzle(RAFTS), 9, 9), 'clock');
  assert.equal(deviceAt(p, 1, 1), null);
});

test('이미 푼 퍼즐은 풀린 모습으로 만든다(돌은 발판·구덩이, 순서 돌 모두 켜짐, 낙엽은 목표 칸)', () => {
  assert.deepEqual(pieces(createPuzzle(PLATES, true)).plates.map(pl => pl.on), [true, true]);
  const q = createPuzzle(PITS, true);
  assert.deepEqual([q.filled, q.boulders.length], [[true, true], 1]);
  assert.equal(createPuzzle(STEPS, true).next, 3);
  const r = createPuzzle(RAFTS, true);
  assert.deepEqual([raftPos(r, 0), raftPos(r, 1), r.flowing], [[0, 0], [0, 1], false]);
  for (const def of [PLATES, PITS, STEPS, RAFTS]) assert.equal(createPuzzle(def, true).solved, true);
});

test('applySolved: solved 플래그와 정해 둔 플래그를 한 번씩 켜고 대사 노드를 돌려준다', () => {
  const s = createState();
  assert.equal(applySolved(s, PLATES), 'p_done');
  applySolved(s, PLATES);
  assert.deepEqual(s.flags, ['solved:p', 'gate_open']);
  assert.equal(applySolved(s, STEPS), null);
});
