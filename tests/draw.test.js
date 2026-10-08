import { test } from 'node:test';
import assert from 'node:assert/strict';
import { viewSize } from '../src/draw.js';

// [CSS 가로, CSS 세로, 기기 화소 비율] — 흔한 휴대폰(세로·가로), 윈도우 125% 배율, PC
const SCREENS = [[360, 800, 3], [375, 667, 2], [390, 844, 3], [412, 915, 2.625], [740, 360, 3], [1280, 720, 1], [1536, 730, 1.25], [1920, 1080, 1]];

test('흔한 화면에서 짧은 쪽에 약 12칸(10.5~13.5칸)이 보인다', () => {
  for (const [w, h, dpr] of SCREENS) {
    const v = viewSize(w, h, dpr), n = Math.min(v.W, v.H) / 16;
    assert.ok(n >= 10.5 && n <= 13.5, `${w}x${h}@${dpr}: ${n}칸`);
  }
});

test('게임 화소 하나가 기기 화소 정수 개라 도트 크기가 고르고, 화면을 다 덮는다', () => {
  for (const [w, h, dpr] of SCREENS) {
    const v = viewSize(w, h, dpr), k = (v.cssW * dpr) / v.W;
    assert.ok(k >= 1 && Math.abs(k - Math.round(k)) < 1e-9, `${w}x${h}@${dpr}: 기기 화소 ${k}배`);
    assert.ok(v.cssW >= w && v.cssH >= h, `${w}x${h}@${dpr}: ${v.cssW}x${v.cssH}`);
  }
});

test('아주 작은 화면에서도 배율은 1 이상', () => {
  const v = viewSize(100, 100, 1);
  assert.equal(v.cssW / v.W, 1);
});
