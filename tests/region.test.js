import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../src/story.js';
import { matches, lightFor, actorsFor, triggersFor, blockedFor, fieldFightsFor, fieldFightAt, herbsFor } from '../src/region.js';
import { parseMap } from '../src/map.js';

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

test('blockedFor: 맵의 막힌 칸, 지금 보이는 인물, 조건이 맞아 닫힌 칸', () => {
  const tiles = { '.': { ground: ['town', 0] }, T: { ground: ['town', 0], solid: true } };
  const map = parseMap(['.T..', '....'], { minX: 0, minZ: 0 }, tiles, {});
  const region = {
    actors: [{ m: 'aion', x: 2, z: 0, day: 1 }, { m: 'aion', x: 3, z: 1, day: 2 }],
    blockers: [{ x: 0, z: 1, if: '!gate_open' }],
  };
  const s = createState();
  const blocked = blockedFor(region, map, s);
  assert.equal(blocked(1, 0), true);    // 나무
  assert.equal(blocked(2, 0), true);    // 1일째 인물
  assert.equal(blocked(3, 1), false);   // 2일째 인물은 아직 없다
  assert.equal(blocked(0, 1), true);    // 닫힌 성문
  assert.equal(blocked(0, 0), false);
  assert.equal(blocked(9, 9), true);    // 맵 밖
  s.flags.push('gate_open');
  assert.equal(blockedFor(region, map, s)(0, 1), false);
});

test('fieldFightsFor: 그 지역의 필드 전투 중 조건이 맞고 아직 안 이긴 것', () => {
  const fights = {
    a: { region: 1, field: { x: 0, z: 0, r: 2 } },
    b: { region: 1, field: { x: 0, z: 0, r: 2 }, if: 'ready', day: 2 },
    c: { region: 2, field: { x: 0, z: 0, r: 2 } },
    d: { region: 1, enemies: [] },
  };
  const s = createState();
  assert.deepEqual(fieldFightsFor(fights, 1, s).map(([id]) => id), ['a']);
  s.flags.push('ready', 'won:a'); s.day = 2;
  assert.deepEqual(fieldFightsFor(fights, 1, s).map(([id]) => id), ['b']);
});

test('herbsFor: 아직 먹지 않은 약초', () => {
  const r = { herbs: [{ id: 'h1', x: 0, z: 0 }, { id: 'h2', x: 1, z: 0 }] }, s = createState();
  s.flags.push('done:h1');
  assert.deepEqual(herbsFor(r, s).map(h => h.id), ['h2']);
  assert.deepEqual(herbsFor({}, s), []);
});

test('fieldFightAt: 원 안이거나, 서 있는 적에게 1.5칸 안으로 다가가면 그 필드 전투', () => {
  const fights = { a: { region: 1, field: { x: 0, z: 0, r: 2 }, enemies: [[5, 0], [0, -6, 'thrower']] } }, s = createState();
  assert.equal(fieldFightAt(fights, 1, s, { x: 0, z: 1 }), 'a');
  assert.equal(fieldFightAt(fights, 1, s, { x: 4, z: 0.5 }), 'a');
  assert.equal(fieldFightAt(fights, 1, s, { x: 3, z: 3 }), null);
  s.flags.push('won:a');
  assert.equal(fieldFightAt(fights, 1, s, { x: 0, z: 0 }), null);
});
