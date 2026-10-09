// 포켓몬식 칸 이동: 4방향, 한 칸씩. 순수 함수(DOM 없음).
// 좌표 1 = 한 칸. 방향각은 geom.js 규약(앞 = (sin θ, cos θ))이라 전투 규칙(inArc)에 그대로 쓴다.
export const WALK = 4, RUN = 8, DASH = 14, AUTO = 0.9;   // 칸/초. AUTO는 엔딩에서 둘이 천천히 걷는 속도
export const TURN = 0.08;   // 선 자리에서 돌아설 때, 이보다 짧게 누르면 방향만 바꾼다(초)
export const DIRS = {
  up: { dx: 0, dz: -1, facing: Math.PI },
  down: { dx: 0, dz: 1, facing: 0 },
  left: { dx: -1, dz: 0, facing: -Math.PI / 2 },
  right: { dx: 1, dz: 0, facing: Math.PI / 2 },
};
export const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

export function createWalker(x, z, dir = 'up') {
  return { x, z, dir, facing: DIRS[dir].facing, from: null, to: null, t: 0, speed: 0, wait: 0, moving: false };
}

// 마지막으로 온전히 선 칸. 걷는 중이면 막 떠나온 칸이라, 멈추지 않고 지나간 칸도 그 프레임에 한 번은 나온다(순서 돌 밟기).
export const standing = w => (w.to ? w.from : { x: w.x, z: w.z });
// 선 채로 dir 쪽을 보고 누르고 있나. 돌아서는 중이면 아니다(짧게 누르면 방향만 바뀌니, 앞의 돌도 밀지 않는다).
export const pressing = (w, dir) => !!dir && dir === w.dir && !w.to && w.wait <= 1e-9;

function face(w, dir) {
  w.dir = dir;
  w.facing = DIRS[dir].facing;
}

function start(w, dir, speed, blocked) {
  const d = DIRS[dir], x = w.x + d.dx, z = w.z + d.dz;
  if (blocked(x, z)) return false;
  Object.assign(w, { from: { x: w.x, z: w.z }, to: { x, z }, t: 0, speed });
  return true;
}

// 입력 { dir, run, auto, slow }로 dt초만큼 움직인다(slow: 성휘참을 모으는 중이라 반 속도). 칸 사이에 있으면 입력과 상관없이 다음 칸까지는 간다.
// 칸에 닿았을 때 방향이 눌려 있으면 남은 시간으로 이어서 걷는다(그래서 프레임 길이와 상관없이 같은 거리를 간다).
export function step(w, { dir = null, run = false, auto = false, slow = false } = {}, dt, blocked) {
  let left = dt;
  while (left > 1e-9) {
    if (!w.to) {
      if (!dir) { w.moving = false; w.wait = 0; return w; }
      if (dir !== w.dir) { face(w, dir); if (!w.moving) w.wait = TURN; }
      if (w.wait > 0) {
        const used = Math.min(w.wait, left);
        w.wait -= used;
        left -= used;
        if (w.wait > 1e-9) return w;
      }
      if (!start(w, dir, auto ? AUTO : slow ? WALK / 2 : run ? RUN : WALK, blocked)) { w.moving = false; return w; }
    }
    const used = Math.min(left, (1 - w.t) / w.speed);
    w.t += used * w.speed;
    left -= used;
    w.moving = true;
    if (w.t >= 1 - 1e-9) {
      w.x = w.to.x;
      w.z = w.to.z;
      w.to = null;
    } else {
      w.x = w.from.x + (w.to.x - w.from.x) * w.t;
      w.z = w.from.z + (w.to.z - w.from.z) * w.t;
    }
  }
  return w;
}

// 피하기: 한 칸을 빠르게 간다. 걷던 중이면 지금 칸을 마저 끝낸 자리에서 출발한다. 바라보는 방향은 그대로.
export function dash(w, dir, blocked) {
  if (w.to) {
    w.x = w.to.x;
    w.z = w.to.z;
    w.to = null;
  }
  return start(w, dir, DASH, blocked);
}

// 바라보는 앞 칸(말 걸기 판정)
export const front = w => ({ x: Math.round(w.x) + DIRS[w.dir].dx, z: Math.round(w.z) + DIRS[w.dir].dz });
