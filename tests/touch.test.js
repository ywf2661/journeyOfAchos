import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTouchControls } from '../src/touch.js';

// touch.js가 쓰는 DOM만 흉내 낸다: 요소의 처리기·style·classList, 창 전체 처리기
const winHandlers = {};
globalThis.addEventListener = (type, fn) => (winHandlers[type] ??= []).push(fn);
function element() {
  const classes = new Set();
  return {
    h: {}, style: {}, classes,
    classList: { add: c => classes.add(c), remove: c => classes.delete(c) },
    addEventListener(type, fn) { this.h[type] = fn; },
    setPointerCapture() {},
  };
}
const els = { 'stick-zone': element(), stick: element(), 'stick-knob': element(), 'btn-z': element(), 'btn-x': element() };
globalThis.document = { getElementById: id => els[id] };

const calls = { stick: [], buttons: [] };
createTouchControls({
  onStick: axes => calls.stick.push(axes),
  onButton: (b, down) => calls.buttons.push([b, down]),
});

const zone = els['stick-zone'].h;
const down = (id, x, y) => zone.pointerdown({ pointerId: id, clientX: x, clientY: y });
const move = (id, x, y) => zone.pointermove({ pointerId: id, clientX: x, clientY: y });
const up = id => winHandlers.pointerup.forEach(fn => fn({ pointerId: id }));
const last = () => calls.stick.at(-1);

test('손가락을 댄 곳이 중심이고, 위로 끌면 앞(f+), 오른쪽으로 끌면 r+', () => {
  down(1, 100, 300);
  assert.deepEqual(last(), { f: 0, r: 0 });
  move(1, 124, 276);
  assert.deepEqual(last(), { f: 0.5, r: 0.5 });
  up(1);
  assert.equal(last(), null);
});

test('반지름(48px)보다 멀리 끌어도 기울기 길이는 1이다', () => {
  down(1, 100, 300);
  move(1, 100, 100);
  assert.deepEqual(last(), { f: 1, r: 0 });
  up(1);
});

test('조이스틱을 쓰는 동안 다른 손가락은 무시한다(손바닥이 닿아도 엄지가 계속 조작)', () => {
  down(1, 100, 300);
  const count = calls.stick.length;
  move(2, 300, 300);
  down(3, 50, 200);
  move(3, 50, 152);
  up(3);
  assert.equal(calls.stick.length, count);
  move(1, 100, 252);
  assert.deepEqual(last(), { f: 1, r: 0 });
  up(1);
  assert.equal(last(), null);
});

test('포인터 캡처를 잃으면 조이스틱을 놓는다(다음 손가락이 다시 잡을 수 있다)', () => {
  down(1, 100, 300);
  els['stick-zone'].h.lostpointercapture({ pointerId: 1 });
  assert.equal(last(), null);
  down(2, 100, 300);
  assert.deepEqual(last(), { f: 0, r: 0 });
  up(2);
});

test('손을 떼면 조이스틱이 기본 자리로 돌아간다', () => {
  down(1, 100, 300);
  assert.ok(els.stick.classes.has('on'));
  assert.equal(els.stick.style.left, '52px');
  up(1);
  assert.ok(!els.stick.classes.has('on'));
  assert.equal(els.stick.style.left, '');
  assert.equal(els['stick-knob'].style.transform, '');
});

test('Z·X 버튼은 누를 때와 뗄 때를 알린다(길게 누르기)', () => {
  els['btn-z'].h.pointerdown({ preventDefault() {}, pointerId: 5 });
  els['btn-z'].h.pointerup({ pointerId: 5 });
  els['btn-x'].h.pointerdown({ preventDefault() {}, pointerId: 6 });
  els['btn-x'].h.pointercancel({ pointerId: 6 });
  assert.deepEqual(calls.buttons, [['z', true], ['z', false], ['x', true], ['x', false]]);
});
