import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer } from '../src/player.js';

// player.js는 three를 import하지 않는다. 화면 객체 대신 필요한 메서드만 가진 가짜를 넘긴다.
globalThis.addEventListener ??= () => {};

function fakes() {
  const plays = [];
  const vec = () => ({ set() {} });
  return {
    obj: { position: vec(), rotation: {} },
    anim: { busy: () => false, play: name => plays.push(name) },
    camera: { position: vec(), lookAt() {} },
    canvas: { addEventListener() {}, setPointerCapture() {} },
    plays,
  };
}

test('엔딩 자동 걷기는 지역 경계에서 멈추고, 멈추면 선다', () => {
  const f = fakes();
  const p = createPlayer(f.obj, f.anim, f.camera, f.canvas);
  const bounds = { minX: -14, maxX: 14, minZ: -90, maxZ: 18 };
  p.teleport(0, 10, Math.PI);
  p.state.auto = true;
  p.update(0.1, [], bounds);
  assert.equal(p.state.moving, true);
  assert.equal(f.plays.at(-1), 'Walking_A');
  for (let i = 0; i < 2000; i++) p.update(0.1, [], bounds);   // 200초: 1.3/초로 걸으면 경계를 훨씬 지난다
  assert.equal(p.state.z, -90);
  assert.equal(p.state.moving, false);
  assert.equal(f.plays.at(-1), 'Idle');
});
