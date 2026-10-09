import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REGIONS } from '../data/regions.js';
import { SCRIPT } from '../data/script.js';
import { TILES, STAMPS } from '../data/tiles.js';
import { parseMap } from '../src/map.js';
import { blockedFor } from '../src/region.js';
import { createState } from '../src/story.js';
import { createPuzzle, blockedBy, push, stepOn, toggleTime, tick, raftPos, RAFT_STEP } from '../src/puzzle.js';

const STEPS4 = [[0, -1], [0, 1], [-1, 0], [1, 0]];
const MARGIN = 4;

// 퍼즐이 동작하는 조건의 플래그를 켠 상태(①은 경비병 대화 뒤)와 맵·인물·조건부 막힌 칸
function setup(k, flags = []) {
  const r = REGIONS[k], state = createState();
  state.flags.push(...flags);
  if (r.puzzle?.if) state.flags.push(r.puzzle.if);
  return { r, base: blockedFor(r, parseMap(r.map, r.bounds, TILES, STAMPS), state) };
}
const blockedWith = (p, base) => (x, z) => { const v = blockedBy(p, x, z); return v === null ? base(x, z) : v; };

// 시작 칸에서 (퍼즐을 건드리지 않고) 걸어서 닿는 칸
function walkable(start, blocked) {
  const seen = new Set([start.join(',')]), q = [start];
  while (q.length) {
    const [x, z] = q.shift();
    for (const [dx, dz] of STEPS4) {
      const k = `${x + dx},${z + dz}`;
      if (!seen.has(k) && !blocked(x + dx, z + dz)) { seen.add(k); q.push([x + dx, z + dz]); }
    }
  }
  return seen;
}

// 밀기 퍼즐 풀이기: (아코스 칸, 돌, 메운 구덩이)를 밀기 수가 적은 순으로 탐색(0-1 넓이 우선). 최소 밀기 수, 못 풀면 null.
// 아코스는 퍼즐 둘레 상자(장치에서 MARGIN칸) 안에서만 움직인다. 들어오는 칸은 지역 시작점에서 걸어서 닿는 상자 안 칸.
// MARGIN 4: ① 마당 문으로 들어가려면 장치에서 4칸 떨어진 골목(z -3)을 지나야 한다.
function area(k) {
  const { r, base } = setup(k);
  const p0 = createPuzzle(r.puzzle);
  const objs = [...r.puzzle.boulders, ...(r.puzzle.plates ?? []), ...(r.puzzle.pits ?? [])];
  const [x0, z0] = [Math.min(...objs.map(o => o[0])) - MARGIN, Math.min(...objs.map(o => o[1])) - MARGIN];
  const [x1, z1] = [Math.max(...objs.map(o => o[0])) + MARGIN, Math.max(...objs.map(o => o[1])) + MARGIN];
  const inBox = (x, z) => x >= x0 && x <= x1 && z >= z0 && z <= z1;
  const reach = walkable([r.start.x, r.start.z], blockedWith(p0, base));
  const start = [...reach].map(s => s.split(',').map(Number)).find(([x, z]) => inBox(x, z));
  assert.ok(start, `${r.name}: 퍼즐에 다가갈 수 없다`);
  return { r, base, p0, inBox, start };
}
const clone = p => ({ ...p, boulders: p.boulders.map(b => ({ ...b })), filled: [...p.filled] });

