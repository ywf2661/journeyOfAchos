import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REGIONS, FIGHTS } from '../data/regions.js';
import { TILES, STAMPS, SHEETS } from '../data/tiles.js';
import { SPRITES } from '../data/sprites.js';
import { parseMap, isSolid } from '../src/map.js';
import { DIRS, AUTO } from '../src/player.js';
import { dist } from '../src/geom.js';

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
  for (const [id, f] of Object.entries(FIGHTS)) assert.ok(DIRS[f.player[2]], id);
});

// 시작 칸에서 4방향으로 걸어서 갈 수 있는 칸. 인물 칸은 막힌 것으로, 조건부 차단 칸(성문)은 열린 것으로 본다.
function reachable(k) {
  const r = REGIONS[k], m = MAPS[k];
  const actors = new Set(r.actors.map(a => `${a.x},${a.z}`));
  const ok = (x, z) => !isSolid(m, x, z) && !actors.has(`${x},${z}`);
  const seen = new Set([`${r.start.x},${r.start.z}`]), queue = [[r.start.x, r.start.z]];
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
    assert.ok(!isSolid(m, f.player[0], f.player[1]), id);
    for (const [x, z] of f.enemies) assert.ok(!isSolid(m, x, z), `${id}: (${x}, ${z})`);
  }
});

test('엔딩 길(새벽의 다리)을 자동으로 걷는 데 30초 넘게 걸린다(회상 대사가 걷는 동안 나오게)', () => {
  const r = REGIONS[3], m = MAPS[3];
  let steps = 0;
  while (!isSolid(m, r.start.x, r.start.z - steps - 1)) steps++;
  assert.ok(steps / AUTO >= 30, `${steps}칸 ÷ 초당 ${AUTO}칸 = ${(steps / AUTO).toFixed(1)}초`);
});
