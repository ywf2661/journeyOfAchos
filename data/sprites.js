// 인물·적 그림과 덧칠 색. 작은 인물은 Kenney Tiny Dungeon 칸 하나(art), 아코스·아이온은 큰 스프라이트 시트(sheet).
export const SPRITES = {
  // 큰 스프라이트: 시트의 프레임 번호(방향별). side는 오른쪽을 보는 그림이고 왼쪽은 뒤집어 그린다(src/anim.js).
  achos: {
    sheet: 'achos', foot: [20, 31],                     // 칸(40×32) 안의 발 위치
    idle: { down: 0, side: 1, up: 2 },
    walk: { down: [3, 4, 5], side: [6, 7, 8], up: [9, 10, 11] },   // 왼발·가운데·오른발
    slash: { down: [12, 13], side: [14, 15], up: [16, 17] },        // 들어 올리기·휘두르기
  },
  aion: { sheet: 'aion', foot: [20, 31], idle: { down: 0, side: 1, up: 2 }, cast: 3 },   // cast: 주문 자세(아직 안 씀)
  soldier: { art: ['dungeon', 87] },                     // 뿔 투구 병사(아코스와 헷갈리지 않게)
  prince: { art: ['dungeon', 98] },
  king: { art: ['dungeon', 111], tint: '#d8b45a' },      // 금빛
  guard: { art: ['dungeon', 87] },
  traveler: { art: ['dungeon', 112] },
  plague: { art: ['dungeon', 85], tint: '#1a1814' },     // 역병에 먹힌 사람: 검게 굳었다
  refugee: { art: ['dungeon', 88] },                     // 검은 숲길: 피난 가는 어머니
  child: { art: ['dungeon', 98] },
  elder: { art: ['dungeon', 100] },                      // 버려진 마을: 홀로 남은 노파
};
