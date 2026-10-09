// 지역 배치와 전투 정의. 좌표 1 = 타일 1칸, x는 오른쪽, z는 아래(남쪽)가 +.
// map의 맨 윗줄 맨 왼쪽 칸이 (bounds.minX, bounds.minZ). 기호는 data/tiles.js 참고.
// 지나가는 차례: 1 왕도 → 4 검은 숲길 → 5 버려진 마을 → 2 골짜기 → 3 다리. 번호는 저장과 맞추려고 그대로 둔다.

// 골짜기 개울의 낙엽이 시간이 흐를 때 오가는 길(x -3..3 좌우 왕복, 12걸음)
const drift = z => [-3, -2, -1, 0, 1, 2, 3, 2, 1, 0, -1, -2].map(x => [x, z]);

export const REGIONS = {
  1: {
    name: '역병의 왕도',
    light: 'night',
    bounds: { minX: -12, maxX: 12, minZ: -22, maxZ: 21 },
    start: { x: 0, z: 19, dir: 'up' },
    herbs: [{ id: 'r1_herb', x: -6, z: -15 }],      // 약초: 다친 채로 밟으면 ♥+1(성문 밖 들판)
    map: [
      'TTTTTTTTTTTTTTTTTTTTTTTTT',
      'TxDD.......x........D.x.T',
      'TD,..DD,...=F=...D.D...xT',
      'T...,......===.....,.D..T',
      'T....x.....===..........T',
      'T..D..,....===......,D..T',
      'T..,.,.....===..........T',
      'T.,........===..........T',
      'T.xD.......===..........T',
      'T..........===.....,....T',
      'T.D........===.......D..T',
      'TD....x....===....Dx....T',
      'T##########gh###########T',
      'T.......,..===.f____f...T',
      'TB...,...,.===.f_b__R...T',
      'T....,P....===.f____....T',
      'T........l.===..____....T',
      'T..........===.f____f...T',
      'T,.,.......===.ff=fff...T',
      'T.=====================.T',
      'T....,.....===.....,....T',
      'T..........===..........T',
      'TH......._______....H...T',
      'T........_______........T',
      'T........___w___........T',
      'T....,..._______......,.T',
      'T...,.,.,_______........T',
      'T.P,..b..,.===........P.T',
      'T.....c....===.l........T',
      'T..........===,.........T',
      'T.=====================.T',
      'T,...xx....===..........T',
      'T..........===..........T',
      'TB.........===.,...e.n..T',
      'T.........,===..........T',
      'T....r.....===..xx......T',
      'T..........===..x...B...T',
      'T........l.===..,,......T',
      'T....,.,...===..........T',
      'T,P........===..,P......T',
      'T,......,..===.......,P.T',
      'T.....,....===......,...T',
      'T........C..............T',
      'T.......................T',
    ],
    // 성문: 열리기 전에는 내려진 창살이 길을 막는다
    blockers: [
      { x: -1, z: -10, if: '!gate_open', art: ['town', 111] },
      { x: 0, z: -10, if: '!gate_open', art: ['town', 112] },
      { x: 5, z: -4, if: '!gate_jam', art: ['town', 81] },          // 평형추 마당 울타리 문: 경비병 대화 뒤 열림
    ],
    // 퍼즐 ①: 성벽 안쪽 마당의 평형추 돌 둘을 발판 둘에 올리면 성문이 열린다(gate_open)
    puzzle: {
      id: 'r1_gate', if: 'gate_jam',
      boulders: [[5, -7], [6, -7]], plates: [[4, -9], [7, -9]], reset: [3, -6],   // 울타리 사이: 마당 안(4,-6)·밖(2,-6) 어느 쪽에서도 친다
      set: 'gate_open', say: 'r1_gate_open',
    },
    actors: [
      { m: 'soldier', x: -5, z: 11 },                 // 병사들
      { m: 'soldier', x: -5, z: 13 },
      { m: 'prince', x: 7, z: 11, lie: true },        // 병상의 왕자
      { m: 'king', x: 4, z: 2 },                      // 왕
      { m: 'guard', x: 2, z: -8 },                    // 성문 경비병
      { m: 'traveler', x: 2, z: -20 },                // 모닥불 곁의 여행자
    ],
    triggers: [
      { id: 'r1_open', node: 'r1_open', x: 0, z: 19, r: 3, auto: true },
      { id: 'r1_rack', node: 'r1_rack', x: -7, z: 13, r: 2.5, label: '빈 갑주 걸이를 살핀다' },
      { id: 'r1_soldiers', node: 'r1_soldiers', x: -5, z: 12, r: 3, label: '병사들과 이야기한다' },
      { id: 'r1_prince', node: 'r1_prince', x: 7, z: 11, r: 3.5, label: '격리 천막으로 간다' },
      { id: 'r1_king', node: 'r1_king', x: 4, z: 2, r: 3, label: '폐하를 뵙는다' },
      { id: 'r1_gate_early', node: 'r1_gate_early', x: 0, z: -7, r: 2.5, auto: true, if: '!king_done' },
      { id: 'r1_gate', node: 'r1_gate', x: 2, z: -8, r: 3.5, if: 'king_done', label: '성문 경비병에게 말한다' },
      { id: 'r1_road', node: 'r1_road', x: 0, z: -12, r: 2, auto: true, if: 'gate_open' },
      { id: 'r1_traveler', node: 'r1_traveler', x: 2, z: -20, r: 3.5, if: 'won:road', ends: true, label: '모닥불 곁의 여행자에게 말을 건다' },
    ],
  },

  4: {
    name: '검은 숲길',
    light: 'day',
    bounds: { minX: -11, maxX: 11, minZ: -17, maxZ: 16 },
    start: { x: 0, z: 15, dir: 'up' },
    herbs: [{ id: 'r4_herb', x: -7, z: -1 }],       // 서쪽 빈터에서 무너진 길로 가는 오솔길
    map: [
      'DPPPPTPTDDPPPPDTDDTPDPT',
      'D....P.PPP....=s=TP.D.D',
      'DTTPD.T...PDTT===T.DDTT',
      'PPP.TTPTPP..........DTD',
      '...TPP.P..P.........DTD',
      'PPDD..D.DD........x.PPT',
      '..TTPPPTPPP.x.........T',
      'TPTD...D............TDP',
      'D.TTTP....P.........TP.',
      'TPTDP...............T.T',
      'P.PT.D....TTTT===DDTPPP',
      '.T.D======T======DPT...',
      'PPDP=========x===T.PPTT',
      '..D.======D======TP..TP',
      'PPPT===TTTTTPPTDPT.PPP.',
      '...P===PPTTT..DD.TT...D',
      'DPD.===..PPTPTPPTTDTPPD',
      'P.TD===xD..P.P..PPTP..P',
      '.PPP===TxDP.P.PT..P.PT.',
      'T...===PPP.P.P.PPD.P.TP',
      'TPPP===...T.T.T..TT.PP.',
      'P...=========PPTTTPT..D',
      '.DPP=x=======..TPP.PDPT',
      'TT..=========TTD..D.P.T',
      'PPDTTTPPPT===........PT',
      '..DDPP...P===.......P.P',
      'TTPT..TTT.===...x....T.',
      'DP.PTTPTPD===.......DTT',
      'P.D.DD.T.P===.......TTT',
      '.PPPTPPPT.===.......PPT',
      'D...P...PT===.........D',
      'PDPP.PDP.P===DPTPxPTTTD',
      '.P..P.T.D.===P.T.P.TTTP',
      'D.DT.TTDTT===.TTT.DTDD.',
    ],
    actors: [
      { m: 'refugee', x: 5, z: 10 },                  // 피난 가는 모녀
      { m: 'child', x: 6, z: 10 },
    ],
    triggers: [
      { id: 'r4_arrive', node: 'r4_arrive', x: 0, z: 15, r: 2, auto: true },
      { id: 'r4_family', node: 'r4_family', x: 5, z: 10, r: 3, label: '피난 가는 모녀에게 말을 건다' },
      { id: 'r4_ambush', node: 'r4_ambush', x: 4, z: -7, r: 2, auto: true },   // 공터로 들어가는 좁은 길목
      { id: 'r4_sign', node: 'r4_sign', x: 4, z: -16, r: 2, if: 'won:forest', ends: true, label: '표지판을 읽는다' },
    ],
    // 퍼즐 ②: 무너진 길의 구덩이 둘을 북쪽 빈터의 바위로 메운다
    puzzle: {
      id: 'r4_pit',
      boulders: [[-3, -8], [-4, -7], [-2, -7]], pits: [[-1, -5], [0, -5]], reset: [-5, -7],   // 한 칸 폭 길에 나란히: 하나만 메워서는 못 건넌다
      say: 'r4_pit_done',
    },
  },

  5: {
    name: '버려진 마을',
    light: 'dusk',
    bounds: { minX: -13, maxX: 13, minZ: -13, maxZ: 13 },
    start: { x: 0, z: 12, dir: 'up' },
    herbs: [{ id: 'r5_herb', x: -11, z: -5 }],      // 우물 광장 서쪽
    map: [
      'TTTTT=TTTTTTTTTTTTTTTTTTTTT',
      'TD..===............,......T',
      'T...===......,.........D..T',
      'T.,.===..B.....R..,.......T',
      'TD..===............D......T',
      'T...===.......D......,....T',
      'T...===...Dx..,....H...,..T',
      'T..,===.._________f....,..T',
      'T....====_________f......,T',
      'T.,..====____w____f.......T',
      'T..,.====_________f.......T',
      'T..,.,..._______x_f....,..T',
      'Tfffffffffff===fffffffffffT',
      'T...........===......P....T',
      'T.H...P.....===...P.......T',
      'T,.......,..===.....R....,T',
      'T.........,.===.,........PT',
      'T....u.....,===...........T',
      'T,..........===.....,...P.T',
      'T...........===.vV........T',
      'TPB...,.....===...........T',
      'T.....qq....===.....H.....T',
      'T.........x.===...........T',
      'T.,....q.,..===.,.......,.T',
      'T,..........===..x........T',
      'T...........===........D,.T',
      'TTTTTTTTTTTTTTTTTTTTTTTTTTT',
    ],
    // 우물 광장 길목 문: 순서 돌을 다 밟으면 열린다
    blockers: [
      { x: -1, z: -1, if: '!solved:r5_steps', art: ['town', 81] },
      { x: 0, z: -1, if: '!solved:r5_steps', art: ['town', 81] },
      { x: 1, z: -1, if: '!solved:r5_steps', art: ['town', 81] },
    ],
    actors: [{ m: 'elder', x: -5, z: 5 }],           // 무덤 곁에 홀로 남은 노파
    triggers: [
      { id: 'r5_arrive', node: 'r5_arrive', x: 0, z: 12, r: 2, auto: true },
      { id: 'r5_elder', node: 'r5_elder', x: -5, z: 5, r: 3, label: '노파에게 말을 건다' },
      { id: 'r5_well', node: 'r5_well', x: 0, z: -3, r: 2, auto: true, if: 'solved:r5_steps' },   // 광장 안: 문이 열린 뒤에만
      { id: 'r5_grave', node: 'r5_grave', x: -6, z: 10, r: 2, label: '비석을 읽는다' },
      { id: 'r5_leave', node: 'r5_leave', x: -8, z: -12, r: 1.5, auto: true, if: 'won:village', ends: true },
    ],
    // 퍼즐 ③: 해바라기 → 빈 여물통 → 무덤 앞 돌판을 차례로 밟는다(노파·비석이 귀띔)
    puzzle: { id: 'r5_steps', steps: [[-8, 5], [3, 7], [-7, 9]], say: 'r5_steps_open' },
  },

  2: {
    name: '멈춘 계절의 골짜기',
    light: { 1: 'dusk', 2: 'day', 3: 'night' },
    bounds: { minX: -15, maxX: 15, minZ: -15, maxZ: 15 },
    start: { x: 0, z: 3, dir: 'up' },   // 경보(r2_alarm, 입구 z 10)와 떨어뜨린다 — 이어하기가 여기서 시작한다
    herbs: [{ id: 'r2_herb', x: -6, z: -2 }],       // 개울 북쪽 둑
    map: [
      'MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
      'MQQYQQQ.*Y,YYQK..YYQY*Y*.YY*YQM',
      'M..Q.............QQ.QQ.QQQQQ*.M',
      'MYQ.Q,*.*.*..Q.....Y..Y.....YYM',
      'MQ.Y.QQ....*........Y*QY.YQ,QYM',
      'M.YY....**....===.k.*Y.Q,Q...QM',
      'MW~~~~~.......===...QQQ.Q..QQ.M',
      'MW~~~~~...QQQ.===.Y....Y.QY..QM',
      'MW~~~~~.......===.QQY.YYQ.QQQ.M',
      'MW~~~~~.......===Y..QQ**.Y...QM',
      'MW~~~~~...,*Q*===QQ,..YQQ*.YQ.M',
      'MW~~~~~...QY.Q===..QQYQ..YQQ..M',
      'MW~~~~~....YY.===YY..*......,QM',
      'M,,Y*Y....Y...===.......o.Y.Y.M',
      'M~~~~~~~~~~~~~~~~~~~~~~~~~~~~~M',
      'M~~~~~~~~~~~~~~~~~~~~~~~~~~~~~M',
      'M~~~~~~~~~~~~~~~~~~~~~~~~~~~~~M',
      'M,Q.Q.QQ,QY...===...Q.QYQYYYQQM',
      'MQ.Q.Q..Y.....===......Y.QQQ..M',
      'M.Y.Q.........===...........QYM',
      'MYYY.Y........===........Y,Q.YM',
      'MQYQYQ........===........QQ.Q,M',
      'M.Q.Q.........===..........Q.,M',
      'M,.Q.Q........===........QY.QYM',
      'MYY.Y.........===.........YY.,M',
      'MYYQYY........===........YQQ,YM',
      'M,Q.QQ........===........Q..QQM',
      'MQ.Q..........===.........YY..M',
      'M.,.YQ........===........YQYQYM',
      'MYYYY.........===........Y.Y.,M',
      'MMMMMMMMMMMMMM===MMMMMMMMMMMMMM',
    ],
    actors: [
      { m: 'aion', x: 0, z: -9, day: 1 },
      { m: 'aion', x: -7, z: -6, day: 2 },
      { m: 'aion', x: 0, z: -9, day: 3 },
    ],
    triggers: [
      { id: 'r2_arrive', node: 'r2_arrive', x: 0, z: 3, r: 3, auto: true, day: 1 },
      { id: 'r2_meet', node: 'r2_meet', x: 0, z: -9, r: 3, day: 1, ends: true, label: '탑 앞의 여인에게 말을 건다' },
      { id: 'r2_d2_talk', node: 'r2_d2_talk', x: -7, z: -6, r: 3, day: 2, label: '마술사에게 말을 건다' },
      { id: 'r2_mem_falls', node: 'r2_mem_falls', x: -9, z: -5, r: 3, day: 2, if: 'done:r2_d2_talk', label: '멈춘 폭포 아래를 걷는다' },
      { id: 'r2_mem_ring', node: 'r2_mem_ring', x: 9, z: -2, r: 3, day: 2, if: 'soldiers', label: '바위에 앉아 쉰다' },
      // 경보: 개울 북쪽의 필드 전투(마술사와 이야기한 뒤 나온다)를 이겨야 — 이어하기로 남쪽에서 시작해도 건너뛰지 못하게
      { id: 'r2_alarm', node: 'r2_alarm', x: 0, z: 10, r: 4, day: 2, if: 'won:valley_field', auto: true, ends: true },
      { id: 'r2_mem_stars', node: 'r2_mem_stars', x: -6, z: -11, r: 3, day: 3, label: '풀밭에 누워 별을 본다' },
      { id: 'r2_mem_clock', node: 'r2_mem_clock', x: 3, z: -10, r: 2.5, day: 3, label: '멈춘 괘종시계를 살핀다' },
      { id: 'r2_d3_night', node: 'r2_d3_night', x: 0, z: -9, r: 3, day: 3, ends: true, label: '마술사에게 말을 건다' },
    ],
    // 퍼즐 ④: 시계 돌로 시간을 흘려 개울 위 낙엽 셋이 큰길에 한 줄로 설 때 멈춘다
    puzzle: {
      id: 'r2_stream', clock: [2, 3],
      rafts: [
        { path: drift(-1), start: 0, goal: [0, -1] },
        { path: drift(0), start: 6, goal: [0, 0] },
        { path: drift(1), start: 0, goal: [0, 1] },
      ],
      say: 'r2_stream_done',
    },
  },

  3: {
    name: '새벽의 다리',
    light: 'dawn',
    bounds: { minX: -9, maxX: 9, minZ: -26, maxZ: 9 },
    start: { x: 0, z: 4, dir: 'up' },
    map: [
      'T.....C...........T',
      'T.................T',
      'T....*..===.....,.T',
      'T...*,..===.......T',
      'T...*...===.....*.T',
      'T..*,...===.T,....T',
      'T.T.....===.,..T..T',
      'T..P....===.,.....T',
      'T.*.....===.....T.T',
      'T....P..===......,T',
      'T.......===...,.P,T',
      'T.P..,..===...*,.,T',
      'T.......===.......T',
      'T,...P..===.......T',
      'T.*.....===..,T.PPT',
      'T..*....===.......T',
      'T.......===.......T',
      'T.......===.......T',
      'T.......===.......T',
      'T.......===.T...P.T',
      'T,......===..TT...T',
      'T..P,...===.,,....T',
      'T.......===...,.P.T',
      'TP,.....===.,.....T',
      'T...*.*.===..P....T',
      'T.......===.......T',
      'T.......===...T...T',
      'T.......===.*.....T',
      'TP......===......TT',
      'T.,..P..===.,.*,*.T',
      'T.......===.......T',
      'T.......===.......T',
      '~~~~~~~~+++~~~~~~~~',
      '~~~~~~~~+++~~~~~~~~',
      '~~~~~~~~+++~~~~~~~~',
      '~~~~~~~~+++~~~~~~~~',
    ],
    actors: [{ m: 'aion', x: 1, z: 7, if: 'done:r3_arrive' }],
    triggers: [
      { id: 'r3_arrive', node: 'r3_arrive', x: 0, z: 4, r: 2.5, auto: true },
      { id: 'r3_bridge', node: 'r3_bridge', x: 1, z: 7, r: 3, if: 'done:r3_arrive', ends: true, label: '그녀에게 다가간다' },
    ],
  },
};

