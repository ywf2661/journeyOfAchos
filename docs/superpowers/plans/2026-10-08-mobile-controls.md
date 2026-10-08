# 모바일 조작·모바일 손질 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 휴대폰·태블릿에서 터치만으로 「Journey of Achos」를 처음부터 엔딩까지 플레이할 수 있게 하고(가상 조이스틱·상황 버튼), 휴대폰 화질·아이폰 소리·첫 다운로드 용량을 손본다.

**Architecture:** 이동 입력을 "키 4개" 대신 기울기 `{ f, r }`로 일반화해서 키보드와 조이스틱이 같은 경로(`geom.moveVector` → `player.update`)를 쓴다. 터치 화면은 새 모듈 `src/touch.js`가 만들고, 보이고 숨는 것은 `body.touch[data-mode]` CSS 하나가 정한다. 캐릭터 GLB의 안 쓰는 애니메이션은 순수 함수 `slimGlb`(새 도구 `tools/slim-anims.mjs`)로 걷어 내고, 결과를 저장소에 커밋한다.

**Tech Stack:** 기존과 같다 — Three.js 0.170.0(CDN importmap), 브라우저 ES Module, Node 20+ 내장 테스트 러너. 새 런타임 의존성 없음.

**Spec:** `docs/superpowers/specs/2026-10-08-mobile-controls-design.md` (본편 스펙 `docs/superpowers/specs/2026-10-08-journey-of-achos-design.md`도 유효)

**스펙과 달라진 점**
- 없음. 다만 용량 예상치는 스펙(약 10MB)보다 더 줄어든다. 캐릭터 GLB의 절반가량이 애니메이션을 기술하는 JSON(기사 모델: JSON 약 1.8MB + 바이너리 1.7MB)이어서, 애니메이션을 빼면 JSON도 함께 줄기 때문이다. 완료 기준(지역 1 첫 다운로드 11MB 이하)은 그대로 둔다.

## Global Constraints

- 런타임 의존성은 CDN의 Three.js **0.170.0** 하나뿐이다. npm 패키지를 설치하지 않는다(브라우저 확인용 도구는 저장소 밖 임시 폴더에만 둔다).
- `src/story.js`, `src/geom.js`, `src/region.js`, `src/combat.js`, `data/*.js`, `tools/slim-anims.mjs`의 `slimGlb`는 DOM·three에 의존하지 않는다. `src/player.js`, `src/touch.js`도 three를 import하지 않는다(가짜 객체로 Node에서 테스트한다).
- 테스트는 저장소 루트에서 `npm test`(= `node --test`), Node 20 이상.
- 터치 판별은 부팅 때 한 번 `matchMedia('(pointer: coarse)').matches`(= `TOUCH`).
- **PC는 아무것도 바뀌지 않는다**: 조작, 화면, 화질(배율 상한 2, 그림자 2048·PCFSoft), 안내 문구, "[E]" 표시.
- 조이스틱 반지름 **48px**, 데드존 **0.15**, 달리기 기울기 **0.85**, 버튼 최소 **56px**, 세로 시야각 **70°**(가로 55°), 터치 화질 배율 상한 **1.5**·그림자 **1024**·`PCFShadowMap`.
- 게임이 쓰는 애니메이션(`ANIMATIONS`): `Idle`, `Walking_A`, `Running_A`, `Dodge_Forward`, `1H_Melee_Attack_Slice_Horizontal`, `1H_Melee_Attack_Chop`, `Hit_A`, `Death_A`, `Lie_Idle`, `Sit_Floor_Idle`.
- 키 입력은 `KeyboardEvent.code`로 읽는다.
- 작업 브랜치는 `feat/mobile-controls`. 커밋 메시지는 한국어, 끝에 `-m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.
- 로컬 실행: 저장소 루트에서 `python -m http.server 8000` → `http://localhost:8000`.
- 브라우저 확인은 사람이 직접 보거나 헤드리스 Chrome으로 한다. 휴대폰 흉내: 뷰포트 844×390(가로)·390×844(세로), 배율 3, `isMobile`·`hasTouch` 켬. 터치 끌기는 CDP `Input.dispatchTouchEvent`로 보낸다. 이 PC는 GPU가 없어 fps가 낮다(약 8fps) — 이동 거리 확인 시 감안한다. 확인하지 못한 항목은 완료로 보고하지 않는다.
- 이 PC의 curl은 사내망 인증서 문제로 `--ssl-no-revoke`가 필요하다(브라우저·Node fetch는 영향 없음).

## Review Focus

1. **조이스틱을 누른 채 대화가 열리거나, 대화 중에 손을 뗌** → 대화가 끝난 뒤 아코스가 혼자 걷지 않는다(`clearKeys`가 조이스틱도 놓고, `touch.js`는 손 떼기를 창 전체에서 듣는다). → Task 2 테스트, Task 6 테스트·브라우저 확인.
2. **두 손가락 동시 조작**(왼손 조이스틱 + 오른손 시야 끌기·탭) → 둘 다 동작하고 서로 끼어들지 않는다. → Task 2 테스트(포인터 id), Task 6 브라우저 확인.
3. **게임 중 화면 회전(가로↔세로)** → 캔버스 크기·시야각·버튼 위치가 새 방향에 맞게 바뀐다. → Task 5·6 브라우저 확인(뷰포트 크기 변경).
4. **PC(마우스·키보드)** → 조이스틱·전투 버튼이 안 보이고, "[E]" 표시·화질·안내 문구가 지금과 같다. 말 걸기 안내는 클릭으로도 눌린다. → Task 5·6 브라우저 확인.
5. **줄인 캐릭터 모델** → 세 지역·전투에서 모델·텍스처·애니메이션이 깨지지 않는다. → Task 4 테스트(바이트 비교)·브라우저 확인.

---

## 파일 구조

```
src/geom.js            moveVector가 기울기 { f, r }를 받는다 (Task 1)
src/player.js          키보드 축·조이스틱(setStick)·포인터 id 추적 (Task 1·2)
data/script.js         조작 안내 터치용·키보드용 짝 (Task 3)
data/models.js         ANIMATIONS 추가 (Task 4)
tools/slim-anims.mjs   새 파일: readGlb·slimGlb + npm run slim-assets (Task 4)
tools/fetch-assets.mjs 받은 .glb를 바로 줄임 (Task 4)
package.json           slim-assets 스크립트 (Task 4)
assets/kaykit/**.glb   줄인 캐릭터 6종 (Task 4)
src/world.js           buildRegion의 shadowSize 옵션 (Task 5)
src/ui.js              onPromptClick, 소리 깨우기 (Task 5)
src/main.js            TOUCH·화질·세로 시야각·touch 플래그·interact/dodgeAction·data-mode (Task 5), 터치 조작 연결 (Task 6)
index.html             viewport-fit, #prompt 버튼 (Task 5), 조이스틱·전투 버튼 자리와 CSS (Task 6)
src/touch.js           새 파일: 조이스틱·전투 버튼 (Task 6)
README.md              휴대폰 조작·접속·slim-assets (Task 7)
tests/                 geom·player·content·slim(새)·assets·touch(새)
```

---

### Task 1: 이동 입력을 기울기로 일반화

**Files:**
- Modify: `src/geom.js` (moveVector)
- Modify: `src/player.js` (키보드 축)
- Test: `tests/geom.test.js`, `tests/player.test.js`(전체 교체)

**Interfaces:**
- Produces:
  - `DEADZONE = 0.15` (geom.js export)
  - `moveVector({ f, r }, camYaw): {x,z}|null` — `f`: 앞(+)/뒤(−), `r`: 오른쪽(+)/왼쪽(−), 각 −1~1. 길이 < `DEADZONE`면 `null`, 아니면 길이 1 방향. 카메라 규약은 기존과 같다(카메라는 `(sin yaw, cos yaw)` 쪽 뒤).
  - `player.js` 내부 `keyAxes()` — `{ f: W−S, r: D−A }`. 키보드 동작은 지금과 같다.

