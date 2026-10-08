// 인물·적 그림(Tiny Dungeon 칸 번호)과 덧칠 색. 아코스·아이온 그림을 바꿀 때는 여기만 고친다.
export const SPRITES = {
  achos: { art: ['dungeon', 96] },                       // 기사
  aion: { art: ['dungeon', 99] },                        // 여인
  soldier: { art: ['dungeon', 87] },                     // 뿔 투구 병사(아코스와 헷갈리지 않게)
  prince: { art: ['dungeon', 98] },
  king: { art: ['dungeon', 111], tint: '#d8b45a' },      // 금빛
  guard: { art: ['dungeon', 87] },
  traveler: { art: ['dungeon', 112] },
  plague: { art: ['dungeon', 85], tint: '#1a1814' },     // 역병에 먹힌 사람: 검게 굳었다
};
