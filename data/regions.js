// 지역 배치와 전투 정의. 형식은 docs/superpowers/plans/2026-10-08-journey-of-achos.md Task 3 참고.
const PI = Math.PI;

export const REGIONS = {
  1: {
    name: '역병의 왕도',
    light: 'night',
    ground: '#3a3842',
    bounds: { minX: -20, maxX: 20, minZ: -60, maxZ: 34 },
    start: { x: 0, z: 30, rot: PI },
    props: [
      { m: 'castle', x: 0, z: 54, rot: PI },
      { m: 'barracks', x: -14, z: 28, rot: PI / 2, r: 5 },
      { m: 'weaponrack', x: -8.5, z: 26.5, rot: PI / 2, r: 0.8 },
      { m: 'church', x: 14, z: 30, rot: -PI / 2, r: 5 },
      { m: 'tent', x: 14, z: 16, rot: -PI / 2, r: 2.2 },
      { m: 'bed', x: 11, z: 16, rot: -PI / 2, r: 1.4 },
      { m: 'home_a', x: -15, z: 12, rot: PI / 2, r: 3.5 },
      { m: 'home_b', x: 15, z: 4, rot: -PI / 2, r: 3.5 },
      { m: 'tavern', x: -15, z: -1, rot: PI / 2, r: 4 },
      { m: 'home_a', x: 15, z: -4, rot: -PI / 2, r: 3.5 },
      { m: 'well', x: 0, z: 10, r: 1.6 },
      { m: 'post_lantern', x: -5, z: 22 },
      { m: 'post_lantern', x: 5, z: 8 },
      { m: 'post_lantern', x: -5, z: -5 },
      { m: 'barrel', x: -10, z: 4, r: 0.8 },
      { m: 'crate', x: -10.5, z: 5.6, r: 0.8 },
      { m: 'wall_gate', x: 0, z: -10 },
      { m: 'wall', x: -12, z: -10 },
      { m: 'wall', x: 12, z: -10 },
      { m: 'wall', x: -24, z: -10 },
      { m: 'wall', x: 24, z: -10 },
      { m: 'dead_tree', x: -11, z: -24, r: 1 },
      { m: 'dead_tree_m', x: 12, z: -33, r: 1 },
      { m: 'dead_tree', x: -9, z: -47, r: 1 },
      { m: 'fence', x: 8, z: -45, rot: 0.3 },
      { m: 'rock_c', x: 6, z: -20, r: 1.2 },
    ],
    procs: [
      { kind: 'lamp', x: -5, z: 22 },
      { kind: 'lamp', x: 5, z: 8 },
      { kind: 'lamp', x: -5, z: -5 },
      { kind: 'blight', x: 3, z: 20 },
      { kind: 'blight', x: -7, z: 7, s: 0.8 },
      { kind: 'blight', x: 9, z: -2, s: 1.5 },
      { kind: 'blight', x: -3, z: -30, s: 2 },
      { kind: 'fire', x: 0, z: -52 },
    ],
    walls: [[-30, -10, -2.5, -10], [2.5, -10, 30, -10]],
    blockers: [{ x: 0, z: -10, r: 2.5, if: '!gate_open' }],
    actors: [
      { m: 'barbarian', x: -7, z: 21, rot: PI / 2 },                       // 병사들
      { m: 'barbarian', x: -5.5, z: 22.8, rot: PI },
      { m: 'rogue', x: 11, y: 0.5, z: 16, rot: -PI / 2, scale: 0.6, anim: 'Lie_Idle' }, // 병상의 왕자
      { m: 'knight', x: 3, z: 13, rot: PI, scale: 1.05, tint: '#d8b45a' },   // 왕
      { m: 'hooded', x: 3.5, z: -7, rot: 0 },                                 // 성문 경비병
      { m: 'hooded', x: 1.5, z: -53, rot: 0, tint: '#a08060', anim: 'Sit_Floor_Idle' }, // 여행자
    ],
    triggers: [
      { id: 'r1_open', node: 'r1_open', x: 0, z: 30, r: 4, auto: true },
      { id: 'r1_rack', node: 'r1_rack', x: -8.5, z: 26.5, r: 2.5, label: '빈 갑주 걸이를 살핀다' },
      { id: 'r1_soldiers', node: 'r1_soldiers', x: -6.3, z: 21.8, r: 3, label: '병사들과 이야기한다' },
      { id: 'r1_prince', node: 'r1_prince', x: 11, z: 16, r: 3.5, label: '격리 천막으로 간다' },
      { id: 'r1_king', node: 'r1_king', x: 3, z: 13, r: 3, label: '폐하를 뵙는다' },
      { id: 'r1_gate_early', node: 'r1_gate_early', x: 0, z: -7, r: 3.5, auto: true, if: '!king_done' },
      { id: 'r1_gate', node: 'r1_gate', x: 0, z: -7, r: 3.5, if: 'king_done', label: '성문 경비병에게 말한다' },
      { id: 'r1_road', node: 'r1_road', x: 0, z: -26, r: 5, auto: true, if: 'gate_open' },
      { id: 'r1_traveler', node: 'r1_traveler', x: 1.5, z: -53, r: 3.5, if: 'won:road', ends: true, label: '모닥불 곁의 여행자에게 말을 건다' },
    ],
  },

  2: {
    name: '멈춘 계절의 골짜기',
    light: { 1: 'dusk', 2: 'day', 3: 'night' },
    ground: '#3d4a36',
    bounds: { minX: -28, maxX: 28, minZ: -32, maxZ: 30 },
    start: { x: 0, z: 26, rot: PI },
    props: [
      { m: 'mountain_a', x: -40, z: -10 },
      { m: 'mountain_b', x: 40, z: -6 },
      { m: 'mountain_c', x: -18, z: -50 },
      { m: 'mountain_a', x: 20, z: -52, rot: 1 },
      { m: 'mountain_b', x: -42, z: 24, rot: 2 },
      { m: 'mountain_c', x: 42, z: 28, rot: 0.5 },
      { m: 'tower', x: 0, z: -24, r: 4, tint: '#c8b0f0' },
      { m: 'trees_a', x: -14, z: 12, r: 4 },
      { m: 'trees_b', x: 16, z: 10, r: 4 },
      { m: 'tree', x: 10, z: -10, r: 1 },
      { m: 'tree', x: -6, z: 20, r: 1 },
      { m: 'trees_a', x: 20, z: -18, r: 4 },
      { m: 'rock_c', x: 14, z: -2, r: 1.4 },
      { m: 'rock_a', x: -20, z: -14 },
    ],
    procs: [
      { kind: 'waterfall', x: -24, z: -8, rot: PI / 2, w: 7, h: 16 },
      { kind: 'water', x: -21, z: -8, w: 6, d: 9 },
      { kind: 'leaves', x: 0, z: 0, w: 50, d: 55, n: 400 },
      { kind: 'clock', x: 4, z: -19 },
    ],
    walls: [[-24, -13, -24, -3]],
    actors: [
      { m: 'mage', x: 0, z: -16, rot: 0, day: 1 },
      { m: 'mage', x: -16, z: -6, rot: PI / 2, day: 2 },
      { m: 'mage', x: 0, z: -16, rot: 0, day: 3 },
    ],
    triggers: [
      { id: 'r2_arrive', node: 'r2_arrive', x: 0, z: 26, r: 4, auto: true, day: 1 },
      { id: 'r2_meet', node: 'r2_meet', x: 0, z: -16, r: 3, day: 1, ends: true, label: '탑 앞의 여인에게 말을 건다' },
      { id: 'r2_d2_talk', node: 'r2_d2_talk', x: -16, z: -6, r: 3, day: 2, label: '마술사에게 말을 건다' },
      { id: 'r2_mem_falls', node: 'r2_mem_falls', x: -20, z: -10, r: 3, day: 2, if: 'done:r2_d2_talk', label: '멈춘 폭포 아래를 걷는다' },
      { id: 'r2_mem_ring', node: 'r2_mem_ring', x: 14, z: -2, r: 3, day: 2, if: 'soldiers', label: '바위에 앉아 쉰다' },
      { id: 'r2_alarm', node: 'r2_alarm', x: 0, z: 22, r: 6, day: 2, if: 'done:r2_d2_talk', auto: true, ends: true },
      { id: 'r2_mem_stars', node: 'r2_mem_stars', x: -10, z: -20, r: 3, day: 3, label: '풀밭에 누워 별을 본다' },
      { id: 'r2_mem_clock', node: 'r2_mem_clock', x: 4, z: -19, r: 2.5, day: 3, label: '멈춘 괘종시계를 살핀다' },
      { id: 'r2_d3_night', node: 'r2_d3_night', x: 0, z: -16, r: 3, day: 3, ends: true, label: '마술사에게 말을 건다' },
    ],
  },

  3: {
    name: '새벽의 다리',
    light: 'dawn',
    ground: '#6b5a45',
    bounds: { minX: -14, maxX: 14, minZ: -90, maxZ: 18 },
    start: { x: 0, z: 12, rot: PI },
    props: [
      { m: 'bridge', x: 0, z: 24 },
      { m: 'castle', x: 0, z: -150, scale: 1.4 },     // 지평선 너머의 왕도
      { m: 'mountain_c', x: -30, z: 10 },
      { m: 'mountain_a', x: 32, z: 0 },
      { m: 'tree', x: 8, z: -10, r: 1 },
      { m: 'tree', x: -9, z: -30, r: 1 },
      { m: 'trees_b', x: 12, z: -45 },
      { m: 'hills', x: -22, z: -60 },
      { m: 'hills', x: 24, z: -80 },
    ],
    procs: [{ kind: 'water', x: 0, z: 24, w: 40, d: 6 }],
    walls: [],
    actors: [{ m: 'mage', x: 2.5, z: 15, rot: PI, if: 'done:r3_arrive' }],
    triggers: [
      { id: 'r3_arrive', node: 'r3_arrive', x: 0, z: 12, r: 3, auto: true },
      { id: 'r3_bridge', node: 'r3_bridge', x: 2.5, z: 15, r: 3, if: 'done:r3_arrive', ends: true, label: '그녀에게 다가간다' },
    ],
  },
};

export const FIGHTS = {
  road: { enemies: [[-4, -35], [4, -37]], player: [0, -26, PI], then: 'r1_road_after' },
  valley: { enemies: [[-5, 27], [0, 29], [5, 27]], player: [0, 18, 0], then: 'r2_valley_after' },
  freeze: {
    enemies: [[-8, 18], [-4, 22], [0, 16], [4, 21], [8, 17], [0, 26]],
    frozen: true, enemyHp: 1, timeLimit: 25, player: [0, 12, 0], then: 'r2_freeze_after',
  },
};
