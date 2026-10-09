// 큰 스프라이트(아코스·아이온)의 프레임 고르기. 순수 함수(DOM 없음).
// 프레임 번호는 data/sprites.js에 방향별(down·side·up)로 있다. side는 오른쪽을 보는 그림이라 왼쪽은 뒤집는다.
export const SLASH_TIME = 0.25;                      // 베기 한 번이 보이는 시간(초): 앞 절반 들어 올리기, 뒤 절반 휘두르기
const WALK_FPS = 8, WALK_CYCLE = [0, 1, 2, 1];       // 왼발·가운데·오른발·가운데

// slash: 베기가 끝날 때까지 남은 시간(0이면 베는 중이 아님), t: 걷기 박자를 맞출 게임 시간
export function frameOf(sprite, { dir, moving = false, slash = 0, t = 0 }) {
  const flip = dir === 'left';
  const side = dir === 'left' || dir === 'right' ? 'side' : dir;
  if (slash > 0 && sprite.slash) return { index: sprite.slash[side][slash > SLASH_TIME / 2 ? 0 : 1], flip };
  if (moving && sprite.walk) return { index: sprite.walk[side][WALK_CYCLE[Math.floor(t * WALK_FPS) % WALK_CYCLE.length]], flip };
  return { index: sprite.idle[side], flip };
}
