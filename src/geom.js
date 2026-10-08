// 순수 기하: x,z 평면만 다룬다. 방향각 θ의 앞쪽은 (sin θ, cos θ)이다(Three.js rotation.y와 같은 규약).

// 카메라는 (sin yaw, cos yaw) 쪽 뒤에서 플레이어를 본다. 화면 기준 WASD를 월드 방향으로 바꾼다.
export function moveVector(keys, camYaw) {
  const f = (keys.w ? 1 : 0) - (keys.s ? 1 : 0);
  const r = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
  if (!f && !r) return null;
  const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw);
  const x = fx * f - fz * r, z = fz * f + fx * r;
  const len = Math.hypot(x, z);
  return { x: x / len, z: z / len };
}

export const facingOf = v => Math.atan2(v.x, v.z);

export const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

// 원형 장애물 밖으로 밀어내고 지역 경계 안으로 잘라 낸다.
export function resolve(p, radius, obstacles, bounds) {
  let { x, z } = p;
  for (const o of obstacles) {
    const dx = x - o.x, dz = z - o.z, d = Math.hypot(dx, dz), min = o.r + radius;
    if (d >= min) continue;
    if (d === 0) { x = o.x + min; continue; }
    x = o.x + (dx / d) * min;
    z = o.z + (dz / d) * min;
  }
  return {
    x: Math.min(bounds.maxX, Math.max(bounds.minX, x)),
    z: Math.min(bounds.maxZ, Math.max(bounds.minZ, z)),
  };
}

export function inArc(from, facing, to, range, halfAngle) {
  const dx = to.x - from.x, dz = to.z - from.z, d = Math.hypot(dx, dz);
  if (d > range) return false;
  if (d === 0) return true;
  return (dx * Math.sin(facing) + dz * Math.cos(facing)) / d >= Math.cos(halfAngle);
}

// 벽 같은 선분을 원 충돌체로 바꾼다. 간격이 r 이하라 사이로 빠져나갈 틈이 없다.
export function circlesAlong(x1, z1, x2, z2, r) {
  const n = Math.max(1, Math.ceil(Math.hypot(x2 - x1, z2 - z1) / r));
  return Array.from({ length: n + 1 }, (_, i) => ({ x: x1 + ((x2 - x1) * i) / n, z: z1 + ((z2 - z1) * i) / n, r }));
}