function solvePush(k) {
  const { base, p0, inBox, start } = area(k);
  const key = ([hx, hz], p) => `${hx},${hz}|${p.boulders.map(b => `${b.x},${b.z}`).sort().join(';')}|${p.filled.join()}`;
  const best = new Map([[key(start, p0), 0]]), dq = [{ hero: start, p: p0, pushes: 0 }];
  while (dq.length) {
    const { hero: [hx, hz], p, pushes } = dq.shift();
    if (p.solved) return pushes;
    for (const [dx, dz] of STEPS4) {
      const nx = hx + dx, nz = hz + dz;
      if (!inBox(nx, nz)) continue;
      const q = clone(p);
      let w = 0;
      if (q.boulders.some(b => b.x === nx && b.z === nz)) {
        if (!push(q, nx, nz, dx, dz, base).length) continue;
        w = 1;
      }
      if (blockedWith(q, base)(nx, nz)) continue;
      const k2 = key([nx, nz], q);
      if (best.has(k2) && best.get(k2) <= pushes + w) continue;
      best.set(k2, pushes + w);
      const item = { hero: [nx, nz], p: q, pushes: pushes + w };
      if (w) dq.push(item); else dq.unshift(item);
    }
  }
  return null;
}

// 밀기 퍼즐에서 닿을 수 있는 모든 상태: (돌 자리, 메운 구덩이, 아코스가 밀지 않고 걸어 다니는 상자 안 칸들).
// 상태마다 한 번 밀어서 가는 다음 상태 번호(next)를 단다. 풀린 상태에서는 더 밀지 않는다.
function pushStates(k) {
  const { base, p0, inBox, start } = area(k);
  const region = (p, from) => walkable(from, (x, z) => !inBox(x, z) || blockedWith(p, base)(x, z));
  const states = [], index = new Map();
  const add = (p, from) => {
    const cells = region(p, from);
    const key = `${[...cells].sort()[0]}|${p.boulders.map(b => `${b.x},${b.z}`).sort().join(';')}|${p.filled.join()}`;
    if (!index.has(key)) { index.set(key, states.length); states.push({ p, cells, next: [] }); }
    return index.get(key);
  };
  add(p0, start);
  for (let i = 0; i < states.length; i++) {
    const { p, cells } = states[i];
    if (p.solved) continue;
    for (const c of cells) {
      const [hx, hz] = c.split(',').map(Number);
      for (const [dx, dz] of STEPS4) {
        const nx = hx + dx, nz = hz + dz;
        if (!inBox(nx, nz) || !p.boulders.some(b => b.x === nx && b.z === nz)) continue;
        const q = clone(p);
        if (push(q, nx, nz, dx, dz, base).length) states[i].next.push(add(q, [nx, nz]));
      }
    }
  }
  return states;
}

test('① 성문 평형추: 시작점에서 다가가 풀 수 있고, 다섯 번 넘게 밀어야 한다', () => {
  const n = solvePush(1);
  assert.ok(n !== null && n >= 5, `최소 밀기 ${n}`);
});

test('② 무너진 길: 풀 수 있고, 여덟 번 넘게 밀어야 한다', () => {
  const n = solvePush(4);
  assert.ok(n !== null && n >= 8, `최소 밀기 ${n}`);
});

test('③ 순서 돌: 모든 돌에 걸어서 닿고, 정한 순서로 밟으면 풀린다', () => {
  const { r, base } = setup(5);
  const p = createPuzzle(r.puzzle);
  const reach = walkable([r.start.x, r.start.z], blockedWith(p, base));
  for (const [x, z] of r.puzzle.steps) assert.ok(reach.has(`${x},${z}`), `${x},${z}`);
  assert.equal(r.puzzle.steps.flatMap(([x, z]) => stepOn(p, x, z)).at(-1), 'solved');
});

test('④ 멈춘 시간: 시계 돌 앞에 설 수 있고, 흘려 두면 낙엽이 한 줄로 서는 순간에 멈추면 풀린다', () => {
  const { r, base } = setup(2);
  const p = createPuzzle(r.puzzle);
  const reach = walkable([r.start.x, r.start.z], blockedWith(p, base));
  const [cx, cz] = r.puzzle.clock;
  assert.ok(STEPS4.some(([dx, dz]) => reach.has(`${cx + dx},${cz + dz}`)), '시계 돌 앞');
  toggleTime(p);
  let n = 0;
  while (!r.puzzle.rafts.every((rf, i) => raftPos(p, i).join() === rf.goal.join()) && n++ < 100) tick(p, RAFT_STEP);
  assert.ok(n < 100, '한 줄로 서지 않는다');
  assert.deepEqual(toggleTime(p), ['stop', 'solved']);
});