- [ ] **Step 1: geom 테스트를 기울기 입력으로 바꾸기** — `tests/geom.test.js`

찾기:
```js
test('카메라가 +z 뒤에 있을 때(yaw 0) W는 -z, D는 +x', () => {
  const w = moveVector({ w: true }, 0);
  near(w.x, 0); near(w.z, -1);
  const d = moveVector({ d: true }, 0);
  near(d.x, 1); near(d.z, 0);
});

test('대각선 이동도 길이가 1이고, 키가 없으면 null', () => {
  const v = moveVector({ w: true, d: true }, 0);
  near(Math.hypot(v.x, v.z), 1);
  assert.equal(moveVector({}, 0), null);
  assert.equal(moveVector({ w: true, s: true }, 0), null);
});

test('카메라를 돌리면 이동 방향도 돈다', () => {
  const v = moveVector({ w: true }, Math.PI / 2);
  near(v.x, -1); near(v.z, 0);
});
```
바꾸기:
```js
test('카메라가 +z 뒤에 있을 때(yaw 0) 앞(f=1)은 -z, 오른쪽(r=1)은 +x', () => {
  const w = moveVector({ f: 1, r: 0 }, 0);
  near(w.x, 0); near(w.z, -1);
  const d = moveVector({ f: 0, r: 1 }, 0);
  near(d.x, 1); near(d.z, 0);
});

test('기울기가 얼마든 방향은 길이 1이고, 데드존 안이면 null', () => {
  const v = moveVector({ f: 1, r: 1 }, 0);
  near(Math.hypot(v.x, v.z), 1);
  const half = moveVector({ f: 0.3, r: 0 }, 0);
  near(half.x, 0); near(half.z, -1);
  assert.equal(moveVector({ f: 0, r: 0 }, 0), null);
  assert.equal(moveVector({ f: 0.1, r: 0.05 }, 0), null);
});

test('카메라를 돌리면 이동 방향도 돈다', () => {
  const v = moveVector({ f: 1, r: 0 }, Math.PI / 2);
  near(v.x, -1); near(v.z, 0);
});
```

- [ ] **Step 2: player 테스트 전체 교체** — `tests/player.test.js`

가짜 window·canvas가 등록된 처리기를 기억해 두었다가 직접 불러 준다. 키보드 이동 테스트는 이번 변경 전후로 같은 결과여야 하는 안전망이다.

```js
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
```

- [ ] **Step 3: 실패 확인**

Run: `npm test`
Expected: FAIL — geom의 새 테스트 3개(`moveVector({ f, r })`를 아직 모름: 첫 테스트는 `w`가 null이라 TypeError). player 테스트 2개는 PASS.

- [ ] **Step 4: 구현** — `src/geom.js`

찾기:
```js
// 카메라는 (sin yaw, cos yaw) 쪽 뒤에서 플레이어를 본다. 화면 기준 WASD를 월드 방향으로 바꾼다.
export function moveVector(keys, camYaw) {
  const f = (keys.w ? 1 : 0) - (keys.s ? 1 : 0);
  const r = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
  if (!f && !r) return null;
```
바꾸기:
```js
export const DEADZONE = 0.15;   // 이보다 덜 기울이면 멈춘 것으로 본다(조이스틱에 손가락만 닿은 경우)

// 화면 기준 기울기(f: 앞+/뒤−, r: 오른쪽+/왼쪽−, 각 −1~1)를 월드 방향(길이 1)으로 바꾼다.
// 카메라는 (sin yaw, cos yaw) 쪽 뒤에서 플레이어를 본다. 키보드와 조이스틱이 함께 쓴다.
export function moveVector({ f, r }, camYaw) {
  if (Math.hypot(f, r) < DEADZONE) return null;
```

- [ ] **Step 5: 구현** — `src/player.js` (키보드를 기울기로 바꿔 넘긴다)

찾기:
```js
  const clearKeys = () => { for (const k in keys) keys[k] = false; };
```
바꾸기:
```js
  const keyAxes = () => ({ f: (keys.w ? 1 : 0) - (keys.s ? 1 : 0), r: (keys.d ? 1 : 0) - (keys.a ? 1 : 0) });
  const clearKeys = () => { for (const k in keys) keys[k] = false; };
```

찾기:
```js
    else v = moveVector(keys, yaw);
```
바꾸기:
```js
    else v = moveVector(keyAxes(), yaw);
```

찾기:
```js
      dashDir = moveVector(keys, yaw) ?? { x: Math.sin(st.facing), z: Math.cos(st.facing) };
```
바꾸기:
```js
      dashDir = moveVector(keyAxes(), yaw) ?? { x: Math.sin(st.facing), z: Math.cos(st.facing) };
```

- [ ] **Step 6: 통과 확인**

Run: `npm test`
Expected: PASS — 54 tests

- [ ] **Step 7: 커밋**

```bash
git add src/geom.js src/player.js tests/geom.test.js tests/player.test.js
git commit -m "refactor: 이동 입력을 기울기(앞뒤·좌우)로 일반화" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 조이스틱 입력과 손가락 구분

**Files:**
- Modify: `src/player.js` (전체 교체)
- Test: `tests/player.test.js` (파일 끝에 추가)

**Interfaces:**
- Consumes: Task 1의 `moveVector`, `keyAxes`
- Produces:
  - `RUN_TILT = 0.85` (player.js export)
  - `player.setStick(axes: {f, r} | null)` — `null`이 아니면 키보드보다 먼저 쓴다. 기울기 길이 ≥ `RUN_TILT`면 달리기.
  - `player.clearKeys()` — 키와 함께 조이스틱 값도 놓는다.
  - 캔버스 드래그는 시작한 포인터 id만 따라간다. 새 손가락이 닿으면 그 손가락이 이어받는다. 버튼이 눌리지 않은 `pointermove`(`e.buttons === 0`)는 드래그를 끝낸다. `pointerup`은 같은 id일 때만 처리하고, 6px 미만 움직였으면 `onClick`.

- [ ] **Step 1: 실패하는 테스트 추가** — `tests/player.test.js` 끝에

```js
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
```

- [ ] **Step 2: 실패 확인**

Run: `npm test`
Expected: FAIL — `p.setStick is not a function`(4개), 시야 드래그 2개는 카메라가 바뀌어 실패, 탭 테스트는 `clicks`가 1이라 실패.

- [ ] **Step 3: 구현** — `src/player.js` 전체 교체

```js
// 3인칭 조작: 이동(키보드 WASD·방향키 또는 터치 조이스틱), 달리기, 드래그로 시야 회전, 짧은 탭·클릭 콜백, 회피 대시.
// 키는 e.code로 읽는다. 한글 입력 상태에서도 같은 자리의 키가 같은 뜻이 된다.
import { moveVector, facingOf, resolve, dist } from './geom.js';

const WALK = 4.2, RUN = 7.5, DASH = 13, DASH_TIME = 0.25, AUTO_WALK = 1.3, RADIUS = 0.6, CAM_DIST = 9;
export const RUN_TILT = 0.85;   // 조이스틱을 이만큼 이상 기울이면 달린다
const CODES = {
  KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd',
  ArrowUp: 'w', ArrowLeft: 'a', ArrowDown: 's', ArrowRight: 'd',
  ShiftLeft: 'shift', ShiftRight: 'shift',
};

