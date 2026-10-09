// 퍼즐 장치 규칙(순수 함수, DOM 없음). 지역의 puzzle 정의(data/regions.js)로 상태를 만들고 바꾼다.
// 장치: 미는 돌·구덩이·발판·순서 돌·시계 돌·낙엽 디딤돌·다시 놓기 돌. 문은 regions.js의 blockers(조건부 막힌 칸)로 둔다.
export const RAFT_STEP = 0.6;   // 시간이 흐르는 동안 낙엽이 한 칸 가는 시간(초)

const same = ([ax, az], x, z) => ax === x && az === z;
const raftAtTick = (r, t) => r.path[(r.start + t) % r.path.length];

export function createPuzzle(def, solved = false) {
  const p = {
    def,
    boulders: (def.boulders ?? []).map(([x, z]) => ({ x, z })),
    filled: (def.pits ?? []).map(() => false),
    next: 0,          // 다음에 밟을 순서 돌
    flowing: false,   // 시계 돌로 시간이 흐르는 중인가
    tick: 0,          // 낙엽이 간 걸음 수
    acc: 0,
    solved: false,
  };
  if (solved) showSolved(p);
  return p;
}

// 이미 푼 퍼즐: 돌은 발판·구덩이 자리, 순서 돌은 모두 켜짐, 낙엽은 목표 칸에 멈춤
function showSolved(p) {
  const { plates = [], pits = [], steps = [], rafts = [] } = p.def;
  if (plates.length) p.boulders = p.boulders.map((b, i) => (plates[i] ? { x: plates[i][0], z: plates[i][1] } : b));
  if (pits.length) {
    p.filled = pits.map(() => true);
    p.boulders = p.boulders.slice(pits.length);
  }
  p.next = steps.length;
  if (rafts.length) {
    const period = rafts.reduce((n, r) => n * r.path.length, 1);
    p.tick = [...Array(period).keys()].find(t => rafts.every(r => same(r.goal, ...raftAtTick(r, t)))) ?? 0;
  }
  p.solved = true;
}

export const raftPos = (p, i) => raftAtTick(p.def.rafts[i], p.tick);

// 퍼즐이 이 칸을 어떻게 만드는가: true 막힘(돌·안 메운 구덩이·시계 돌·다시 놓기 돌),
// false 열림(시간이 멈춘 낙엽 — 물 위라도 밟는다), null 상관없음(맵이 정한다)
export function blockedBy(p, x, z) {
  const { pits = [], clock, reset: rs, rafts = [] } = p.def;
  if (p.boulders.some(b => b.x === x && b.z === z)) return true;
  if (pits.some((c, i) => same(c, x, z) && !p.filled[i])) return true;
  if ((clock && same(clock, x, z)) || (rs && same(rs, x, z))) return true;
  if (!p.flowing && rafts.some((_, i) => same(raftPos(p, i), x, z))) return false;
  return null;
}

// 미는 돌: (x, z)의 돌을 (dx, dz)로 한 칸 민다. base(x, z)는 맵·인물·조건부 막힌 칸.
// 너머가 안 메운 구덩이면 돌이 빠져 메워진다. 밀렸으면 이벤트를, 아니면 []를 돌려준다.
export function push(p, x, z, dx, dz, base) {
  const b = p.boulders.find(o => o.x === x && o.z === z);
  if (p.solved || !b) return [];
  const tx = x + dx, tz = z + dz;
  const pit = (p.def.pits ?? []).findIndex((c, i) => same(c, tx, tz) && !p.filled[i]);
  if (pit >= 0) {
    p.filled[pit] = true;
    p.boulders = p.boulders.filter(o => o !== b);
    return ['push', 'fill', ...check(p)];
  }
  if (base(tx, tz) || blockedBy(p, tx, tz) === true) return [];
  b.x = tx;
  b.z = tz;
  return ['push', ...check(p)];
}

// 아코스가 (x, z) 칸에 막 들어섰다: 순서 돌이면 차례인지 본다. 건너뛰면 켜진 돌이 모두 꺼진다.
export function stepOn(p, x, z) {
  const i = (p.def.steps ?? []).findIndex(c => same(c, x, z));
  if (p.solved || i < 0 || i < p.next) return [];
  if (i > p.next) {
    p.next = 0;
    return ['wrong'];
  }
  p.next++;
  return ['step', ...check(p)];
}

// 시계 돌을 쳤다: 시간이 흐르기 ⇄ 멈추기. 멈출 때 낙엽이 모두 목표 칸이면 풀린다.
export function toggleTime(p) {
  if (p.solved || !p.def.clock) return [];
  p.flowing = !p.flowing;
  p.acc = 0;
  return [p.flowing ? 'flow' : 'stop', ...check(p)];
}

export function tick(p, dt) {
  if (!p.flowing) return;
  p.acc += dt;
  while (p.acc >= RAFT_STEP) {
    p.acc -= RAFT_STEP;
    p.tick++;
  }
}

// 다시 놓기 돌: 처음 상태로(풀린 퍼즐은 그대로)
export function reset(p) {
  if (!p.solved) Object.assign(p, createPuzzle(p.def));
}

// Z로 칠 수 있는 장치가 이 칸에 있나(풀린 퍼즐은 없음)
export function deviceAt(p, x, z) {
  if (p.solved) return null;
  if (p.def.clock && same(p.def.clock, x, z)) return 'clock';
  if (p.def.reset && same(p.def.reset, x, z)) return 'reset';
  return null;
}

// 풀렸다: 저장할 플래그를 켜고, 열 대사 노드를 돌려준다
export function applySolved(state, def) {
  for (const f of [`solved:${def.id}`, def.set].filter(Boolean)) {
    if (!state.flags.includes(f)) state.flags.push(f);
  }
  return def.say ?? null;
}

// 그리기용 조각
export function pieces(p) {
  const { plates = [], pits = [], steps = [], rafts = [], clock = null, reset: rs = null } = p.def;
  const cells = new Set(rafts.flatMap(r => r.path.map(c => c.join(','))));
  return {
    boulders: p.boulders.map(b => ({ x: b.x, z: b.z })),
    plates: plates.map(([x, z]) => ({ x, z, on: p.boulders.some(b => b.x === x && b.z === z) })),
    pits: pits.map(([x, z], i) => ({ x, z, filled: p.filled[i] })),
    steps: steps.map(([x, z], i) => ({ x, z, lit: i < p.next })),
    rafts: rafts.map((_, i) => { const [x, z] = raftPos(p, i); return { x, z }; }),
    stream: [...cells].map(k => { const [x, z] = k.split(',').map(Number); return { x, z }; }),
    clock: clock && { x: clock[0], z: clock[1] },
    reset: rs && { x: rs[0], z: rs[1] },
    flowing: p.flowing,
  };
}

// 풀림 조건(퍼즐마다 장치 한 종류): 발판 모두 눌림 / 구덩이 모두 메움 / 순서 끝 / 시간이 멈췄고 낙엽 모두 목표 칸
function check(p) {
  const { plates = [], pits = [], steps = [], rafts = [] } = p.def;
  const done = plates.length ? plates.every(([x, z]) => p.boulders.some(b => b.x === x && b.z === z))
    : pits.length ? p.filled.every(Boolean)
    : steps.length ? p.next === steps.length
    : rafts.length ? !p.flowing && rafts.every((r, i) => same(r.goal, ...raftPos(p, i)))
    : false;
  if (p.solved || !done) return [];
  p.solved = true;
  return ['solved'];
}
