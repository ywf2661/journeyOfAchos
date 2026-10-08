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
  for (const { s, col, row } of placed) {
    s.rows.forEach((r, dr) => r.forEach((top, dc) => {
      if (row + dr >= h || col + dc >= w) throw new Error(`도장이 맵 밖으로 나간다 (${col}, ${row})`);
      cells[(row + dr) * w + col + dc] = { ground: s.ground, top, solid: true };
    }));
  }
  return { w, h, minX: origin.minX, minZ: origin.minZ, cells, lights };
}

export function cellAt(m, x, z) {
  const col = Math.round(x) - m.minX, row = Math.round(z) - m.minZ;
  if (col < 0 || row < 0 || col >= m.w || row >= m.h) return null;
  return m.cells[row * m.w + col];
}

export const isSolid = (m, x, z) => cellAt(m, x, z)?.solid ?? true;   // 맵 밖은 막힌 칸