export function createPlayer(obj, anim, camera, canvas) {
  const keys = {};
  const st = { x: 0, z: 0, facing: 0, auto: false, moving: false };
  let yaw = 0, pitch = 0.32, dash = 0, dashDir = null, drag = null, stick = null, onClick = () => {};

  const keyAxes = () => ({ f: (keys.w ? 1 : 0) - (keys.s ? 1 : 0), r: (keys.d ? 1 : 0) - (keys.a ? 1 : 0) });
  // 대화가 열리거나 창이 포커스를 잃으면 눌려 있던 키와 조이스틱을 놓는다.
  const clearKeys = () => {
    for (const k in keys) keys[k] = false;
    stick = null;
  };
  addEventListener('keydown', e => { if (CODES[e.code]) keys[CODES[e.code]] = true; });
  addEventListener('keyup', e => { if (CODES[e.code]) keys[CODES[e.code]] = false; });
  addEventListener('blur', clearKeys);
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  // 시야 드래그는 시작한 포인터 하나만 따라간다. 새 손가락이 닿으면 그 손가락이 이어받는다.
  canvas.addEventListener('pointerdown', e => {
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0 };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!e.buttons) { drag = null; return; }   // 버튼을 뗀 채 돌아온 포인터(창 전환 등): 드래그를 끝낸다
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    drag.x = e.clientX;
    drag.y = e.clientY;
    yaw -= dx * 0.005;
    pitch = Math.min(1.2, Math.max(0.05, pitch + dy * 0.004));
  });
  canvas.addEventListener('pointerup', e => {
    if (!drag || e.pointerId !== drag.id) return;
    if (drag.moved < 6) onClick();
    drag = null;
  });

  function update(dt, obstacles, bounds) {
    const run = stick ? Math.hypot(stick.f, stick.r) >= RUN_TILT : keys.shift;
    let v = null, speed = run ? RUN : WALK;
    if (st.auto) { v = { x: Math.sin(st.facing), z: Math.cos(st.facing) }; speed = AUTO_WALK; }
    else if (dash > 0) { dash -= dt; v = dashDir; speed = DASH; }
    else v = moveVector(stick ?? keyAxes(), yaw);
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
    setStick(axes) { stick = axes; },
    teleport(x, z, facing) {
      Object.assign(st, { x, z, facing });
      yaw = facing + Math.PI;
      sync();
    },
    dash() {
      dash = DASH_TIME;
      dashDir = moveVector(stick ?? keyAxes(), yaw) ?? { x: Math.sin(st.facing), z: Math.cos(st.facing) };
      anim.play('Dodge_Forward', { once: true });
    },
    set onClick(fn) { onClick = fn; },
  };
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test`
Expected: PASS — 61 tests

- [ ] **Step 5: 커밋**

```bash
git add src/player.js tests/player.test.js
git commit -m "feat: 조이스틱 입력(걷기·달리기)과 시야 드래그 손가락 구분" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 조작 안내를 터치용·키보드용 짝으로

**Files:**
- Modify: `data/script.js` (`r1_open`, `r1_road`)
- Test: `tests/content.test.js`

**Interfaces:**
- Consumes: 대화 엔진의 조건 노드(`if`가 거짓이면 표시하지 않고 `next`로) — 엔진은 바꾸지 않는다.
- Produces: 새 노드 `r1_open_touch`, `r1_open_keys`, `r1_road_touch`, `r1_road_keys`, `r1_road_go`(글 없이 `do: 'combat:road'`만). 플래그 `touch`(Task 5가 켠다).

- [ ] **Step 1: 실패하는 테스트 추가** — `tests/content.test.js`

찾기:
```js
function playthrough({ pickTrigger, pickChoice }) {
  const state = createState();
```
바꾸기:
```js
function playthrough({ pickTrigger, pickChoice, flags = [] }) {
  const state = createState();
  state.flags.push(...flags);
```

파일 끝에 추가:
```js

// 대화를 끝까지 넘기며 나온 글과, 대화가 끝난 뒤 꺼낼 효과
function linesOf(start, flags) {
  const d = createDialogue(SCRIPT, { ...createState(), flags });
  const out = [];
  for (let v = d.start(start); v; v = d.next()) out.push(v.text);
  return { text: out.join('\n'), effects: d.takeEffects() };
}

test('touch가 켜져 있으면 터치 안내만, 꺼져 있으면 키보드 안내만 나온다', () => {
  const touchOpen = linesOf('r1_open', ['touch']).text, keysOpen = linesOf('r1_open', []).text;
  assert.ok(touchOpen.includes('왼쪽 화면을 끌어') && !touchOpen.includes('WASD'), touchOpen);
  assert.ok(keysOpen.includes('WASD') && !keysOpen.includes('왼쪽 화면을 끌어'), keysOpen);
  const touchRoad = linesOf('r1_road', ['touch']), keysRoad = linesOf('r1_road', []);
  assert.ok(touchRoad.text.includes('[베기]') && !touchRoad.text.includes('Space'), touchRoad.text);
  assert.ok(keysRoad.text.includes('Space') && !keysRoad.text.includes('[베기]'), keysRoad.text);
  assert.deepEqual(touchRoad.effects, ['combat:road']);
  assert.deepEqual(keysRoad.effects, ['combat:road']);
});

test('touch 상태로도 끝까지 갈 수 있다', () => {
  const s = playthrough({ pickTrigger: a => a[0], pickChoice: () => 0, flags: ['touch'] });
  assert.equal(s.ended, true);
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test`
Expected: FAIL — 안내 테스트 1개(터치로 켜도 'WASD'가 나오고 '왼쪽 화면을 끌어'가 없다). 완주 테스트는 PASS.

- [ ] **Step 3: 구현** — `data/script.js`

찾기:
```js
  ...chain('r1_open', [
    [N, '역병이 돈 지 석 달째. 왕도의 밤은 등불보다 기침 소리가 많다.'],
    [N, '걸린 자는 몸이 조금씩 다른 것으로 변해 간다. 그리고 끝내, 죽는다.'],
    [K, '…오늘 밤 떠난다. 고칠 방법을 찾을 때까지는 돌아오지 않는다.'],
    [N, '(WASD로 걷고 Shift로 달린다. 마우스를 끌어 둘러본다. 가까이 가서 E로 말을 건다.)'],
  ]),
```
바꾸기:
```js
  ...chain('r1_open', [
    [N, '역병이 돈 지 석 달째. 왕도의 밤은 등불보다 기침 소리가 많다.'],
    [N, '걸린 자는 몸이 조금씩 다른 것으로 변해 간다. 그리고 끝내, 죽는다.'],
    [K, '…오늘 밤 떠난다. 고칠 방법을 찾을 때까지는 돌아오지 않는다.'],
  ], { next: 'r1_open_touch' }),
  // 조작 안내: 기기에 맞는 쪽 하나만 나온다(touch 플래그는 main.js가 부팅 때 정한다)
  r1_open_touch: { if: 'touch', who: N, text: '(왼쪽 화면을 끌어 걷고, 끝까지 밀면 달린다. 오른쪽 화면을 끌어 둘러본다. 가까이 가서 아래에 뜨는 안내를 눌러 말을 건다.)', next: 'r1_open_keys' },
  r1_open_keys: { if: '!touch', who: N, text: '(WASD로 걷고 Shift로 달린다. 마우스를 끌어 둘러본다. 가까이 가서 E로 말을 건다.)' },
```

찾기:
```js
  ...chain('r1_road', [
    [N, '어둠 속에서 무언가가 기어 나온다. 검게 굳은 딱지 틈으로 병든 황록빛이 새어 나온다.'],
    [K, '…짐승이었던 것인가. 아니면, 사람이었던 것인가.'],
    [N, '(클릭으로 벤다. Space로 몸을 피한다. 마우스를 끌면 시야가 돈다.)'],
  ], { do: 'combat:road' }),
```
바꾸기:
```js
  ...chain('r1_road', [
    [N, '어둠 속에서 무언가가 기어 나온다. 검게 굳은 딱지 틈으로 병든 황록빛이 새어 나온다.'],
    [K, '…짐승이었던 것인가. 아니면, 사람이었던 것인가.'],
  ], { next: 'r1_road_touch' }),
  r1_road_touch: { if: 'touch', who: N, text: '(화면을 탭하거나 [베기]로 벤다. [피하기]로 몸을 피한다.)', next: 'r1_road_keys' },
  r1_road_keys: { if: '!touch', who: N, text: '(클릭으로 벤다. Space로 몸을 피한다. 마우스를 끌면 시야가 돈다.)', next: 'r1_road_go' },
  r1_road_go: { do: 'combat:road' },
```