test('퍼즐을 풀기 전에는 그 너머로 갈 수 없다(돌아가는 길이 없다)', () => {
  for (const [k, beyond] of [[1, '0,-11'], [4, '4,-7'], [5, '0,-3'], [2, '0,-2']]) {
    const { r, base } = setup(k);
    const reach = walkable([r.start.x, r.start.z], blockedWith(createPuzzle(r.puzzle), base));
    assert.ok(!reach.has(beyond), `${r.name}: ${beyond}`);
  }
});

test('밀기 퍼즐은 어떻게 밀어도, 풀기 전에는 그 너머로 갈 수 없다(구덩이 하나만 메우고 건너기 등)', () => {
  for (const [k, beyond] of [[1, '0,-11'], [4, '1,-5']]) {
    const bad = pushStates(k).filter(s => !s.p.solved && s.cells.has(beyond));
    assert.equal(bad.length, 0, `${REGIONS[k].name}: 안 풀린 채 ${beyond}에 닿는 상태 ${bad.length}개`);
  }
});

test('밀기 퍼즐은 어떻게 꼬여도 풀거나 다시 놓기 돌 앞에 설 수 있다(돌 사이에 갇히지 않는다)', () => {
  for (const k of [1, 4]) {
    const states = pushStates(k), [rx, rz] = REGIONS[k].puzzle.reset;
    const ok = states.map(s => s.p.solved || STEPS4.some(([dx, dz]) => s.cells.has(`${rx + dx},${rz + dz}`)));
    // 거꾸로: 좋은 상태로 한 번 밀어 갈 수 있는 상태도 좋은 상태
    for (let changed = true; changed;) {
      changed = false;
      states.forEach((s, i) => { if (!ok[i] && s.next.some(j => ok[j])) ok[i] = changed = true; });
    }
    const stuck = ok.filter(v => !v).length;
    assert.equal(stuck, 0, `${REGIONS[k].name}: 빠져나올 수 없는 상태 ${stuck}개 / ${states.length}`);
  }
});

test('밀기 퍼즐의 다시 놓기 돌 앞에 설 수 있다', () => {
  for (const k of [1, 4]) {
    const { r, base } = setup(k);
    const reach = walkable([r.start.x, r.start.z], blockedWith(createPuzzle(r.puzzle), base));
    const [x, z] = r.puzzle.reset;
    assert.ok(STEPS4.some(([dx, dz]) => reach.has(`${x + dx},${z + dz}`)), r.name);
  }
});

test('시계 돌은 낙엽이 지나는 칸과 붙어 있지 않다(낙엽 위에서 시간을 흘려 물에 갇히지 않게)', () => {
  const { clock: [cx, cz], rafts } = REGIONS[2].puzzle;
  for (const [x, z] of rafts.flatMap(r => r.path)) assert.ok(Math.abs(x - cx) + Math.abs(z - cz) > 1, `${x},${z}`);
});

test('이 변경 전의 저장(경비병 대화로 gate_open만 켜짐)으로 이어도 성 밖으로 나갈 수 있다', () => {
  const r = REGIONS[1], state = createState();
  state.flags.push('king_done', 'done:r1_gate', 'gate_open');
  const base = blockedFor(r, parseMap(r.map, r.bounds, TILES, STAMPS), state);
  const reach = walkable([r.start.x, r.start.z], blockedWith(createPuzzle(r.puzzle), base));
  assert.ok(reach.has('0,-11'));
});

test('퍼즐마다 풀렸을 때 열 대사가 있다', () => {
  for (const r of Object.values(REGIONS)) if (r.puzzle) assert.ok(SCRIPT[r.puzzle.say], r.puzzle.id);
});
