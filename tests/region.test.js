import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../src/story.js';
import { matches, lightFor, actorsFor, triggersFor, obstaclesFor } from '../src/region.js';

const REGION = {
  light: { 1: 'dusk', 2: 'day' },
  props: [{ m: 'rock', x: 1, z: 1, r: 2 }, { m: 'cloud', x: 9, z: 9 }],
  walls: [[0, 0, 3, 0]],
  blockers: [{ x: 5, z: 5, r: 2, if: '!gate_open' }],
  actors: [{ m: 'mage', x: 0, z: 4, day: 1 }, { m: 'mage', x: 0, z: 8, day: [2, 3] }],
  triggers: [{ id: 't1', node: 'n', x: 0, z: 0, r: 2, if: 'ready' }, { id: 't2', node: 'n', x: 0, z: 0, r: 2 }],
};

test('matches: 날짜(숫자·배열)와 플래그 조건', () => {
  const s = createState();
  assert.equal(matches({ day: 1 }, s), true);
  assert.equal(matches({ day: [2, 3] }, s), false);
  assert.equal(matches({ if: 'x' }, s), false);
  s.flags.push('x');
  assert.equal(matches({ if: 'x', day: 1 }, s), true);
});

test('lightFor: 문자열이면 그대로, 객체면 날짜별', () => {
  const s = createState();
  assert.equal(lightFor({ light: 'night' }, s), 'night');
  s.day = 2;
  assert.equal(lightFor(REGION, s), 'day');
});

test('actorsFor·triggersFor: 조건에 맞고 끝나지 않은 것만', () => {
  const s = createState();
  assert.deepEqual(actorsFor(REGION, s).map(a => a.z), [4]);
  assert.deepEqual(triggersFor(REGION, s).map(t => t.id), ['t2']);
  s.flags.push('ready', 'done:t2');
  assert.deepEqual(triggersFor(REGION, s).map(t => t.id), ['t1']);
});

test('obstaclesFor: 소품·배우·벽·조건부 차단물', () => {
  const s = createState();
  const obs = obstaclesFor(REGION, s);
  assert.ok(obs.some(o => o.x === 1 && o.z === 1 && o.r === 2));
  assert.ok(!obs.some(o => o.x === 9));
  assert.ok(obs.some(o => o.x === 0 && o.z === 4 && o.r === 0.7));
  assert.ok(obs.some(o => o.x === 3 && o.z === 0 && o.r === 1.5));
  assert.ok(obs.some(o => o.x === 5 && o.z === 5));
  s.flags.push('gate_open');
  assert.ok(!obstaclesFor(REGION, s).some(o => o.x === 5 && o.z === 5));
});