- [ ] **Step 4: 통과 확인**

Run: `npm test`
Expected: PASS — 63 tests (기존 무결성·도달성·완주 테스트 포함)

- [ ] **Step 5: 커밋**

```bash
git add data/script.js tests/content.test.js
git commit -m "feat: 조작 안내를 터치용·키보드용으로 나눔" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 캐릭터 GLB에서 안 쓰는 애니메이션 걷어 내기

**Files:**
- Create: `tools/slim-anims.mjs`
- Modify: `data/models.js` (ANIMATIONS), `tools/fetch-assets.mjs`, `package.json`
- Modify: `assets/kaykit/adventurers/*.glb`, `assets/kaykit/skeletons/Skeleton_Minion.glb` (도구가 줄인다)
- Test: `tests/slim.test.js`(새), `tests/assets.test.js`

**Interfaces:**
- Produces:
  - `ANIMATIONS: string[]` (data/models.js) — Global Constraints의 10개
  - `readGlb(buf: Buffer): { json, bin }` — GLB가 아니면 `Error('GLB 파일이 아니다')`
  - `slimGlb(glb: Buffer, keep: string[]): Buffer` — keep에 없는 애니메이션과 그 때문에 안 쓰게 된 accessor·bufferView를 걷어 내고 다시 쓴 GLB. 메시·스킨·이미지·남은 애니메이션의 바이트는 그대로. 결과의 bufferView는 4바이트 정렬, 버퍼는 하나. 같은 keep으로 두 번 돌려도 바이트가 같다. bufferView를 참조하는 확장·sparse accessor·버퍼 여러 개는 오류.
  - `npm run slim-assets` — `MODELS`의 `.glb`를 줄여 덮어쓰고 파일마다 전후 크기를 출력한다.
- 확인한 사실(설계 근거): KayKit 캐릭터 GLB는 버퍼 1개, 확장·sparse·byteStride·모프 타깃 없음, accessor마다 bufferView가 하나씩, 텍스처 1장이 bufferView에 들어 있다(`images[0].bufferView`).

- [ ] **Step 1: 실패하는 테스트 쓰기** — `tests/slim.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readGlb, slimGlb } from '../tools/slim-anims.mjs';
import { MODELS, ANIMATIONS } from '../data/models.js';

const KNIGHT = readFileSync(MODELS.knight.url);
const names = glb => (readGlb(glb).json.animations ?? []).map(a => a.name);

// bufferView·accessor가 가리키는 바이트
function view({ json, bin }, i) {
  const v = json.bufferViews[i], start = v.byteOffset ?? 0;
  return bin.subarray(start, start + v.byteLength);
}
const accessor = (g, i) => view(g, g.json.accessors[i].bufferView);

test('keep에 있는 애니메이션만 남고 파일이 작아진다', () => {
  const out = slimGlb(KNIGHT, ['Walking_A', 'Idle']);
  assert.deepEqual(names(out).sort(), ['Idle', 'Walking_A']);
  assert.ok(out.length < KNIGHT.length);
});

test('메시·스킨·텍스처 데이터는 원본과 같다', () => {
  const a = readGlb(KNIGHT), b = readGlb(slimGlb(KNIGHT, ['Idle']));
  a.json.meshes.forEach((mesh, mi) => mesh.primitives.forEach((p, pi) => {
    const q = b.json.meshes[mi].primitives[pi];
    for (const k in p.attributes) assert.ok(accessor(a, p.attributes[k]).equals(accessor(b, q.attributes[k])), `${mesh.name}.${k}`);
    if (p.indices !== undefined) assert.ok(accessor(a, p.indices).equals(accessor(b, q.indices)), `${mesh.name}.indices`);
  }));
  a.json.skins.forEach((s, i) => assert.ok(accessor(a, s.inverseBindMatrices).equals(accessor(b, b.json.skins[i].inverseBindMatrices))));
  a.json.images.forEach((im, i) => assert.ok(view(a, im.bufferView).equals(view(b, b.json.images[i].bufferView))));
});

test('남긴 애니메이션의 데이터도 원본과 같다', () => {
  const a = readGlb(KNIGHT), b = readGlb(slimGlb(KNIGHT, ['Walking_A']));
  const before = a.json.animations.find(x => x.name === 'Walking_A'), after = b.json.animations[0];
  assert.equal(after.samplers.length, before.samplers.length);
  before.samplers.forEach((s, i) => {
    assert.ok(accessor(a, s.input).equals(accessor(b, after.samplers[i].input)));
    assert.ok(accessor(a, s.output).equals(accessor(b, after.samplers[i].output)));
  });
  assert.deepEqual(after.channels, before.channels);
});

test('모든 bufferView가 버퍼 안에 4바이트 정렬로 있다', () => {
  const { json, bin } = readGlb(slimGlb(KNIGHT, ['Idle']));
  assert.ok(json.buffers[0].byteLength <= bin.length);
  for (const v of json.bufferViews) {
    assert.equal(v.byteOffset % 4, 0);
    assert.ok(v.byteOffset + v.byteLength <= json.buffers[0].byteLength);
  }
  for (const a of json.accessors) assert.ok(json.bufferViews[a.bufferView]);
});

test('두 번 줄여도 결과가 같다', () => {
  const once = slimGlb(KNIGHT, ANIMATIONS);
  assert.ok(slimGlb(once, ANIMATIONS).equals(once));
});

test('GLB가 아니면 오류를 낸다', () => {
  assert.throws(() => slimGlb(Buffer.from('not a glb file'), ['Idle']), /GLB/);
});
```

- [ ] **Step 2: 실패하는 테스트 추가** — `tests/assets.test.js`

찾기:
```js
import { existsSync, readFileSync } from 'node:fs';
import { posix } from 'node:path';
import { MODELS } from '../data/models.js';
```
바꾸기:
```js
import { existsSync, readFileSync, statSync } from 'node:fs';
import { posix } from 'node:path';
import { MODELS, ANIMATIONS } from '../data/models.js';
import { REGIONS } from '../data/regions.js';
import { readGlb } from '../tools/slim-anims.mjs';
```

파일 끝에 추가:
```js

// 모델 하나 때문에 받게 되는 파일들(.gltf는 참조하는 .bin·텍스처 포함)
function filesOf(key) {
  const url = MODELS[key].url, files = [url];
  if (url.endsWith('.gltf')) {
    const json = JSON.parse(readFileSync(url, 'utf8'));
    for (const { uri } of [...(json.buffers ?? []), ...(json.images ?? [])]) {
      if (uri && !uri.startsWith('data:')) files.push(posix.join(posix.dirname(url), decodeURIComponent(uri)));
    }
  }
  return files;
}

test('지역 1에 처음 들어갈 때 받는 모델이 11MB 이하다', () => {
  const r = REGIONS[1];
  const keys = new Set([...r.props, ...r.actors].map(x => x.m).concat('knight', 'minion'));
  const files = new Set([...keys].flatMap(filesOf));
  const mb = [...files].reduce((sum, f) => sum + statSync(f).size, 0) / 1048576;
  assert.ok(mb <= 11, `${mb.toFixed(1)}MB`);
});

test('캐릭터 GLB에는 게임이 쓰는 애니메이션만 들어 있다', () => {
  for (const { url } of Object.values(MODELS)) {
    if (!url.endsWith('.glb')) continue;
    const names = (readGlb(readFileSync(url)).json.animations ?? []).map(a => a.name);
    assert.ok(names.length > 0, url);
    assert.deepEqual(names.filter(n => !ANIMATIONS.includes(n)), [], url);
  }
});

// 코드의 애니메이션 이름(대문자·숫자로 시작하고 밑줄로 이어진 문자열, 또는 'Idle')을 모아 ANIMATIONS와 비교한다.
// 쓰는데 목록에 없으면 줄이다가 지워 버리고, 목록에만 있으면 쓸데없이 남는다.
test('코드가 쓰는 애니메이션과 ANIMATIONS가 정확히 같다', () => {
  const used = new Set();
  for (const f of ['src/main.js', 'src/player.js', 'src/world.js', 'data/regions.js']) {
    for (const [, name] of readFileSync(f, 'utf8').matchAll(/'((?:[0-9A-Z][A-Za-z0-9]*_)+[A-Za-z0-9]+|Idle)'/g)) used.add(name);
  }
  assert.deepEqual([...used].sort(), [...ANIMATIONS].sort());
});
```

- [ ] **Step 3: 실패 확인**

Run: `npm test`
Expected: FAIL — `tools/slim-anims.mjs`를 찾을 수 없음(slim·assets 테스트 파일 전체)

- [ ] **Step 4: ANIMATIONS 추가** — `data/models.js` 끝에

```js

// 게임이 쓰는 애니메이션. tools/slim-anims.mjs가 캐릭터 GLB에서 이것만 남긴다(테스트가 코드와 맞는지 확인한다).
export const ANIMATIONS = [
  'Idle', 'Walking_A', 'Running_A', 'Dodge_Forward',
  '1H_Melee_Attack_Slice_Horizontal', '1H_Melee_Attack_Chop',
  'Hit_A', 'Death_A', 'Lie_Idle', 'Sit_Floor_Idle',
];
```

- [ ] **Step 5: 도구 쓰기** — `tools/slim-anims.mjs`

```js
// 캐릭터 GLB에서 keep에 없는 애니메이션을 지우고, 그 때문에 쓰지 않게 된 데이터까지 걷어 내 GLB를 다시 쓴다.
// 저장소 루트에서 실행: npm run slim-assets  (data/models.js의 .glb를 ANIMATIONS만 남기고 덮어쓴다. 이미 줄어 있으면 결과가 같다)
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODELS, ANIMATIONS } from '../data/models.js';

const MAGIC = 0x46546c67, JSON_CHUNK = 0x4e4f534a, BIN_CHUNK = 0x004e4942;

export function readGlb(buf) {
  if (buf.length < 12 || buf.readUInt32LE(0) !== MAGIC) throw new Error('GLB 파일이 아니다');
  let json = null, bin = Buffer.alloc(0);
  for (let off = 12; off < buf.length; ) {
    const len = buf.readUInt32LE(off), type = buf.readUInt32LE(off + 4);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === JSON_CHUNK) json = JSON.parse(data.toString('utf8'));
    else if (type === BIN_CHUNK) bin = data;
    off += 8 + len;
  }
  return { json, bin };
}

function writeGlb(json, bin) {
  const pad = (b, fill) => Buffer.concat([b, Buffer.alloc((4 - (b.length % 4)) % 4, fill)]);
  const chunk = (data, type) => {
    const head = Buffer.alloc(8);
    head.writeUInt32LE(data.length, 0);
    head.writeUInt32LE(type, 4);
    return Buffer.concat([head, data]);
  };
  const body = Buffer.concat([
    chunk(pad(Buffer.from(JSON.stringify(json)), 0x20), JSON_CHUNK),
    chunk(pad(bin, 0), BIN_CHUNK),
  ]);
  const head = Buffer.alloc(12);
  head.writeUInt32LE(MAGIC, 0);
  head.writeUInt32LE(2, 4);
  head.writeUInt32LE(12 + body.length, 8);
  return Buffer.concat([head, body]);
}

export function slimGlb(glb, keep) {
  const { json, bin } = readGlb(glb);
  if (json.extensionsUsed?.length) throw new Error(`확장을 쓰는 GLB는 다루지 않는다: ${json.extensionsUsed.join(', ')}`);
  if ((json.buffers ?? []).length !== 1) throw new Error('버퍼가 하나인 GLB만 다룬다');
  if (json.accessors.some(a => a.sparse || a.bufferView === undefined)) throw new Error('sparse이거나 bufferView가 없는 accessor는 다루지 않는다');

  const animations = (json.animations ?? []).filter(a => keep.includes(a.name));

  // 남는 것(메시·스킨·남은 애니메이션)이 참조하는 accessor
  const used = new Set();
  for (const m of json.meshes ?? []) {
    for (const p of m.primitives) {
      Object.values(p.attributes).forEach(i => used.add(i));
      if (p.indices !== undefined) used.add(p.indices);
      for (const t of p.targets ?? []) Object.values(t).forEach(i => used.add(i));
    }
  }
  for (const s of json.skins ?? []) if (s.inverseBindMatrices !== undefined) used.add(s.inverseBindMatrices);
  for (const a of animations) for (const s of a.samplers) used.add(s.input).add(s.output);

  const accIndex = new Map(), accessors = [];
  json.accessors.forEach((a, i) => {
    if (!used.has(i)) return;
    accIndex.set(i, accessors.length);
    accessors.push(a);
  });

  // 남는 accessor와 이미지가 쓰는 bufferView만 4바이트 정렬로 다시 이어 붙인다
  const views = new Set(accessors.map(a => a.bufferView));
  for (const im of json.images ?? []) if (im.bufferView !== undefined) views.add(im.bufferView);
  const viewIndex = new Map(), bufferViews = [], parts = [];
  let length = 0;
  json.bufferViews.forEach((v, i) => {
    if (!views.has(i)) return;
    const gap = (4 - (length % 4)) % 4;
    parts.push(Buffer.alloc(gap));
    length += gap;
    const start = v.byteOffset ?? 0;
    parts.push(bin.subarray(start, start + v.byteLength));
    viewIndex.set(i, bufferViews.length);
    bufferViews.push({ ...v, byteOffset: length });
    length += v.byteLength;
  });

  // 번호를 새로 매긴다
  for (const a of accessors) a.bufferView = viewIndex.get(a.bufferView);
  for (const im of json.images ?? []) if (im.bufferView !== undefined) im.bufferView = viewIndex.get(im.bufferView);
  for (const m of json.meshes ?? []) {
    for (const p of m.primitives) {
      for (const k in p.attributes) p.attributes[k] = accIndex.get(p.attributes[k]);
      if (p.indices !== undefined) p.indices = accIndex.get(p.indices);
      for (const t of p.targets ?? []) for (const k in t) t[k] = accIndex.get(t[k]);
    }
  }
  for (const s of json.skins ?? []) if (s.inverseBindMatrices !== undefined) s.inverseBindMatrices = accIndex.get(s.inverseBindMatrices);
  for (const a of animations) {
    for (const s of a.samplers) {
      s.input = accIndex.get(s.input);
      s.output = accIndex.get(s.output);
    }
  }

  Object.assign(json, { accessors, bufferViews, buffers: [{ byteLength: length }] });
  if (animations.length) json.animations = animations;
  else delete json.animations;
  return writeGlb(json, Buffer.concat(parts));
}

// 직접 실행했을 때만 저장소의 캐릭터 GLB를 줄인다(테스트·fetch-assets가 import할 때는 실행하지 않는다).
const isMain = process.argv[1] && resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();
if (isMain) {
  for (const { url } of Object.values(MODELS)) {
    if (!url.endsWith('.glb')) continue;
    const before = await readFile(url);
    const after = slimGlb(before, ANIMATIONS);
    await writeFile(url, after);
    console.log(`${url}: ${(before.length / 1048576).toFixed(2)}MB → ${(after.length / 1048576).toFixed(2)}MB`);
  }
}
```

- [ ] **Step 6: 스크립트 등록** — `package.json`

찾기:
```json
    "fetch-assets": "node tools/fetch-assets.mjs"
```
바꾸기:
```json
    "fetch-assets": "node tools/fetch-assets.mjs",
    "slim-assets": "node tools/slim-anims.mjs"
```

- [ ] **Step 7: 줄이기 전 확인**

Run: `npm test`
Expected: FAIL 2개만 — "지역 1에 처음 들어갈 때 받는 모델이 11MB 이하다"(약 19.7MB), "캐릭터 GLB에는 게임이 쓰는 애니메이션만 들어 있다". slim 테스트 6개와 "코드가 쓰는 애니메이션과 ANIMATIONS가 정확히 같다"는 PASS.

- [ ] **Step 8: 저장소의 캐릭터 GLB 줄이기**

Run: `npm run slim-assets`
Expected: 6줄. 예: `assets/kaykit/adventurers/Knight.glb: 3.5xMB → 0.xxMB`. 각 파일이 원래보다 작아야 한다.

- [ ] **Step 9: 통과 확인**

Run: `npm test`
Expected: PASS — 72 tests

- [ ] **Step 10: 받기 도구가 받은 .glb를 바로 줄이게 연결** — `tools/fetch-assets.mjs`

찾기:
```js
import { MODELS } from '../data/models.js';
```
바꾸기:
```js
import { MODELS, ANIMATIONS } from '../data/models.js';
import { slimGlb } from './slim-anims.mjs';
```

찾기:
```js
    body = Buffer.from(await res.arrayBuffer());
```
바꾸기:
```js
    body = Buffer.from(await res.arrayBuffer());
    if (local.endsWith('.glb')) body = slimGlb(body, ANIMATIONS);   // 캐릭터: 게임이 쓰는 애니메이션만 남긴다
```

- [ ] **Step 11: 다시 받아도 줄어드는지 확인**

Run: `rm assets/kaykit/adventurers/Rogue.glb && npm run fetch-assets && npm test`
Expected: `받음 assets/kaykit/adventurers/Rogue.glb` 한 줄, 그리고 PASS — 72 tests(다시 받은 Rogue.glb도 줄어 있다). `git status`에 Rogue.glb가 Step 8 결과와 같은 내용으로 남는다(바이트가 같으면 변경 없음으로 보인다).

- [ ] **Step 12: 브라우저에서 확인** (PC 1280×720)

`npm run serve` 후 아래를 차례로 열어 본다. 각 화면에서 모델·텍스처가 보이고, 캐릭터가 대기 동작(Idle)을 하며, 콘솔 오류가 없어야 한다.
- 타이틀 → 새로 시작: 왕도의 아코스·병사·왕·경비병·누운 왕자(`Lie_Idle`)·모닥불 여행자(`Sit_Floor_Idle`)
- W로 걸어 아코스의 걷기·달리기(Shift)
- 저장 데이터를 `{"v":1,"region":1,"day":1,"flags":["done:r1_open","king_done","gate_open","done:r1_road"],"memories":[],"pendingFight":"road","ended":false}`로 넣고 이어하기 → 적(검은 몸·황록빛 눈)이 걸어오고 공격 동작, 클릭 베기·Space 회피 동작, 쓰러짐(`Death_A`)
- 지역 2(1~3일)·3의 마술사

- [ ] **Step 13: 커밋**

```bash
git add data/models.js tools/slim-anims.mjs tools/fetch-assets.mjs package.json tests/slim.test.js tests/assets.test.js assets
git commit -m "feat: 캐릭터 GLB에서 안 쓰는 애니메이션 제거(첫 다운로드 축소)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 터치 기기 판별과 화질·시야각·말 걸기 버튼·소리

**Files:**
- Modify: `src/main.js`, `src/world.js`, `src/ui.js`, `index.html`

**Interfaces:**
- Consumes: Task 3의 `touch` 플래그 분기
- Produces:
  - `main.js`: `TOUCH`(상수), `interact()`, `dodgeAction()` — Task 6이 버튼에 연결한다. 매 프레임 `document.body.dataset.mode = mode`.
  - `world.js`: `buildRegion(scene, region, state, { shadowSize = 2048 } = {})`
  - `ui.js`: `onPromptClick(cb)`; 모듈이 로드되면 `click`·`touchend`·`keydown`마다 소리 장치를 깨운다.
  - `index.html`: `#prompt`가 `<button>`

- [ ] **Step 1: world.js — 그림자 크기 옵션**

찾기:
```js
export async function buildRegion(scene, region, state) {
```
바꾸기:
```js
export async function buildRegion(scene, region, state, { shadowSize = 2048 } = {}) {
```

찾기:
```js
  sun.shadow.mapSize.set(2048, 2048);
```
바꾸기:
```js
  sun.shadow.mapSize.set(shadowSize, shadowSize);
```

- [ ] **Step 2: ui.js — 말 걸기 버튼 연결과 소리 깨우기**

찾기:
```js
export function onDialogClick(cb) {
  $('dialog').addEventListener('click', e => { if (!e.target.closest('button')) cb(); });
}
```
바꾸기:
```js
export function onDialogClick(cb) {
  $('dialog').addEventListener('click', e => { if (!e.target.closest('button')) cb(); });
}

export function onPromptClick(cb) {
  $('prompt').addEventListener('click', cb);
}
```

찾기:
```js
let audio;
// 시계 째깍 소리: 짧은 사각파 두 번을 합성한다. 브라우저가 소리를 막으면 조용히 넘어간다.
```
바꾸기:
```js
let audio;
// 아이폰은 사용자 동작(탭·클릭·키) 안에서 소리 장치를 깨워야 소리가 난다. 이미 깨어 있으면 아무것도 안 한다.
function wakeAudio() {
  try {
    audio ??= new AudioContext();
    if (audio.state !== 'running') audio.resume().catch(() => {});
  } catch { /* 소리 없이 진행한다 */ }
}
for (const type of ['click', 'touchend', 'keydown']) addEventListener(type, wakeAudio);

