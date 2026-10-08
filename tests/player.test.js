import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer } from '../src/player.js';

// player.js는 three를 import하지 않는다. 화면 객체 대신 필요한 메서드만 가진 가짜를 넘기고,
// window·canvas 이벤트는 등록된 처리기를 직접 불러 흉내 낸다.
const winHandlers = {};
globalThis.addEventListener = (type, fn) => (winHandlers[type] ??= []).push(fn);
const key = (type, code) => winHandlers[type]?.forEach(fn => fn({ code }));
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≈ ${b}`);
const BOUNDS = { minX: -100, maxX: 100, minZ: -100, maxZ: 100 };

function setup() {
  const plays = [], canvasHandlers = {};
  const camera = { at: null, position: { set: (...xyz) => { camera.at = xyz; } }, lookAt() {} };
  const p = createPlayer(
    { position: { set() {} }, rotation: {} },
    { busy: () => false, play: name => plays.push(name) },
    camera,
    { addEventListener: (type, fn) => { canvasHandlers[type] = fn; }, setPointerCapture() {} },
  );
  const pointer = (type, e) => canvasHandlers[type]({ buttons: 1, clientY: 100, ...e });
  p.teleport(0, 0, Math.PI);   // -z를 바라보고, 카메라는 +z 뒤에 있다(앞 = -z)
  return { p, plays, camera, pointer };
}

test('키보드 W는 앞으로 걷고, Shift를 함께 누르면 달린다', () => {
  const { p } = setup();
  key('keydown', 'KeyW');
  p.update(0.1, [], BOUNDS);
  near(p.state.z, -0.42);
  key('keydown', 'ShiftLeft');
  p.update(0.1, [], BOUNDS);
  near(p.state.z, -1.17);
  key('keyup', 'KeyW');
  key('keyup', 'ShiftLeft');
  p.update(0.1, [], BOUNDS);
  assert.equal(p.state.moving, false);
});

test('엔딩 자동 걷기는 지역 경계에서 멈추고, 멈추면 선다', () => {
  const { p, plays } = setup();
  const bounds = { minX: -14, maxX: 14, minZ: -90, maxZ: 18 };
  p.teleport(0, 10, Math.PI);
  p.state.auto = true;
  p.update(0.1, [], bounds);
  assert.equal(p.state.moving, true);
  assert.equal(plays.at(-1), 'Walking_A');
  for (let i = 0; i < 2000; i++) p.update(0.1, [], bounds);   // 200초: 1.3/초로 걸으면 경계를 훨씬 지난다
  assert.equal(p.state.z, -90);
  assert.equal(p.state.moving, false);
  assert.equal(plays.at(-1), 'Idle');
});

test('조이스틱을 조금 기울이면 걷고, 끝까지 기울이면 달린다', () => {
  const { p } = setup();
  p.setStick({ f: 0.5, r: 0 });
  p.update(0.1, [], BOUNDS);
  near(p.state.z, -0.42);
  p.setStick({ f: 1, r: 0 });
  p.update(0.1, [], BOUNDS);
  near(p.state.z, -1.17);
});

test('조이스틱이 데드존 안이거나 놓이면 멈춘다', () => {
  const { p } = setup();
  p.setStick({ f: 0.1, r: 0 });
  p.update(0.1, [], BOUNDS);
  assert.equal(p.state.moving, false);
  p.setStick(null);
  p.update(0.1, [], BOUNDS);
  assert.equal(p.state.moving, false);
  assert.equal(p.state.z, 0);
});

test('조이스틱이 키보드보다 먼저다', () => {
  const { p } = setup();
  key('keydown', 'KeyW');
  p.setStick({ f: -0.5, r: 0 });
  p.update(0.1, [], BOUNDS);
  near(p.state.z, 0.42);
  key('keyup', 'KeyW');
});

test('clearKeys(대화가 열릴 때)는 조이스틱도 놓는다', () => {
  const { p } = setup();
  p.setStick({ f: 0.5, r: 0 });
  p.clearKeys();
  p.update(0.1, [], BOUNDS);
  assert.equal(p.state.moving, false);
});

test('다른 손가락의 움직임은 시야 드래그에 끼어들지 않는다', () => {
  const { p, camera, pointer } = setup();
  const before = [...camera.at];
  pointer('pointerdown', { pointerId: 1, clientX: 100 });
  pointer('pointermove', { pointerId: 2, clientX: 400 });
  p.update(0.1, [], BOUNDS);
  assert.deepEqual(camera.at, before);
  pointer('pointermove', { pointerId: 1, clientX: 200 });
  p.update(0.1, [], BOUNDS);
  assert.notDeepEqual(camera.at, before);
});

test('버튼을 뗀 채 들어온 움직임은 드래그를 끝낸다', () => {
  const { p, camera, pointer } = setup();
  const before = [...camera.at];
  pointer('pointerdown', { pointerId: 1, clientX: 100 });
  pointer('pointermove', { pointerId: 1, clientX: 300, buttons: 0 });
  pointer('pointermove', { pointerId: 1, clientX: 500 });
  p.update(0.1, [], BOUNDS);
  assert.deepEqual(camera.at, before);
});

test('짧은 탭은 클릭으로 처리하고, 다른 손가락의 손 떼기는 무시한다', () => {
  const { p, pointer } = setup();
  let clicks = 0;
  p.onClick = () => { clicks += 1; };
  pointer('pointerdown', { pointerId: 1, clientX: 100 });
  pointer('pointerup', { pointerId: 2, clientX: 100 });
  assert.equal(clicks, 0);
  pointer('pointerup', { pointerId: 1, clientX: 100 });
  assert.equal(clicks, 1);
});
