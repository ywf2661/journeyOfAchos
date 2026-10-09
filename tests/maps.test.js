import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REGIONS, FIGHTS } from '../data/regions.js';
import { TILES, STAMPS, SHEETS } from '../data/tiles.js';
import { SPRITES } from '../data/sprites.js';
import { parseMap, isSolid } from '../src/map.js';
import { DIRS, AUTO } from '../src/player.js';
import { dist } from '../src/geom.js';
import { createPuzzle, blockedBy } from '../src/puzzle.js';

const MAPS = Object.fromEntries(Object.entries(REGIONS).map(([k, r]) => [k, parseMap(r.map, r.bounds, TILES, STAMPS)]));
const STEPS = Object.values(DIRS).map(({ dx, dz }) => [dx, dz]);

test('맵 크기가 지역 경계와 같다', () => {
  for (const [k, r] of Object.entries(REGIONS)) {
    assert.equal(MAPS[k].w, r.bounds.maxX - r.bounds.minX + 1, r.name);
    assert.equal(MAPS[k].h, r.bounds.maxZ - r.bounds.minZ + 1, r.name);
  }
});

test('모든 그림이 있는 시트의 칸을 가리킨다', () => {
  const arts = [
    ...Object.values(TILES).flatMap(t => [t.ground, t.top]),
    ...Object.values(STAMPS).flatMap(s => [s.ground, ...s.rows.flat()]),
    ...Object.values(SPRITES).map(s => s.art),
    ...Object.values(REGIONS).flatMap(r => (r.blockers ?? []).map(b => b.art)),
  ].filter(Boolean);
  for (const [sheet, i] of arts) {
    assert.ok(SHEETS[sheet], sheet);
    assert.ok(Number.isInteger(i) && i >= 0 && i < SHEETS[sheet].cols * SHEETS[sheet].rows, `${sheet} ${i}`);
  }
});

test('아코스·아이온은 큰 스프라이트이고, 모든 프레임 번호가 시트 안에 있다', () => {
  for (const key of ['achos', 'aion']) {
    const s = SPRITES[key], sheet = SHEETS[s.sheet];
    assert.ok(sheet?.cell, `${key}: 칸 크기가 있는 시트`);
    const frames = [s.idle, s.walk, s.slash].filter(Boolean).flatMap(g => Object.values(g).flat());
    assert.ok(frames.length >= 3, key);
    for (const i of frames) assert.ok(Number.isInteger(i) && i >= 0 && i < sheet.cols * sheet.rows, `${key}: ${i}`);
    const [fx, fy] = s.foot;
    assert.ok(fx >= 0 && fx < sheet.cell[0] && fy >= 0 && fy < sheet.cell[1], `${key}: 발 위치`);
  }
});

test('인물은 정해 둔 그림을 쓰고, 막히지 않은 정수 칸에 선다(눕는 인물은 병상 위)', () => {
  for (const [k, r] of Object.entries(REGIONS)) {
    for (const a of r.actors) {
      assert.ok(SPRITES[a.m], `${r.name}: ${a.m}`);
      assert.ok(Number.isInteger(a.x) && Number.isInteger(a.z), `${r.name}: ${a.m}`);
      if (!a.lie) assert.ok(!isSolid(MAPS[k], a.x, a.z), `${r.name}: ${a.m} (${a.x}, ${a.z})`);
    }
  }
});

test('시작 위치와 전투 시작 위치는 4방향 이름을 가진다(3D 판 저장도 이어서 할 수 있게)', () => {
  for (const r of Object.values(REGIONS)) assert.ok(DIRS[r.start.dir], r.name);
  for (const [id, f] of Object.entries(FIGHTS)) if (f.player) assert.ok(DIRS[f.player[2]], id);
});

// 시작 칸에서 4방향으로 걸어서 갈 수 있는 칸. 인물 칸은 막힌 것으로, 조건부 차단 칸(문)은 열린 것으로,
// 퍼즐은 푼 모습(돌은 발판·구덩이, 낙엽 다리)으로 본다. 퍼즐이 실제로 풀리는지는 puzzles.test.js.
// from: 시작 칸(없으면 지역 시작), extra(x, z): 더 막을 칸
function reachable(k, from = [REGIONS[k].start.x, REGIONS[k].start.z], extra = () => false) {
  const r = REGIONS[k], m = MAPS[k];
  const pz = r.puzzle && createPuzzle(r.puzzle, true);
  const actors = new Set(r.actors.map(a => `${a.x},${a.z}`));
  const ok = (x, z) => {
    if (actors.has(`${x},${z}`) || extra(x, z)) return false;
    const v = pz ? blockedBy(pz, x, z) : null;
    return v === null ? !isSolid(m, x, z) : !v;
  };
  const seen = new Set([from.join()]), queue = [from];
  while (queue.length) {
    const [x, z] = queue.shift();
    for (const [dx, dz] of STEPS) {
      const key = `${x + dx},${z + dz}`;
      if (!seen.has(key) && ok(x + dx, z + dz)) { seen.add(key); queue.push([x + dx, z + dz]); }
    }
  }
  return [...seen].map(s => { const [x, z] = s.split(',').map(Number); return { x, z }; });
}

