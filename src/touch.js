// 터치 조작: 화면 왼쪽 절반의 떠다니는 조이스틱과 전투 버튼(베기·피하기).
// 보이고 숨는 것은 CSS(body.touch[data-mode])가 정한다. three를 쓰지 않는다.
const R = 48;   // 조이스틱 반지름(px)

export function createTouchControls({ onStick, onAttack, onDodge }) {
  const $ = id => document.getElementById(id);
  const zone = $('stick-zone'), base = $('stick'), knob = $('stick-knob');
  let active = null, cx = 0, cy = 0;

  function release() {
    active = null;
    base.classList.remove('on');
    base.style.left = base.style.top = '';   // CSS 기본 자리(왼쪽 아래)로 돌아간다
    knob.style.transform = '';
    onStick(null);
  }

  // 손가락을 댄 곳이 중심이 된다. 새 손가락이 닿으면 그 손가락이 이어받는다.
  zone.addEventListener('pointerdown', e => {
    active = e.pointerId;
    cx = e.clientX;
    cy = e.clientY;
    zone.setPointerCapture(e.pointerId);
    base.classList.add('on');
    base.style.left = `${cx - R}px`;
    base.style.top = `${cy - R}px`;
    knob.style.transform = '';
    onStick({ f: 0, r: 0 });
  });
  zone.addEventListener('pointermove', e => {
    if (e.pointerId !== active) return;
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const len = Math.hypot(dx, dy);
    if (len > R) { dx *= R / len; dy *= R / len; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    onStick({ f: -dy / R, r: dx / R });
  });
  // 손 떼기는 창 전체에서 듣는다. 대화가 열려 조이스틱이 숨은 사이에 손을 떼도 놓친다.
  for (const type of ['pointerup', 'pointercancel']) {
    addEventListener(type, e => { if (e.pointerId === active) release(); });
  }

  for (const [id, fn] of [['btn-attack', onAttack], ['btn-dodge', onDodge]]) {
    $(id).addEventListener('pointerdown', e => {
      e.preventDefault();   // 누르는 순간 동작하고, 뒤따르는 클릭·확대를 막는다
      fn();
    });
  }
}
