// 터치 조작: 화면 왼쪽 절반의 떠다니는 조이스틱과 오른쪽 아래 Z·X 버튼.
// 보이고 숨는 것은 CSS(body.touch[data-mode])가 정한다.
const R = 48;   // 조이스틱 반지름(px)

export function createTouchControls({ onStick, onButton }) {
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

  // 손가락을 댄 곳이 중심이 된다. 조이스틱을 쓰는 동안 다른 손가락(손바닥 끝 등)은 무시한다.
  zone.addEventListener('pointerdown', e => {
    if (active !== null) return;
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
  // 캡처를 잃으면(손 떼기를 못 받는 경우 대비) 놓아서, 다음 손가락이 다시 잡을 수 있게 한다.
  zone.addEventListener('lostpointercapture', e => { if (e.pointerId === active) release(); });

  // Z·X는 누를 때와 뗄 때를 알린다(X를 누르고 있으면 달리기)
  for (const [id, name] of [['btn-z', 'z'], ['btn-x', 'x']]) {
    const el = $(id);
    el.addEventListener('pointerdown', e => {
      e.preventDefault();   // 누르는 순간 동작하고, 뒤따르는 클릭·확대를 막는다
      el.setPointerCapture(e.pointerId);
      onButton(name, true);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) el.addEventListener(type, () => onButton(name, false));
  }
}
