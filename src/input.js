// 키보드·터치 입력을 모은다. 방향은 조이스틱이 먼저, 없으면 마지막에 누른 방향키. X를 누르고 있으면 달리기.
// 누르는 순간(Z·X·방향)은 onPress로 한 번 알린다 — 대사 넘기기, 선택지 고르기, 베기·피하기에 쓴다.
// Z·X를 떼는 순간은 onRelease로 알린다 — 성휘참은 Z를 누르고 있던 시간으로 정한다.
import { DEADZONE } from './geom.js';

const ARROWS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
const BUTTONS = { KeyZ: 'z', KeyX: 'x' };

// 조이스틱 기울기 → 4방향(더 많이 기운 축 하나)
export function stickDir(a) {
  if (!a || Math.hypot(a.f, a.r) < DEADZONE) return null;
  if (Math.abs(a.f) >= Math.abs(a.r)) return a.f > 0 ? 'up' : 'down';
  return a.r > 0 ? 'right' : 'left';
}

export function createInput({ onPress, onRelease = () => {} }) {
  const arrows = [], held = { z: false, x: false };
  let stick = null;
  addEventListener('keydown', e => {
    const dir = ARROWS[e.code], btn = BUTTONS[e.code];
    if (!dir && !btn) return;
    e.preventDefault();   // 방향키로 화면이 스크롤되지 않게
    if (dir && !arrows.includes(dir)) arrows.push(dir);
    if (btn) held[btn] = true;
    if (!e.repeat) onPress(dir ?? btn);
  });
  addEventListener('keyup', e => {
    const dir = ARROWS[e.code], btn = BUTTONS[e.code];
    if (dir && arrows.includes(dir)) arrows.splice(arrows.indexOf(dir), 1);
    if (btn && held[btn]) onRelease(btn);
    if (btn) held[btn] = false;
  });
  // 대화가 열리거나 창이 포커스를 잃으면 눌려 있던 것을 모두 놓는다
  const clear = () => {
    arrows.length = 0;
    stick = null;
    held.z = held.x = false;
  };
  addEventListener('blur', clear);
  return {
    state: () => ({ dir: stickDir(stick) ?? arrows.at(-1) ?? null, run: held.x }),
    setStick(a) {
      const before = stickDir(stick), now = stickDir(a);
      stick = a;
      if (now && now !== before) onPress(now);
    },
    button(b, down) {
      if (down && !held[b]) onPress(b);
      if (!down && held[b]) onRelease(b);
      held[b] = down;
    },
    clear,
  };
}
