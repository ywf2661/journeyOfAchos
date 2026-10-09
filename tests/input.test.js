import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInput, stickDir } from '../src/input.js';

// input.js가 쓰는 창 이벤트만 흉내 낸다
const win = {};
globalThis.addEventListener = (type, fn) => (win[type] ??= []).push(fn);
const key = (type, code, extra = {}) => win[type].forEach(fn => fn({ code, preventDefault() {}, ...extra }));
const pressed = [], released = [];
const input = createInput({ onPress: b => pressed.push(b), onRelease: b => released.push(b) });

test('stickDir: 더 많이 기운 축 하나로 4방향, 데드존 안이면 null', () => {
  assert.equal(stickDir({ f: 0.9, r: 0.3 }), 'up');
  assert.equal(stickDir({ f: -0.8, r: 0.3 }), 'down');
  assert.equal(stickDir({ f: -0.2, r: -0.7 }), 'left');
  assert.equal(stickDir({ f: 0.05, r: 0.05 }), null);
  assert.equal(stickDir(null), null);
});

test('방향은 마지막에 누른 방향키, 떼면 그 전에 누르고 있던 것', () => {
  key('keydown', 'ArrowUp');
  key('keydown', 'ArrowLeft');
  assert.equal(input.state().dir, 'left');
  key('keyup', 'ArrowLeft');
  assert.equal(input.state().dir, 'up');
  key('keyup', 'ArrowUp');
  assert.equal(input.state().dir, null);
});

test('X를 누르고 있으면 달리기. Z·X·방향키는 누르는 순간 한 번만 알리고 A·S는 무시한다', () => {
  pressed.length = 0;
  key('keydown', 'KeyX');
  key('keydown', 'KeyX', { repeat: true });
  assert.equal(input.state().run, true);
  key('keyup', 'KeyX');
  assert.equal(input.state().run, false);
  key('keydown', 'KeyZ');
  key('keyup', 'KeyZ');
  key('keydown', 'ArrowDown');
  key('keyup', 'ArrowDown');
  key('keydown', 'KeyA');
  key('keydown', 'KeyS');
  assert.deepEqual(pressed, ['x', 'z', 'down']);
});

test('조이스틱이 방향키보다 먼저이고, 4방향이 바뀔 때만 알린다', () => {
  pressed.length = 0;
  key('keydown', 'ArrowUp');
  input.setStick({ f: 0, r: 1 });
  assert.equal(input.state().dir, 'right');
  input.setStick({ f: 0.1, r: 0.9 });
  input.setStick(null);
  assert.equal(input.state().dir, 'up');
  key('keyup', 'ArrowUp');
  assert.deepEqual(pressed, ['up', 'right']);
});

test('터치 버튼은 누르는 순간 알리고, clear는 눌려 있던 것을 모두 놓는다(대화가 열릴 때)', () => {
  pressed.length = 0;
  input.button('x', true);
  input.button('x', true);
  assert.equal(input.state().run, true);
  key('keydown', 'ArrowUp');
  input.clear();
  assert.deepEqual(input.state(), { dir: null, run: false });
  key('keyup', 'ArrowUp');
  input.button('x', false);
  assert.deepEqual(pressed, ['x', 'up']);
});

test('Z·X를 떼는 순간도 알린다(성휘참 모으기). 누르지 않은 버튼·방향키는 알리지 않는다', () => {
  released.length = 0;
  key('keydown', 'KeyZ');
  key('keyup', 'KeyZ');
  input.button('z', true);
  input.button('z', false);
  input.button('x', false);
  key('keydown', 'ArrowUp');
  key('keyup', 'ArrowUp');
  assert.deepEqual(released, ['z', 'z']);
});