test('시작 칸은 막혀 있지 않고, 모든 트리거에 걸어서 닿는다', () => {
  for (const [k, r] of Object.entries(REGIONS)) {
    assert.ok(!isSolid(MAPS[k], r.start.x, r.start.z), r.name);
    const cells = reachable(k);
    for (const t of r.triggers) {
      // 자동 트리거는 반경 안에 서면, 아닌 것은 바라보는 앞 칸이 1.5칸 안이면 열린다
      const hit = t.auto
        ? cells.some(c => dist(c, t) <= t.r)
        : cells.some(c => STEPS.some(([dx, dz]) => dist({ x: c.x + dx, z: c.z + dz }, t) <= 1.5));
      assert.ok(hit, `${r.name}: ${t.id}`);
    }
  }
});

test('전투 시작 칸과 적 칸이 막혀 있지 않다', () => {
  for (const [id, f] of Object.entries(FIGHTS)) {
    const m = MAPS[f.region];
    assert.ok(m, `${id}: 지역 ${f.region}`);
    const [px, pz] = f.player ?? [f.field.x, f.field.z];   // 필드 전투는 그 자리에서 시작한다(원의 가운데)
    assert.ok(!isSolid(m, px, pz), id);
    for (const [x, z] of f.enemies) assert.ok(!isSolid(m, x, z), `${id}: (${x}, ${z})`);
  }
});

test('엔딩 길(새벽의 다리)을 자동으로 걷는 데 30초 넘게 걸린다(회상 대사가 걷는 동안 나오게)', () => {
  const r = REGIONS[3], m = MAPS[3];
  let steps = 0;
  while (!isSolid(m, r.start.x, r.start.z - steps - 1)) steps++;
  assert.ok(steps / AUTO >= 30, `${steps}칸 ÷ 초당 ${AUTO}칸 = ${(steps / AUTO).toFixed(1)}초`);
});

// 필드 전투가 지키는 다음 이야기 트리거와, 싸운 직후 아코스가 오는 칸. 이어하기(지역 시작 칸)에서도 본다.
const FIELD_GUARDS = { road_field: ['r1_traveler', [0, -12]], forest_field: ['r4_ambush', [0, 15]], village_field: ['r5_leave', [0, -3]], valley_field: ['r2_alarm', [-6, -5]] };
// 그 칸들에서 트리거가 열리나(자동은 반경 안, 말 걸기는 앞 칸이 1.5칸 안)
const opens = (t, cells) => t.auto
  ? cells.some(c => dist(c, t) <= t.r)
  : cells.some(c => STEPS.some(([dx, dz]) => dist({ x: c.x + dx, z: c.z + dz }, t) <= 1.5));
test('필드 전투는 지역마다 하나이고, 이기기 전에는 다음 이야기로 갈 수 없다(원을 피해 가거나 이어하기로 건너뛰지 못한다)', () => {
  const fields = Object.entries(FIGHTS).filter(([, f]) => f.field);
  assert.deepEqual(fields.map(([, f]) => f.region).sort(), [1, 2, 4, 5]);
  for (const [id, f] of fields) {
    const [tid, after] = FIELD_GUARDS[id], r = REGIONS[f.region], t = r.triggers.find(x => x.id === tid);
    if (t.if === `won:${id}`) continue;   // 이겨야 열리는 트리거
    const circle = (x, z) => Math.hypot(x - f.field.x, z - f.field.z) <= f.field.r;
    assert.ok(opens(t, reachable(f.region, after)), `${id}: 원을 안 막으면 ${tid}에 닿는다`);
    for (const from of [after, [r.start.x, r.start.z]]) assert.ok(!opens(t, reachable(f.region, from, circle)), `${id}: ${from}에서 원을 피해 ${tid}`);
  }
});

test('약초는 지역마다 하나, 걸어서 닿는 빈칸에 있다', () => {
  for (const k of [1, 2, 4, 5]) {
    const [h] = REGIONS[k].herbs ?? [];
    assert.ok(h, REGIONS[k].name);
    assert.ok(reachable(k).some(c => c.x === h.x && c.z === h.z), `${REGIONS[k].name}: ${h.id}`);
  }
});