// 시계 째깍 소리: 짧은 사각파 두 번을 합성한다. 브라우저가 소리를 막으면 조용히 넘어간다.
```

- [ ] **Step 3: index.html — viewport와 말 걸기 버튼**

찾기:
```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```
바꾸기:
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

찾기:
```html
  #prompt { position: fixed; left: 50%; bottom: 8vh; transform: translateX(-50%); background: var(--panel); border: 1px solid var(--gold); padding: 0.4rem 1rem; }
```
바꾸기:
```html
  #prompt { position: fixed; left: 50%; bottom: 8vh; transform: translateX(-50%); background: var(--panel); border: 1px solid var(--gold); padding: 0.4rem 1rem; min-width: 0; min-height: 44px; }
```

찾기:
```html
<div id="prompt" hidden></div>
```
바꾸기:
```html
<button id="prompt" hidden></button>
```

- [ ] **Step 4: main.js — 터치 판별·화질·세로 시야각**

찾기:
```js
const canvas = document.getElementById('game');
let renderer;
```
바꾸기:
```js
const canvas = document.getElementById('game');
// 주로 터치로 조작하는 기기(휴대폰·태블릿). 부팅 때 한 번 정한다.
const TOUCH = matchMedia('(pointer: coarse)').matches;
document.body.classList.toggle('touch', TOUCH);
let renderer;
```

찾기:
```js
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
```
바꾸기:
```js
// 휴대폰은 화면 배율이 높아(보통 3) 그대로 그리면 무겁다. 해상도와 그림자를 낮춘다.
renderer.setPixelRatio(Math.min(devicePixelRatio, TOUCH ? 1.5 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = TOUCH ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
```

찾기:
```js
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
```
바꾸기:
```js
  camera.aspect = innerWidth / innerHeight;
  camera.fov = innerHeight > innerWidth ? 70 : 55;   // 세로 화면은 시야를 넓혀 아코스가 화면을 덜 가리게
  camera.updateProjectionMatrix();
```

찾기:
```js
  world = await buildRegion(scene, region(), state);
```
바꾸기:
```js
  world = await buildRegion(scene, region(), state, { shadowSize: TOUCH ? 1024 : 2048 });
```

- [ ] **Step 5: main.js — 안내 글자, 말 걸기·피하기 함수, data-mode, touch 플래그**

찾기:
```js
  ui.showPrompt(t ? `[E] ${t.label}${t.ends ? ' (되돌릴 수 없음)' : ''}` : null);
```
바꾸기:
```js
  ui.showPrompt(t ? `${TOUCH ? '' : '[E] '}${t.label}${t.ends ? ' (되돌릴 수 없음)' : ''}` : null);
```

찾기:
```js
const ADVANCE_KEYS = ['Space', 'KeyE', 'Enter', 'NumpadEnter'];
addEventListener('keydown', e => {
  if (e.repeat) return;
  if (mode === 'dialogue') {
    if (ADVANCE_KEYS.includes(e.code)) advance();
    const n = Number(e.code.match(/^Digit([1-9])$/)?.[1]);
    if (n && view?.choices && !ui.completeTyping() && n <= view.choices.length) show(dialogue.choose(n - 1));
  } else if (mode === 'explore' && e.code === 'KeyE') {
    const t = nearestTrigger();
    if (t && !t.auto) openDialogue(t.node, t);
  } else if (mode === 'combat' && e.code === 'Space' && dodge(fight)) {
    player.dash();
  }
});
ui.onDialogClick(() => { if (mode === 'dialogue') advance(); });
```
바꾸기:
```js
// 키보드와 화면 버튼(말 걸기 안내, 터치 전투 버튼)이 함께 부르는 동작
function interact() {
  if (mode !== 'explore') return;
  const t = nearestTrigger();
  if (t && !t.auto) openDialogue(t.node, t);
}

function dodgeAction() {
  if (mode === 'combat' && dodge(fight)) player.dash();
}

const ADVANCE_KEYS = ['Space', 'KeyE', 'Enter', 'NumpadEnter'];
addEventListener('keydown', e => {
  if (e.repeat) return;
  if (mode === 'dialogue') {
    if (ADVANCE_KEYS.includes(e.code)) advance();
    const n = Number(e.code.match(/^Digit([1-9])$/)?.[1]);
    if (n && view?.choices && !ui.completeTyping() && n <= view.choices.length) show(dialogue.choose(n - 1));
  } else if (e.code === 'KeyE') interact();
  else if (e.code === 'Space') dodgeAction();
});
ui.onDialogClick(() => { if (mode === 'dialogue') advance(); });
ui.onPromptClick(interact);
```

찾기:
```js
  const dt = Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime;
```
바꾸기:
```js
  const dt = Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime;
  document.body.dataset.mode = mode;   // 터치 조작이 보일지는 CSS(body.touch[data-mode])가 정한다
```

찾기:
```js
  if (state.pendingFight && !FIGHTS[state.pendingFight]) state.pendingFight = null;
```
바꾸기:
```js
  if (state.pendingFight && !FIGHTS[state.pendingFight]) state.pendingFight = null;
  // 대본의 조작 안내가 이 플래그로 갈린다. 저장에 남아 있어도 이번 기기에 맞춰 다시 정한다.
  state.flags = state.flags.filter(f => f !== 'touch');
  if (TOUCH) state.flags.push('touch');
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `npm test`
Expected: PASS — 72 tests

- [ ] **Step 7: 브라우저에서 확인**

PC(1280×720):
- `body`에 `touch` 클래스가 없다. 캔버스 배율·그림자는 그대로(`renderer` 배율 = min(devicePixelRatio, 2)).
- 첫 안내가 키보드용("WASD로 걷고…")이다.
- 왕 근처에서 프롬프트가 `[E] 폐하를 뵙는다`이고, E와 **프롬프트 클릭** 둘 다 대화를 연다.
- 전투에서 Space 회피, 클릭 베기가 그대로 동작한다.

휴대폰 흉내(가로 844×390, 배율 3, 터치):
- `body.touch`, 캔버스 크기 1266×585(배율 1.5), 첫 안내가 터치용("왼쪽 화면을 끌어…").
- 키보드로 왕에게 걸어가면 프롬프트가 `폐하를 뵙는다`([E] 없음)이고, 프롬프트를 **탭**하면 대화가 열린다.
- 대화 중 `document.body.dataset.mode`가 `dialogue`, 탐험 중 `explore`.

휴대폰 흉내(세로 390×844): `camera.fov`가 70이다(뷰포트를 가로→세로로 바꾸면 55→70, 다시 가로로 바꾸면 55). 화면 확인으로 아코스가 가로보다 작게 보인다.

- [ ] **Step 8: 커밋**

```bash
git add src/main.js src/world.js src/ui.js index.html
git commit -m "feat: 터치 기기 판별, 휴대폰 화질·세로 시야각, 말 걸기 버튼, 소리 깨우기" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 조이스틱과 전투 버튼

**Files:**
- Create: `src/touch.js`
- Modify: `index.html` (자리·CSS), `src/main.js` (연결)
- Test: `tests/touch.test.js`(새)

**Interfaces:**
- Consumes: Task 2의 `player.setStick`, Task 5의 `TOUCH`·`interact`·`dodgeAction`, 기존 `attack`
- Produces: `createTouchControls({ onStick(axes|null), onAttack(), onDodge() })` — DOM 요소 `#stick-zone`, `#stick`, `#stick-knob`, `#btn-attack`, `#btn-dodge`를 쓴다. 조이스틱: 손가락을 댄 곳이 중심, 반지름 48px 안에서 손잡이가 따라가고 `{ f: -dy/48, r: dx/48 }`(길이 1로 자름)를 보낸다. 손을 떼면(창 전체의 `pointerup`·`pointercancel`) `null`. 다른 손가락은 무시, 새로 댄 손가락이 이어받는다. 버튼은 `pointerdown` 순간 동작.

- [ ] **Step 1: 실패하는 테스트 쓰기** — `tests/touch.test.js`

```js
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
const els = { 'stick-zone': element(), stick: element(), 'stick-knob': element(), 'btn-attack': element(), 'btn-dodge': element() };
globalThis.document = { getElementById: id => els[id] };

const calls = { stick: [], attack: 0, dodge: 0 };
createTouchControls({
  onStick: axes => calls.stick.push(axes),
  onAttack: () => { calls.attack += 1; },
  onDodge: () => { calls.dodge += 1; },
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

test('다른 손가락은 무시하고, 새로 댄 손가락이 이어받는다', () => {
  down(1, 100, 300);
  const count = calls.stick.length;
  move(2, 300, 300);
  up(2);
  assert.equal(calls.stick.length, count);
  down(3, 50, 200);
  move(3, 50, 152);
  assert.deepEqual(last(), { f: 1, r: 0 });
  up(1);
  assert.notEqual(last(), null);
  up(3);
  assert.equal(last(), null);
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

test('전투 버튼은 누르는 순간 동작한다', () => {
  els['btn-attack'].h.pointerdown({ preventDefault() {} });
  els['btn-dodge'].h.pointerdown({ preventDefault() {} });
  assert.equal(calls.attack, 1);
  assert.equal(calls.dodge, 1);
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test`
Expected: FAIL — `src/touch.js`를 찾을 수 없음

- [ ] **Step 3: 구현** — `src/touch.js`

```js
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
```

- [ ] **Step 4: 통과 확인**

Run: `npm test`
Expected: PASS — 77 tests

- [ ] **Step 5: index.html — 자리와 CSS**

찾기:
```html
  #error { background: rgba(0, 0, 0, 0.94); color: #f0c0b0; white-space: pre-wrap; }
</style>
```
바꾸기:
```html
  #error { background: rgba(0, 0, 0, 0.94); color: #f0c0b0; white-space: pre-wrap; }

  /* 터치 조작 — body.touch(휴대폰·태블릿)이고 탐험·전투 중일 때만 보인다 */
  body { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
  button, #dialog { touch-action: manipulation; }
  #stick-zone, #combat-buttons { display: none; }
  body.touch[data-mode="explore"] #stick-zone, body.touch[data-mode="combat"] #stick-zone { display: block; }
  body.touch[data-mode="combat"] #combat-buttons { display: flex; }
  #stick-zone { position: fixed; left: 0; top: 0; width: 50vw; height: 100%; touch-action: none; }
  #stick { position: absolute; left: calc(env(safe-area-inset-left, 0px) + 24px); bottom: calc(env(safe-area-inset-bottom, 0px) + 24px); width: 96px; height: 96px; border-radius: 50%; border: 2px solid rgba(201, 168, 106, 0.6); background: rgba(12, 10, 16, 0.3); opacity: 0.45; pointer-events: none; }
  #stick.on { opacity: 1; bottom: auto; }
  #stick-knob { position: absolute; left: 22px; top: 22px; width: 48px; height: 48px; border-radius: 50%; background: rgba(201, 168, 106, 0.65); }
  #combat-buttons { position: fixed; right: calc(env(safe-area-inset-right, 0px) + 20px); bottom: calc(env(safe-area-inset-bottom, 0px) + 24px); gap: 16px; align-items: flex-end; }
  #combat-buttons button { min-width: 0; width: 72px; height: 72px; padding: 0; border-radius: 50%; background: var(--panel); touch-action: none; }
  #combat-buttons #btn-attack { width: 88px; height: 88px; }
</style>
```

찾기:
```html
<canvas id="game"></canvas>
```
바꾸기:
```html
<canvas id="game"></canvas>
<div id="stick-zone"><div id="stick"><div id="stick-knob"></div></div></div>
<div id="combat-buttons"><button id="btn-dodge">피하기</button><button id="btn-attack">베기</button></div>
```

- [ ] **Step 6: main.js — 연결**

찾기:
```js
import { createPlayer } from './player.js';
```
바꾸기:
```js
import { createPlayer } from './player.js';
import { createTouchControls } from './touch.js';
```

찾기:
```js
ui.onPromptClick(interact);
```
바꾸기:
```js
ui.onPromptClick(interact);
if (TOUCH) createTouchControls({ onStick: axes => player?.setStick(axes), onAttack: attack, onDodge: dodgeAction });
```

- [ ] **Step 7: 테스트 통과 확인**

Run: `npm test`
Expected: PASS — 77 tests

- [ ] **Step 8: 브라우저에서 확인** (휴대폰 흉내 가로 844×390 → 세로 390×844, 그리고 PC)

휴대폰 흉내(터치 끌기는 CDP `Input.dispatchTouchEvent`):
- 타이틀·대화 중에는 조이스틱이 안 보이고(`getComputedStyle(#stick-zone).display === 'none'`), 탐험 중에는 왼쪽 아래에 흐린 원이 보인다.
- 저장 `{"v":1,"region":1,"day":1,"flags":["done:r1_open"],"memories":[],"pendingFight":null,"ended":false}`로 이어하기 → 왼쪽 화면(예: x=150, y=250)에서 위로 약간 오른쪽으로 끈 채(예: dx=+6, dy=−34) 유지 → 아코스가 왕 쪽으로 걸어가 프롬프트 `폐하를 뵙는다`가 뜬다 → 손을 떼면 선다 → 프롬프트 탭 → 대화.
- 끝까지 밀면(예: dy=−80) 달리기 동작(`Running_A`)이 보인다.
- **두 손가락**: 왼쪽 조이스틱을 누른 채 오른쪽 화면을 끌면 걸으면서 시야가 돈다.
- **조이스틱을 누른 채 자동 대화**: 저장 `{"v":1,"region":2,"day":1,"flags":[],"memories":[],"pendingFight":null,"ended":false}`로 이어하기 직전에 조이스틱을 누르고 있다가, 첫 대사가 뜨면 손을 뗀다 → 대화를 끝까지 넘긴 뒤 아코스가 혼자 걷지 않는다.
- 전투(저장의 `pendingFight: "road"`로 이어하기): 오른쪽 아래 [피하기]·[베기]가 보이고, [베기]를 눌러 적을 쓰러뜨려 이길 수 있다. [피하기]는 회피 동작을 한다.
- 뷰포트를 가로↔세로로 바꿔도 조이스틱·버튼이 화면 안(노치 영역 밖)에 있다.

PC(1280×720): 조이스틱·전투 버튼이 보이지 않고, 조작·화면이 Task 5 확인과 같다.

- [ ] **Step 9: 커밋**

```bash
git add src/touch.js src/main.js index.html tests/touch.test.js
git commit -m "feat: 터치 조이스틱과 전투 버튼" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: README와 최종 확인

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: Task 1~6 전부

- [ ] **Step 1: README — 휴대폰 접속·조작·도구**

찾기:
```markdown
최신 Chrome·Edge를 권장합니다. 인터넷 연결이 필요합니다(Three.js·글꼴을 CDN에서 받습니다).
```
바꾸기:
```markdown
최신 Chrome·Edge를 권장합니다. 인터넷 연결이 필요합니다(Three.js·글꼴을 CDN에서 받습니다).

휴대폰·태블릿에서는 GitHub Pages 주소(https://ywf2661.github.io/journeyOfAchos/)로 접속합니다. 가로·세로 모두 됩니다.
```

찾기:
```markdown
진행은 자동 저장됩니다(지역에 들어갈 때, 대화가 끝날 때).
```
바꾸기:
```markdown
휴대폰·태블릿:

| 조작 | 동작 |
|---|---|
| 왼쪽 화면 끌기 | 걷기 (끝까지 밀면 달리기) |
| 오른쪽 화면 끌기 | 시야 돌리기 |
| 아래에 뜨는 안내 누르기 | 말 걸기·살펴보기 |
| 대화창 누르기 | 대사 넘기기 |
| [베기]·[피하기] (전투) | 베기·피하기 (화면 탭도 베기) |

진행은 자동 저장됩니다(지역에 들어갈 때, 대화가 끝날 때).
```

찾기:
```markdown
    npm run fetch-assets # data/models.js 목록대로 KayKit 에셋을 다시 받기
```
바꾸기:
```markdown
    npm run fetch-assets # data/models.js 목록대로 KayKit 에셋을 다시 받기(캐릭터는 받은 직후 줄인다)
    npm run slim-assets  # 캐릭터 GLB에서 게임이 쓰는 애니메이션(ANIMATIONS)만 남기기
```

- [ ] **Step 2: 테스트**

Run: `npm test`
Expected: PASS — 77 tests

- [ ] **Step 3: 최종 확인** (스펙 8장 완료 기준)

- 휴대폰 흉내(가로·세로)에서 **터치만으로** 각 구간을 진행한다: 조이스틱 이동 → 말 걸기(프롬프트 탭) → 대사 넘기기(대화창 탭)·선택지(버튼 탭) → 전투([베기]·[피하기]) → 지역 전환 → 엔딩·끝 화면·처음으로. 구간은 저장 데이터를 넣어 시작해도 된다.
- 지역 1 첫 다운로드: `npm test`의 "11MB 이하" 테스트가 PASS이고, 실제 수치(테스트 메시지 또는 계산)를 기록해 둔다.
- PC에서 Task 5·6의 PC 확인 항목이 그대로다.
- 콘솔 오류가 없다.
- 확인하지 못한 것(아이폰 실제 소리, 실기기 fps·조작감)은 완료 보고에 그대로 적는다.

- [ ] **Step 4: 커밋**

```bash
git add README.md
git commit -m "docs: 휴대폰 접속·조작·slim-assets 안내" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
