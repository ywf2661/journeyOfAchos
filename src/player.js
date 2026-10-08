// 3인칭 조작: WASD(방향키) 이동, Shift 달리기, 마우스 드래그로 시야 회전, 짧은 클릭 콜백, 회피 대시.
// 키는 e.code로 읽는다. 한글 입력 상태에서도 같은 자리의 키가 같은 뜻이 된다.
import { moveVector, facingOf, resolve, dist } from './geom.js';

const WALK = 4.2, RUN = 7.5, DASH = 13, DASH_TIME = 0.25, AUTO_WALK = 1.3, RADIUS = 0.6, CAM_DIST = 9;
const CODES = {
  KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd',
  ArrowUp: 'w', ArrowLeft: 'a', ArrowDown: 's', ArrowRight: 'd',
  ShiftLeft: 'shift', ShiftRight: 'shift',
};

export function createPlayer(obj, anim, camera, canvas) {
  const keys = {};
  const st = { x: 0, z: 0, facing: 0, auto: false, moving: false };
  let yaw = 0, pitch = 0.32, dash = 0, dashDir = null, drag = null, onClick = () => {};

  const keyAxes = () => ({ f: (keys.w ? 1 : 0) - (keys.s ? 1 : 0), r: (keys.d ? 1 : 0) - (keys.a ? 1 : 0) });
  const clearKeys = () => { for (const k in keys) keys[k] = false; };
  addEventListener('keydown', e => { if (CODES[e.code]) keys[CODES[e.code]] = true; });
  addEventListener('keyup', e => { if (CODES[e.code]) keys[CODES[e.code]] = false; });
  addEventListener('blur', clearKeys);
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('pointerdown', e => {
    drag = { x: e.clientX, y: e.clientY, moved: 0 };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    drag.x = e.clientX;
    drag.y = e.clientY;
    yaw -= dx * 0.005;
    pitch = Math.min(1.2, Math.max(0.05, pitch + dy * 0.004));
  });
  canvas.addEventListener('pointerup', () => {
    if (drag && drag.moved < 6) onClick();
    drag = null;
  });

  function update(dt, obstacles, bounds) {
    let v = null, speed = keys.shift ? RUN : WALK;
    if (st.auto) { v = { x: Math.sin(st.facing), z: Math.cos(st.facing) }; speed = AUTO_WALK; }
    else if (dash > 0) { dash -= dt; v = dashDir; speed = DASH; }
    else v = moveVector(keyAxes(), yaw);
    if (v) {
      const next = { x: st.x + v.x * speed * dt, z: st.z + v.z * speed * dt };
      // 엔딩 자동 걷기는 소품을 무시하지만 지역 경계에서는 멈춘다. 더 못 가면 선다.
      const p = resolve(next, RADIUS, st.auto ? [] : obstacles, bounds);
      if (st.auto && dist(p, st) < 1e-6) v = null;
      Object.assign(st, p);
      if (v && !st.auto && dash <= 0) st.facing = facingOf(v);
    }
    st.moving = !!v;
    if (!anim.busy()) anim.play(!v ? 'Idle' : speed === RUN ? 'Running_A' : 'Walking_A');
    sync();
  }

  // 모델과 카메라를 지금 상태에 맞춘다. 순간이동 직후(로딩·페이드 중엔 update가 안 돈다)에도 부른다.
  function sync() {
    obj.position.set(st.x, 0, st.z);
    obj.rotation.y = st.facing;
    camera.position.set(
      st.x + Math.sin(yaw) * Math.cos(pitch) * CAM_DIST,
      1.5 + Math.sin(pitch) * CAM_DIST,
      st.z + Math.cos(yaw) * Math.cos(pitch) * CAM_DIST,
    );
    camera.lookAt(st.x, 1.6, st.z);
  }

  return {
    state: st,
    update,
    clearKeys,
    teleport(x, z, facing) {
      Object.assign(st, { x, z, facing });
      yaw = facing + Math.PI;
      sync();
    },
    dash() {
      dash = DASH_TIME;
      dashDir = moveVector(keyAxes(), yaw) ?? { x: Math.sin(st.facing), z: Math.cos(st.facing) };
      anim.play('Dodge_Forward', { once: true });
    },
    set onClick(fn) { onClick = fn; },
  };
}
