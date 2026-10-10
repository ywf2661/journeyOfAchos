// 글자 맵 해석: 칸마다 바닥·위 그림·막힘, 그리고 불빛 위치. 순수 함수(DOM 없음).
// 맵 맨 윗줄 맨 왼쪽 칸이 게임 좌표 (origin.minX, origin.minZ)이고, 한 칸이 좌표 1이다.
export function parseMap(lines, origin, tiles, stamps) {
  const h = lines.length, w = lines[0].length;
  if (lines.some(l => l.length !== w)) throw new Error('맵 줄 길이가 다르다');
  const cells = [], lights = [], placed = [];
  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      const ch = lines[row][col], t = tiles[ch], s = stamps[ch];
      if (!t && !s) throw new Error(`모르는 기호 '${ch}' (${col}, ${row})`);
      if (s) placed.push({ s, col, row });
      cells.push(s ? { ground: s.ground, top: null, solid: true } : { ground: t.ground, top: t.top ?? null, solid: !!t.solid });
      if (t?.light) lights.push({ x: origin.minX + col, z: origin.minZ + row, fire: !!t.fire });
    }
  }
  // 도장은 왼쪽 위 글자부터 오른쪽·아래로 칸을 덮는다(덮인 칸에 적힌 기호는 무시)
  const covered = new Set();
  for (const { s, col, row } of placed) {
    s.rows.forEach((r, dr) => r.forEach((top, dc) => {
      if (row + dr >= h || col + dc >= w) throw new Error(`도장이 맵 밖으로 나간다 (${col}, ${row})`);
      cells[(row + dr) * w + col + dc] = { ground: s.ground, top, solid: true };
      covered.add((row + dr) * w + col + dc);
    }));
  }
  // 이웃에 맞춘 조각(흙길 가장자리, 숲 덩어리)과 잔디 무늬. 이웃은 바꾸기 전 그림으로 본다. 맵 밖은 outside에 따라.
  const base = cells.slice();
  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      const i = row * w + col, t = tiles[lines[row][col]];
      if (covered.has(i) || !t) continue;
      if (t.auto) cells[i] = { ...cells[i], [t.auto.on]: autoPiece(t.auto, (dc, dr) => {
        const c = col + dc, r = row + dr;
        if (c < 0 || r < 0 || c >= w || r >= h) return !!t.auto.outside;
        return t.auto.edge(base[r * w + c], lines[r][c]);
      }) };
      if (t.vary) {
        let v = noise(col, row);
        const hit = t.vary.find(([, p]) => (v -= p) < 0);
        if (hit) cells[i] = { ...cells[i], ground: hit[0] };
      }
    }
  }
  // 그림자: 키 큰 것(위 그림이 있는 막힌 칸) 바로 아래의 지나갈 수 있는 칸
  for (let i = w; i < cells.length; i++) if (!cells[i].solid && cells[i - w].solid && cells[i - w].top) cells[i].shade = true;
  return { w, h, minX: origin.minX, minZ: origin.minZ, cells, lights };
}

// edge(dc, dr): 그 방향 이웃이 가장자리인가. 한 줄짜리(lone이 있을 때)면 lone, 아니면 3×3 중 하나,
// 네 변이 다 이어졌는데 대각선만 비었으면 안쪽 모서리.
function autoPiece(a, edge) {
  const n = edge(0, -1), s = edge(0, 1), w = edge(-1, 0), e = edge(1, 0);
  if (a.lone && ((n && s) || (w && e))) return a.lone;
  const rr = n ? 0 : s ? 2 : 1, cc = w ? 0 : e ? 2 : 1;
  if (rr === 1 && cc === 1 && a.inner) {
    const k = [[-1, -1], [1, -1], [-1, 1], [1, 1]].findIndex(([dc, dr]) => edge(dc, dr));
    if (k >= 0) return a.inner[k];
  }
  return a.nine[rr * 3 + cc];
}

// 칸마다 정해진 0~1 값(같은 맵은 언제나 같은 무늬)
function noise(col, row) {
  let x = Math.imul(col + 1, 0x27d4eb2d) ^ Math.imul(row + 0x165667b1, 0x85ebca6b);
  x ^= x >>> 15;
  x = Math.imul(x, 0x2c1b3c6d);
  x ^= x >>> 12;
  return (x >>> 0) / 4294967296;
}

export function cellAt(m, x, z) {
  const col = Math.round(x) - m.minX, row = Math.round(z) - m.minZ;
  if (col < 0 || row < 0 || col >= m.w || row >= m.h) return null;
  return m.cells[row * m.w + col];
}

export const isSolid = (m, x, z) => cellAt(m, x, z)?.solid ?? true;   // 맵 밖은 막힌 칸
