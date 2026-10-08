// 맵 기호와 그림. 칸 번호는 시트의 왼쪽 위부터 가로로 0, 1, 2…(16×16, 여백 없음). Kenney Tiny 시리즈, CC0.
export const SHEETS = {
  town: { url: 'assets/kenney/tiny-town.png', cols: 12, rows: 11 },
  dungeon: { url: 'assets/kenney/tiny-dungeon.png', cols: 12, rows: 11 },
  battle: { url: 'assets/kenney/tiny-battle.png', cols: 18, rows: 11 },
  farm: { url: 'assets/kenney/tiny-farm.png', cols: 12, rows: 11 },
};
const town = i => ['town', i], dun = i => ['dungeon', i], bat = i => ['battle', i], farm = i => ['farm', i];

// ground: 바닥, top: 그 위에 얹는 그림, solid: 못 지나감, light: 밤에 둘레를 밝힘, fire: 깜빡이는 불(draw.js가 그린다)
export const TILES = {
  '.': { ground: town(0) },                                       // 잔디
  ',': { ground: town(1) },                                       // 풀 포기
  '*': { ground: town(2) },                                       // 꽃
  '=': { ground: town(25) },                                      // 흙길
  _: { ground: town(109) },                                       // 돌바닥(광장)
  x: { ground: dun(12) },                                         // 역병에 썩은 땅
  '+': { ground: dun(37) },                                       // 나무 다리
  '~': { ground: bat(37), solid: true },                          // 물
  W: { ground: bat(75), solid: true },                            // 멈춘 폭포
  T: { ground: town(0), top: town(4), solid: true },              // 초록 나무
  t: { ground: town(0), top: town(16), solid: true },             // 작은 초록 나무
  Y: { ground: town(0), top: town(3), solid: true },              // 단풍 나무
  y: { ground: town(0), top: town(15), solid: true },             // 작은 단풍 나무
  D: { ground: town(0), top: farm(2), solid: true },              // 앙상한 나무
  M: { ground: town(0), top: bat(5), solid: true },               // 산
  o: { ground: town(0), top: farm(89), solid: true },             // 바위
  b: { ground: town(25), top: farm(85), solid: true },            // 통
  c: { ground: town(25), top: farm(76), solid: true },            // 상자
  f: { ground: town(0), top: town(81), solid: true },             // 울타리
  w: { ground: town(109), top: town(104), solid: true },          // 우물
  r: { ground: town(0), top: town(127), solid: true },            // 빈 갑주 걸이
  n: { ground: town(0), top: town(67), solid: true },             // 격리 천막
  e: { ground: town(0), top: dun(72), solid: true },              // 병상
  k: { ground: town(0), top: dun(63), solid: true },              // 괘종시계
  l: { ground: town(0), top: dun(29), solid: true, light: true }, // 가로등
  F: { ground: town(25), solid: true, light: true, fire: true },  // 모닥불
  '#': { ground: town(0), top: town(126), solid: true },          // 성벽
  g: { ground: town(25), top: town(113) },                        // 열린 성문(왼쪽). 닫혀 있을 때는 regions.js의 blockers가 덮는다
  h: { ground: town(25), top: town(114) },                        // 열린 성문(오른쪽)
};

// 여러 칸짜리 도장. 맵에서 이 글자가 도장의 왼쪽 위이고, 덮이는 나머지 칸에는 아무 기호나('.') 둔다. 모든 칸이 막힌다.
const rows = (sheet, grid) => grid.map(r => r.map(sheet));
export const STAMPS = {
  H: { ground: town(25), rows: rows(town, [[48, 49, 50], [60, 63, 62], [84, 86, 75]]) },                       // 회색 지붕 나무 집 3×3
  R: { ground: town(25), rows: rows(town, [[52, 53, 54], [64, 67, 66], [88, 90, 79]]) },                       // 붉은 지붕 돌집 3×3
  B: { ground: town(25), rows: rows(town, [[52, 53, 53, 54], [64, 65, 67, 66], [76, 88, 90, 79]]) },           // 큰 돌집(병영·교회·주막) 4×3
  C: { ground: town(109), rows: rows(town, [[99, 100, 100, 101, 101, 102], [126, 125, 111, 112, 125, 126]]) }, // 성 6×2
  K: { ground: town(0), rows: rows(town, [[99, 100, 102], [126, 125, 126], [126, 126, 126], [126, 103, 126]]) }, // 탑 3×4
};
