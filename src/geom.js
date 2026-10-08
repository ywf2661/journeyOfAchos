// 순수 기하: x,z 평면만 다룬다. 방향각 θ의 앞쪽은 (sin θ, cos θ)이다.

export const DEADZONE = 0.15;   // 조이스틱을 이보다 덜 기울이면 멈춘 것으로 본다(손가락만 닿은 경우)

export const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export function inArc(from, facing, to, range, halfAngle) {
  const dx = to.x - from.x, dz = to.z - from.z, d = Math.hypot(dx, dz);
  if (d > range) return false;
  if (d === 0) return true;
  return (dx * Math.sin(facing) + dz * Math.cos(facing)) / d >= Math.cos(halfAngle);
}