// 적: [x, z, 종류]. 종류는 걸음꾼(없으면)·투척꾼(thrower)·돌진꾼(charger) — src/combat.js.
// field가 있으면 필드 전투: 적이 맵에 서 있고, 아코스가 원(field) 안에 들어오면 그 자리에서 시작한다. 다음 이야기로 가는 길목에 둔다.
export const FIGHTS = {
  road_field: { region: 1, if: 'won:road', field: { x: 2, z: -20, r: 3 }, enemies: [[-1, -19], [5, -19], [6, -16, 'thrower']], then: 'r1_field_after' },   // 나그네를 에워싼 무리
  forest_field: { region: 4, field: { x: -3, z: 5, r: 2.5 }, enemies: [[-7, 4, 'charger'], [-7, 6, 'charger']], then: 'r4_field_after' },   // 서쪽 빈터의 짐승
  village_field: {
    region: 5, if: 'won:village', field: { x: -8, z: -11, r: 3 },              // 마을을 나가는 길목
    enemies: [[-11, -11, 'thrower'], [-5, -11, 'thrower'], [-9, -9], [-7, -9]], then: 'r5_field_after',
  },
  valley_field: {
    region: 2, day: 2, if: 'done:r2_d2_talk', field: { x: 0, z: -3, r: 2.5 },  // 마술사와 이야기한 뒤, 개울을 건너 남쪽(경보)으로 가는 길
    enemies: [[-4, -2, 'charger'], [2, -2], [6, -2, 'thrower']], then: 'r2_field_after',
  },
  road: { region: 1, enemies: [[-3, -17], [3, -18]], player: [0, -12, 'up'], then: 'r1_road_after' },
  forest: { region: 4, enemies: [[1, -13], [7, -13], [4, -14]], player: [4, -9, 'up'], then: 'r4_ambush_after' },
  village: { region: 5, enemies: [[-3, -5], [3, -5], [-2, -6], [2, -6]], player: [0, -1, 'up'], then: 'r5_well_after' },
  valley: { region: 2, enemies: [[-5, 12, 'charger'], [0, 14, 'thrower'], [5, 12]], player: [0, 5, 'down'], then: 'r2_valley_after' },
  freeze: {
    region: 2, enemies: [[-8, 10], [-4, 13], [0, 8], [4, 12], [8, 9], [0, 14]],
    frozen: true, enemyHp: 1, timeLimit: 25, player: [0, 4, 'down'], then: 'r2_freeze_after',
  },
};
