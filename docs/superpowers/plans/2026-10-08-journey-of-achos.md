# Journey of Achos 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기사 아코스가 시간의 마술사 아이온을 찾아가 사랑에 빠지는 30분 분량의 3D 웹 RPG(탐험 + 대화 + 가벼운 전투)를 만든다.

**Architecture:** 빌드 없는 ES Module 정적 사이트. 게임 규칙(대화, 진행, 저장, 전투, 기하)은 DOM·Three.js에 의존하지 않는 순수 모듈로 두고 `node --test`로 검증한다. 3D 표현(`world.js`, `player.js`)과 DOM(`ui.js`)은 얇게 유지하고, `main.js`가 둘을 잇는다. 대사와 지역 배치는 `data/`의 순수 데이터다.

**Tech Stack:** Three.js 0.170.0(jsDelivr CDN, importmap), 브라우저 ES Module, Node 20+ 내장 테스트 러너, KayKit CC0 glTF 에셋, Google Fonts 나눔명조.

**Spec:** `docs/superpowers/specs/2026-10-08-journey-of-achos-design.md`

**스펙과 달라진 점** (구현하며 정한 것)
- 모든 지역은 **평지(y = 0)**다. 지면 높이 레이캐스트(스펙 5-1)는 필요가 없어서 뺐다. 높낮이는 산·언덕 모델을 배경으로 둬서 표현한다.
- 순수 로직을 테스트할 수 있게 파일을 몇 개 더 둔다: `src/geom.js`(이동·충돌·공격 범위), `src/region.js`(지역 데이터 해석), `data/regions.js`(지역 배치·전투 정의), `data/models.js`(모델 목록), `tools/fetch-assets.mjs`(에셋 다운로드), `package.json`(`"type": "module"`과 스크립트만, 의존성 없음).
- 이름을 알기 전 아이온의 화자 표시는 `???`가 아니라 **`마술사`**다(나레이션 호칭과 맞춤).
- 저장 데이터에 `v`(형식 버전), `pendingFight`(진행 중인 전투), `ended`를 더한다.

## Global Constraints

- 런타임 의존성은 CDN의 Three.js **0.170.0** 하나뿐이다. npm 패키지를 설치하지 않는다. `package.json`에는 `"type": "module"`과 `scripts`만 둔다.
- 테스트는 Node 20 이상에서 `npm test`(= `node --test`)로, **저장소 루트에서** 실행한다.
- `src/story.js`, `src/geom.js`, `src/region.js`, `src/combat.js`, `data/*.js`는 `three`를 import하거나 DOM에 접근하지 않는다(Node에서 테스트할 수 있어야 한다).
- 모든 3D 에셋은 KayKit(Kay Lousberg) CC0이고 `CREDITS.md`에 출처를 적는다.
- 게임 내 텍스트는 한국어다. 본편과 달리 이름(아코스, 아이온)을 직접 쓴다.
- 이 시점의 아이온은 비극 이전이다: 눈을 가린 베일 없음, 마녀의 시계 없음. 왕의 부탁·회랑·아코스의 죽음은 보여 주지 않고 암시만 한다.
- 역병의 시각 표현: 검게 번지는 딱지 + 병든 황록빛(`#9acd32` 계열).
- localStorage 키는 `journeyOfAchos.save`이다.
- 키 입력은 `KeyboardEvent.code`로 읽는다(한글 입력 상태에서도 동작해야 한다).
- 목표 성능: 일반 노트북의 최신 Chrome·Edge에서 60fps, 최소 30fps.
- 로컬 실행: 저장소 루트에서 `python -m http.server 8000` → `http://localhost:8000`.
- 이 PC의 curl은 사내망 인증서 문제로 jsDelivr 등에 붙을 때 `--ssl-no-revoke`가 필요하다(브라우저와 Node fetch는 영향 없음).
- 브라우저 확인 단계는 사람이 직접 보거나 `run` 스킬로 확인한다. 확인하지 못한 항목은 완료로 보고하지 않는다.
- 커밋 메시지는 한국어로 쓰고, 끝에 `-m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`를 붙인다.

## Review Focus

1. **전투 중이거나 전투 직후 대사 중에 새로고침** → "이어하기"를 누르면 그 전투부터 다시 시작해야 한다(트리거는 이미 끝났는데 전투가 사라져 진행이 막히면 안 된다). → Task 2 테스트, Task 9 브라우저 확인.
2. **저장 데이터가 깨졌거나 형식이 다르거나, localStorage 접근 자체가 막힌 경우**(시크릿 모드, 사이트 데이터 차단) → 크래시 없이 "새로 시작"만 보이고, 저장 없이도 끝까지 진행된다. → Task 2 테스트.
3. **한글 입력 상태에서 WASD·E·Space·숫자키** → 영문 상태와 똑같이 동작한다. → Task 7·8 브라우저 확인(`e.code` 사용).
4. **키를 누른 채 대화가 열리거나 창이 포커스를 잃음** → 대화가 끝난 뒤나 창으로 돌아왔을 때 아코스가 혼자 계속 걷지 않는다. → Task 8 브라우저 확인.
5. **에셋 파일 누락, CDN 로드 실패, WebGL 미지원** → 검은 화면이 아니라 무엇이 실패했는지 알려 주는 오류 화면이 뜬다. → Task 5 테스트(파일 존재), Task 7 브라우저 확인.

---

## 파일 구조

```
package.json              "type": "module" + 스크립트(test, serve, fetch-assets)
index.html                캔버스, 오버레이 DOM·CSS, importmap
CREDITS.md                에셋·라이브러리·폰트 출처
README.md                 실행·조작·테스트·배포 안내
src/
  story.js                순수: 상태, 대화 진행, 효과 적용, 저장/불러오기
  geom.js                 순수: 이동 방향, 충돌 밀어내기, 공격 부채꼴, 원 줄 세우기
  region.js               순수: 날짜·플래그에 맞는 배우·트리거·충돌체·조명 고르기
  combat.js               순수: 전투 상태 진행(적 접근·공격 준비·피격·회피·베기)
  world.js                Three: 모델 로드·복제, 지역 조립, 조명 프리셋, 코드로 만든 소품
  player.js               Three 객체 조작: 3인칭 이동, 카메라, 클릭, 회피 대시
  ui.js                   DOM: 대화창, 프롬프트, 토스트, HUD, 페이드, 타이틀/엔딩, 오류, 시계 소리
  main.js                 진입점: 렌더러, 게임 루프, 모드 전환
data/
  models.js               모델 키 → 파일 경로·배율
  regions.js              지역 3개 배치 + 전투 정의(FIGHTS)
  script.js               모든 대사(SCRIPT)와 기억 조각 이름(MEMORIES)
tools/
  fetch-assets.mjs        data/models.js 목록대로 KayKit 에셋을 assets/에 받는다
assets/kaykit/...         받은 에셋(커밋한다)
tests/
  story.test.js  geom.test.js  region.test.js  combat.test.js  assets.test.js  content.test.js
```

---

### Task 1: 프로젝트 뼈대와 대화 엔진

**Files:**
- Create: `package.json`
- Create: `src/story.js`
- Test: `tests/story.test.js`

**Interfaces:**
- Produces:
  - `createState(): State` — `State = { v: 1, region: 1|2|3, day: 1|2|3, flags: string[], memories: string[], pendingFight: string|null, ended: boolean }`
  - `has(state, expr?: string): boolean` — `expr`가 없으면 true. `'!x'`는 부정. 플래그와 기억 조각 id를 모두 본다.
  - `createDialogue(script, state)` → `{ start(id): View|null, next(): View|null, choose(i): View|null, takeEffects(): string[] }`
  - `View = { who: string, text: string, choices: string[]|null, memory: string|null }`
  - `speakerName(who, state): string` — `'@aion'`은 `knows_name` 플래그가 있으면 `'아이온'`, 없으면 `'마술사'`. 나머지는 그대로.
  - 노드 형식(`script[id]`): `{ who?, text?, next?, choices?: [{ text, next?, set?, if? }], if?, set?, memory?, do? }`

- [ ] **Step 1: package.json 만들기**

```json
{
  "name": "journey-of-achos",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test",
    "serve": "python -m http.server 8000",
    "fetch-assets": "node tools/fetch-assets.mjs"
  }
}
```

- [ ] **Step 2: 실패하는 테스트 쓰기** — `tests/story.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, has, createDialogue, speakerName } from '../src/story.js';

const SCRIPT = {
  a: { who: 'x', text: '첫 줄', next: 'b' },
  b: { who: 'y', text: '둘째 줄', choices: [
    { text: '하나', next: 'c', set: 'one' },
    { text: '숨김', if: 'secret', next: 'c' },
    { text: '둘', next: 'd' },
  ] },
  c: { if: 'one', who: 'x', text: '하나를 골랐다', next: 'd' },
  d: { who: '', text: '끝', memory: 'm1', do: 'nextDay' },
  act: { set: 'silent', next: 'a' },
};

test('대사를 차례로 넘긴다', () => {
  const d = createDialogue(SCRIPT, createState());
  assert.deepEqual(d.start('a'), { who: 'x', text: '첫 줄', choices: null, memory: null });
  assert.equal(d.next().text, '둘째 줄');
});

test('조건이 거짓인 선택지는 숨긴다', () => {
  const d = createDialogue(SCRIPT, createState());
  assert.deepEqual(d.start('b').choices, ['하나', '둘']);
});

test('선택지 번호는 보이는 선택지 기준이고, set은 고른 선택지만 적용한다', () => {
  const s = createState();
  const d = createDialogue(SCRIPT, s);
  d.start('b');
  assert.equal(d.choose(1).text, '끝');
  assert.equal(has(s, 'one'), false);
});

test('선택지의 set이 플래그를 켜고, if가 참인 노드를 보여 준다', () => {
  const s = createState();
  const d = createDialogue(SCRIPT, s);
  d.start('b');
  assert.equal(d.choose(0).text, '하나를 골랐다');
  assert.equal(has(s, 'one'), true);
});

test('if가 거짓인 노드는 보여 주지 않고 next로 넘어간다', () => {
  assert.equal(createDialogue(SCRIPT, createState()).start('c').text, '끝');
});

test('memory는 한 번만 얻고, do는 대화가 끝난 뒤 한 번만 꺼낸다', () => {
  const s = createState();
  const d = createDialogue(SCRIPT, s);
  assert.equal(d.start('d').memory, 'm1');
  assert.deepEqual(s.memories, ['m1']);
  assert.equal(d.next(), null);
  assert.deepEqual(d.takeEffects(), ['nextDay']);
  assert.deepEqual(d.takeEffects(), []);
  createDialogue(SCRIPT, s).start('d');
  assert.deepEqual(s.memories, ['m1']);
});

test('글이 없는 노드는 효과만 적용하고 지나간다', () => {
  const s = createState();
  assert.equal(createDialogue(SCRIPT, s).start('act').text, '첫 줄');
  assert.equal(has(s, 'silent'), true);
});

test('선택지 노드에서 next는 그대로 머물고, 없는 번호는 무시한다', () => {
  const d = createDialogue(SCRIPT, createState());
  d.start('b');
  assert.deepEqual(d.next().choices, ['하나', '둘']);
  assert.deepEqual(d.choose(5).choices, ['하나', '둘']);
});

test('대화가 끝난 뒤의 next와 choose는 null', () => {
  const d = createDialogue(SCRIPT, createState());
  d.start('d');
  d.next();
  assert.equal(d.next(), null);
  assert.equal(d.choose(0), null);
});

test('없는 노드로 가면 예외를 던진다', () => {
  assert.throws(() => createDialogue(SCRIPT, createState()).start('zz'), /없는 노드/);
});

test('has는 플래그와 기억 조각을 함께 보고 !로 뒤집는다', () => {
  const s = { ...createState(), flags: ['f'], memories: ['m'] };
  assert.equal(has(s, 'f'), true);
  assert.equal(has(s, 'm'), true);
  assert.equal(has(s, '!f'), false);
  assert.equal(has(s, '!x'), true);
  assert.equal(has(s, undefined), true);
});

test('아이온은 이름을 알기 전에는 마술사로 표시한다', () => {
  const s = createState();
  assert.equal(speakerName('@aion', s), '마술사');
  s.flags.push('knows_name');
  assert.equal(speakerName('@aion', s), '아이온');
  assert.equal(speakerName('왕', s), '왕');
  assert.equal(speakerName('', s), '');
});
```

- [ ] **Step 3: 실패 확인**

Run: `npm test`
Expected: FAIL — `Cannot find module ... src/story.js`

- [ ] **Step 4: 구현** — `src/story.js`

```js
// 순수 게임 규칙: 상태, 대화 진행, 효과 적용, 저장. DOM·Three.js에 의존하지 않는다.

export function createState() {
  return { v: 1, region: 1, day: 1, flags: [], memories: [], pendingFight: null, ended: false };
}

export function has(state, expr) {
  if (!expr) return true;
  if (expr.startsWith('!')) return !has(state, expr.slice(1));
  return state.flags.includes(expr) || state.memories.includes(expr);
}

function addFlag(state, flag) {
  if (!state.flags.includes(flag)) state.flags.push(flag);
}

export const speakerName = (who, state) =>
  who === '@aion' ? (has(state, 'knows_name') ? '아이온' : '마술사') : who;

// 노드 형식은 스펙 5-2 참고. set·memory는 노드에 들어설 때 바로 적용하고,
// do는 모아 뒀다가 대화가 끝난 뒤 takeEffects()로 꺼낸다.
export function createDialogue(script, state) {
  let node = null;
  const effects = [];

  function go(id) {
    for (let guard = 0; id; guard++) {
      if (guard > 1000) throw new Error(`대화가 끝없이 돈다: ${id}`);
      const n = script[id];
      if (!n) throw new Error(`없는 노드: ${id}`);
      if (!has(state, n.if)) { id = n.next; continue; }
      if (n.set) addFlag(state, n.set);
      if (n.memory && !state.memories.includes(n.memory)) state.memories.push(n.memory);
      if (n.do) effects.push(n.do);
      if (n.text || n.choices) { node = n; return view(); }
      id = n.next;
    }
    node = null;
    return null;
  }

  const visible = () => node.choices.filter(c => has(state, c.if));

  function view() {
    return {
      who: node.who ?? '',
      text: node.text ?? '',
      choices: node.choices ? visible().map(c => c.text) : null,
      memory: node.memory ?? null,
    };
  }

  return {
    start: go,
    next() {
      if (!node) return null;
      if (node.choices) return view();
      return go(node.next);
    },
    choose(i) {
      if (!node) return null;
      if (!node.choices) return view();
      const c = visible()[i];
      if (!c) return view();
      if (c.set) addFlag(state, c.set);
      return go(c.next);
    },
    takeEffects: () => effects.splice(0),
  };
}
```

- [ ] **Step 5: 통과 확인**

Run: `npm test`
Expected: PASS — 12 tests

- [ ] **Step 6: 커밋**

```bash
git add package.json src/story.js tests/story.test.js
git commit -m "feat: 대화 엔진(노드 진행, 선택지, 조건, 기억 조각)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 진행 효과와 저장

**Files:**
- Modify: `src/story.js` (파일 끝에 추가)
- Test: `tests/story.test.js` (파일 끝에 추가)

**Interfaces:**
- Consumes: Task 1의 `createState`, `has`, 내부 `addFlag`
- Produces:
  - `markDone(state, trigger: { id })` — `done:<id>` 플래그를 켠다.
  - `applyEffect(state, fx: string): { type: 'reload' } | { type: 'combat', id } | { type: 'ending' }` — `nextDay`(day+1), `region:<n>`(region=n, day=1), `combat:<id>`(pendingFight=id), `ending`(ended=true). 모르는 효과는 예외.
  - `winFight(state, fights): string` — pendingFight를 비우고 `won:<id>` 플래그를 켠 뒤 `fights[id].then` 노드 id를 돌려준다.
  - `SAVE_KEY = 'journeyOfAchos.save'`
  - `saveGame(storage, state): boolean`, `loadGame(storage): State|null`, `clearSave(storage): void` — storage가 null이거나 예외를 던져도 밖으로 던지지 않는다.

- [ ] **Step 1: 실패하는 테스트 추가** — `tests/story.test.js` 맨 위 import를 아래로 바꾸고, 파일 끝에 테스트를 붙인다.

```js
import { createState, has, createDialogue, speakerName, markDone, applyEffect, winFight, SAVE_KEY, saveGame, loadGame, clearSave } from '../src/story.js';
```

```js
test('효과: 다음 날, 지역 이동, 엔딩', () => {
  const s = createState();
  assert.deepEqual(applyEffect(s, 'nextDay'), { type: 'reload' });
  assert.equal(s.day, 2);
  assert.deepEqual(applyEffect(s, 'region:3'), { type: 'reload' });
  assert.equal(s.region, 3);
  assert.equal(s.day, 1);
  assert.deepEqual(applyEffect(s, 'ending'), { type: 'ending' });
  assert.equal(s.ended, true);
  assert.throws(() => applyEffect(s, 'dance'), /모르는 효과/);
});

test('전투 효과는 진행 중인 전투를 기록하고, 이기면 지우고 이어질 노드를 준다', () => {
  const s = createState();
  assert.deepEqual(applyEffect(s, 'combat:road'), { type: 'combat', id: 'road' });
  assert.equal(s.pendingFight, 'road');
  assert.equal(winFight(s, { road: { then: 'after' } }), 'after');
  assert.equal(s.pendingFight, null);
  assert.equal(has(s, 'won:road'), true);
});

test('markDone은 done:<id> 플래그를 켠다', () => {
  const s = createState();
  markDone(s, { id: 't1' });
  assert.equal(has(s, 'done:t1'), true);
});

function memStorage() {
  const m = new Map();
  return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) };
}
const denied = () => { throw new Error('denied'); };
const brokenStorage = { getItem: denied, setItem: denied, removeItem: denied };

test('저장하고 불러오면 같은 상태다(진행 중인 전투 포함)', () => {
  const st = memStorage();
  const s = createState();
  s.region = 2; s.day = 3; s.flags.push('soldiers'); s.memories.push('mem_ring'); s.pendingFight = 'freeze';
  assert.equal(saveGame(st, s), true);
  assert.deepEqual(loadGame(st), s);
});

test('저장이 없거나 깨졌거나 형식이 다르면 null', () => {
  const st = memStorage();
  assert.equal(loadGame(st), null);
  for (const raw of ['{', 'null', '42', '{"v":2}', JSON.stringify({ ...createState(), region: 9 }),
    JSON.stringify({ ...createState(), flags: [1] }), JSON.stringify({ ...createState(), ended: true })]) {
    st.setItem(SAVE_KEY, raw);
    assert.equal(loadGame(st), null, raw);
  }
});

test('저장소가 막혀 있거나 없어도 예외 없이 넘어간다', () => {
  assert.equal(saveGame(brokenStorage, createState()), false);
  assert.equal(loadGame(brokenStorage), null);
  assert.doesNotThrow(() => clearSave(brokenStorage));
  assert.equal(saveGame(null, createState()), false);
  assert.equal(loadGame(null), null);
});

test('clearSave 뒤에는 불러올 것이 없다', () => {
  const st = memStorage();
  saveGame(st, createState());
  clearSave(st);
  assert.equal(loadGame(st), null);
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test`
Expected: FAIL — `markDone`(등)이 export되지 않았다는 SyntaxError

- [ ] **Step 3: 구현** — `src/story.js` 끝에 추가

```js
export function markDone(state, trigger) {
  addFlag(state, `done:${trigger.id}`);
}

// 대화가 끝난 뒤 do 효과를 상태에 반영하고, 화면 쪽에서 할 일을 돌려준다.
export function applyEffect(state, fx) {
  const [kind, arg] = fx.split(':');
  switch (kind) {
    case 'nextDay': state.day += 1; return { type: 'reload' };
    case 'region': state.region = Number(arg); state.day = 1; return { type: 'reload' };
    case 'combat': state.pendingFight = arg; return { type: 'combat', id: arg };
    case 'ending': state.ended = true; return { type: 'ending' };
    default: throw new Error(`모르는 효과: ${fx}`);
  }
}

export function winFight(state, fights) {
  const id = state.pendingFight;
  state.pendingFight = null;
  addFlag(state, `won:${id}`);
  return fights[id].then;
}

export const SAVE_KEY = 'journeyOfAchos.save';

export function saveGame(storage, state) {
  try { storage.setItem(SAVE_KEY, JSON.stringify(state)); return true; } catch { return false; }
}

const isStrings = a => Array.isArray(a) && a.every(x => typeof x === 'string');

function isValidSave(s) {
  return s?.v === 1 && [1, 2, 3].includes(s.region) && [1, 2, 3].includes(s.day)
    && isStrings(s.flags) && isStrings(s.memories)
    && (s.pendingFight === null || typeof s.pendingFight === 'string')
    && s.ended === false;
}

export function loadGame(storage) {
  try {
    const s = JSON.parse(storage.getItem(SAVE_KEY));
    return isValidSave(s) ? s : null;
  } catch {
    return null;
  }
}

export function clearSave(storage) {
  try { storage.removeItem(SAVE_KEY); } catch { /* 저장소가 막혀 있으면 지울 것도 없다 */ }
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test`
Expected: PASS — 19 tests

- [ ] **Step 5: 커밋**

```bash
git add src/story.js tests/story.test.js
git commit -m "feat: 진행 효과(다음 날·지역·전투·엔딩)와 저장/불러오기" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 기하와 지역 데이터 해석

**Files:**
- Create: `src/geom.js`, `src/region.js`
- Test: `tests/geom.test.js`, `tests/region.test.js`

**Interfaces:**
- Consumes: Task 1의 `has`
- Produces (`geom.js`):
  - `moveVector(keys: {w,a,s,d}, camYaw): {x,z}|null` — 카메라 기준 이동 방향(길이 1). 카메라는 `(sin yaw, cos yaw)` 쪽 뒤에서 플레이어를 본다.
  - `facingOf(v): number` — `atan2(v.x, v.z)`. 방향각 θ의 앞쪽은 `(sin θ, cos θ)`이다(Three.js `rotation.y`와 같은 규약).
  - `dist(a, b): number`
  - `resolve(p, radius, obstacles: {x,z,r}[], bounds: {minX,maxX,minZ,maxZ}): {x,z}`
  - `inArc(from, facing, to, range, halfAngle): boolean`
  - `circlesAlong(x1, z1, x2, z2, r): {x,z,r}[]` — 선분을 빈틈없이 덮는 원들(간격 ≤ r)
- Produces (`region.js`):
  - `matches(item: { day?, if? }, state): boolean` — `day`는 숫자 또는 배열
  - `lightFor(region, state): string` — `region.light`가 문자열이면 그대로, 객체면 `light[state.day]`
  - `actorsFor(region, state)`, `triggersFor(region, state)` — 조건에 맞는 것만(트리거는 `done:<id>`도 제외)
  - `obstaclesFor(region, state): {x,z,r}[]` — `r`이 있는 소품 + 보이는 배우(r 0.7) + 벽 선분(r 1.5 원들) + 조건에 맞는 차단물
- 지역 데이터 형식(`data/regions.js`, Task 6):
  `{ name, light, ground, bounds, start: {x,z,rot}, props: [{m,x,z,rot?,y?,scale?,tint?,r?}], procs: [{kind,...}], walls: [[x1,z1,x2,z2]], blockers?: [{x,z,r,if?,day?}], actors: [{m,x,z,rot?,y?,scale?,tint?,anim?,day?,if?}], triggers: [{id,node,x,z,r,auto?,ends?,label?,day?,if?}] }`

- [ ] **Step 1: 실패하는 테스트 쓰기** — `tests/geom.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { moveVector, facingOf, dist, resolve, inArc, circlesAlong } from '../src/geom.js';

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≈ ${b}`);

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

test('facingOf: +z는 0, +x는 π/2', () => {
  near(facingOf({ x: 0, z: 1 }), 0);
  near(facingOf({ x: 1, z: 0 }), Math.PI / 2);
});

test('resolve: 장애물 안으로 들어가면 바깥으로 밀어낸다', () => {
  const p = resolve({ x: 0.5, z: 0 }, 0.5, [{ x: 0, z: 0, r: 1 }], { minX: -9, maxX: 9, minZ: -9, maxZ: 9 });
  near(dist(p, { x: 0, z: 0 }), 1.5);
});

test('resolve: 장애물 정중앙이면 +x로 밀어내고, 경계 밖은 잘라 낸다', () => {
  const b = { minX: -5, maxX: 5, minZ: -5, maxZ: 5 };
  assert.deepEqual(resolve({ x: 0, z: 0 }, 0.5, [{ x: 0, z: 0, r: 1 }], b), { x: 1.5, z: 0 });
  assert.deepEqual(resolve({ x: 9, z: -9 }, 0.5, [], b), { x: 5, z: -5 });
});

test('inArc: 앞쪽 사거리 안만 맞는다', () => {
  const o = { x: 0, z: 0 };
  assert.equal(inArc(o, 0, { x: 0, z: 2 }, 2.4, Math.PI / 3), true);
  assert.equal(inArc(o, 0, { x: 0, z: -2 }, 2.4, Math.PI / 3), false);
  assert.equal(inArc(o, 0, { x: 0, z: 3 }, 2.4, Math.PI / 3), false);
  assert.equal(inArc(o, 0, { x: 2, z: 0.1 }, 2.4, Math.PI / 3), false);
  assert.equal(inArc(o, 0, o, 2.4, Math.PI / 3), true);
});

test('circlesAlong: 양 끝을 포함하고 간격이 r 이하다', () => {
  const cs = circlesAlong(0, 0, 10, 0, 1.5);
  assert.deepEqual(cs[0], { x: 0, z: 0, r: 1.5 });
  assert.deepEqual(cs.at(-1), { x: 10, z: 0, r: 1.5 });
  for (let i = 1; i < cs.length; i++) assert.ok(dist(cs[i], cs[i - 1]) <= 1.5 + 1e-9);
});
```

- [ ] **Step 2: 실패하는 테스트 쓰기** — `tests/region.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../src/story.js';
import { matches, lightFor, actorsFor, triggersFor, obstaclesFor } from '../src/region.js';

const REGION = {
  light: { 1: 'dusk', 2: 'day' },
  props: [{ m: 'rock', x: 1, z: 1, r: 2 }, { m: 'cloud', x: 9, z: 9 }],
  walls: [[0, 0, 3, 0]],
  blockers: [{ x: 5, z: 5, r: 2, if: '!gate_open' }],
  actors: [{ m: 'mage', x: 0, z: 4, day: 1 }, { m: 'mage', x: 0, z: 8, day: [2, 3] }],
  triggers: [{ id: 't1', node: 'n', x: 0, z: 0, r: 2, if: 'ready' }, { id: 't2', node: 'n', x: 0, z: 0, r: 2 }],
};

test('matches: 날짜(숫자·배열)와 플래그 조건', () => {
  const s = createState();
  assert.equal(matches({ day: 1 }, s), true);
  assert.equal(matches({ day: [2, 3] }, s), false);
  assert.equal(matches({ if: 'x' }, s), false);
  s.flags.push('x');
  assert.equal(matches({ if: 'x', day: 1 }, s), true);
});

test('lightFor: 문자열이면 그대로, 객체면 날짜별', () => {
  const s = createState();
  assert.equal(lightFor({ light: 'night' }, s), 'night');
  s.day = 2;
  assert.equal(lightFor(REGION, s), 'day');
});

test('actorsFor·triggersFor: 조건에 맞고 끝나지 않은 것만', () => {
  const s = createState();
  assert.deepEqual(actorsFor(REGION, s).map(a => a.z), [4]);
  assert.deepEqual(triggersFor(REGION, s).map(t => t.id), ['t2']);
  s.flags.push('ready', 'done:t2');
  assert.deepEqual(triggersFor(REGION, s).map(t => t.id), ['t1']);
});

test('obstaclesFor: 소품·배우·벽·조건부 차단물', () => {
  const s = createState();
  const obs = obstaclesFor(REGION, s);
  assert.ok(obs.some(o => o.x === 1 && o.z === 1 && o.r === 2));
  assert.ok(!obs.some(o => o.x === 9));
  assert.ok(obs.some(o => o.x === 0 && o.z === 4 && o.r === 0.7));
  assert.ok(obs.some(o => o.x === 3 && o.z === 0 && o.r === 1.5));
  assert.ok(obs.some(o => o.x === 5 && o.z === 5));
  s.flags.push('gate_open');
  assert.ok(!obstaclesFor(REGION, s).some(o => o.x === 5 && o.z === 5));
});
```

- [ ] **Step 3: 실패 확인**

Run: `npm test`
Expected: FAIL — `src/geom.js`, `src/region.js`를 찾을 수 없음

- [ ] **Step 4: 구현** — `src/geom.js`

```js
// 순수 기하: x,z 평면만 다룬다. 방향각 θ의 앞쪽은 (sin θ, cos θ)이다(Three.js rotation.y와 같은 규약).

// 카메라는 (sin yaw, cos yaw) 쪽 뒤에서 플레이어를 본다. 화면 기준 WASD를 월드 방향으로 바꾼다.
export function moveVector(keys, camYaw) {
  const f = (keys.w ? 1 : 0) - (keys.s ? 1 : 0);
  const r = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
  if (!f && !r) return null;
  const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw);
  const x = fx * f - fz * r, z = fz * f + fx * r;
  const len = Math.hypot(x, z);
  return { x: x / len, z: z / len };
}

export const facingOf = v => Math.atan2(v.x, v.z);

export const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

// 원형 장애물 밖으로 밀어내고 지역 경계 안으로 잘라 낸다.
export function resolve(p, radius, obstacles, bounds) {
  let { x, z } = p;
  for (const o of obstacles) {
    const dx = x - o.x, dz = z - o.z, d = Math.hypot(dx, dz), min = o.r + radius;
    if (d >= min) continue;
    if (d === 0) { x = o.x + min; continue; }
    x = o.x + (dx / d) * min;
    z = o.z + (dz / d) * min;
  }
  return {
    x: Math.min(bounds.maxX, Math.max(bounds.minX, x)),
    z: Math.min(bounds.maxZ, Math.max(bounds.minZ, z)),
  };
}

export function inArc(from, facing, to, range, halfAngle) {
  const dx = to.x - from.x, dz = to.z - from.z, d = Math.hypot(dx, dz);
  if (d > range) return false;
  if (d === 0) return true;
  return (dx * Math.sin(facing) + dz * Math.cos(facing)) / d >= Math.cos(halfAngle);
}

// 벽 같은 선분을 원 충돌체로 바꾼다. 간격이 r 이하라 사이로 빠져나갈 틈이 없다.
export function circlesAlong(x1, z1, x2, z2, r) {
  const n = Math.max(1, Math.ceil(Math.hypot(x2 - x1, z2 - z1) / r));
  return Array.from({ length: n + 1 }, (_, i) => ({ x: x1 + ((x2 - x1) * i) / n, z: z1 + ((z2 - z1) * i) / n, r }));
}
```

- [ ] **Step 5: 구현** — `src/region.js`

```js
// 지역 데이터 해석: 지금 날짜·플래그에 맞는 배우, 트리거, 충돌체, 조명 프리셋을 고른다.
import { has } from './story.js';
import { circlesAlong } from './geom.js';

export function matches(item, state) {
  if (item.day !== undefined && ![].concat(item.day).includes(state.day)) return false;
  return has(state, item.if);
}

export const lightFor = (region, state) =>
  typeof region.light === 'string' ? region.light : region.light[state.day];

export const actorsFor = (region, state) => region.actors.filter(a => matches(a, state));

export const triggersFor = (region, state) =>
  region.triggers.filter(t => matches(t, state) && !has(state, `done:${t.id}`));

export function obstaclesFor(region, state) {
  return [
    ...region.props.filter(p => p.r).map(({ x, z, r }) => ({ x, z, r })),
    ...actorsFor(region, state).map(({ x, z }) => ({ x, z, r: 0.7 })),
    ...region.walls.flatMap(([x1, z1, x2, z2]) => circlesAlong(x1, z1, x2, z2, 1.5)),
    ...(region.blockers ?? []).filter(b => matches(b, state)).map(({ x, z, r }) => ({ x, z, r })),
  ];
}
```

- [ ] **Step 6: 통과 확인**

Run: `npm test`
Expected: PASS — 31 tests

- [ ] **Step 7: 커밋**

```bash
git add src/geom.js src/region.js tests/geom.test.js tests/region.test.js
git commit -m "feat: 이동·충돌·공격 범위 기하와 지역 데이터 해석" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 전투 규칙

**Files:**
- Create: `src/combat.js`
- Test: `tests/combat.test.js`

**Interfaces:**
- Consumes: Task 3의 `dist`, `inArc`
- Produces:
  - 상수: `PLAYER_MAX_HP = 5`, `ENEMY_HP = 3`, `ENEMY_SPEED = 2.2`, `ENEMY_REACH = 1.4`, `ENEMY_WINDUP = 0.5`, `ENEMY_COOLDOWN = 1.2`, `SWING_RANGE = 2.4`, `SWING_HALF = π/3`, `SWING_COOLDOWN = 0.45`, `DODGE_TIME = 0.4`
  - 전투 정의 `FightDef = { enemies: [x, z][], then: string, frozen?: boolean, enemyHp?: number, timeLimit?: number, player?: [x, z, rot] }`
  - `createFight(def): Fight` — `Fight = { def, hp, enemies: {x,z,hp,cd,windup}[], time, swingCd, invuln, result: null|'won'|'lost' }`
  - `update(fight, dt, player: {x,z}): string[]` — 이벤트 `'windup:<i>'`, `'hurt'`, `'lost'`
  - `swing(fight, player: {x,z,facing}): string[]` — 쿨다운 중이면 `[]`, 아니면 `'swing'`과 `'hit:<i>'`, `'down:<i>'`, `'won'`
  - `dodge(fight): boolean` — 무적 시간을 시작했으면 true

- [ ] **Step 1: 실패하는 테스트 쓰기** — `tests/combat.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFight, update, swing, dodge, PLAYER_MAX_HP, ENEMY_HP, ENEMY_REACH, ENEMY_SPEED } from '../src/combat.js';

const P = { x: 0, z: 0, facing: 0 };   // +z를 바라본다

test('전투를 만들면 아코스 체력 5, 적 체력은 기본값 또는 지정값', () => {
  const f = createFight({ enemies: [[0, 5], [1, 5]] });
  assert.equal(f.hp, PLAYER_MAX_HP);
  assert.deepEqual(f.enemies.map(e => e.hp), [ENEMY_HP, ENEMY_HP]);
  assert.equal(createFight({ enemies: [[0, 5]], enemyHp: 1 }).enemies[0].hp, 1);
});

test('적은 아코스 쪽으로 다가오다 공격 거리에서 멈춘다', () => {
  const f = createFight({ enemies: [[0, 10]] });
  update(f, 1, P);
  assert.ok(Math.abs(f.enemies[0].z - (10 - ENEMY_SPEED)) < 1e-9);
  for (let i = 0; i < 100; i++) update(f, 0.05, P);
  assert.ok(f.enemies[0].z >= ENEMY_REACH - 1e-9);
});

test('공격 거리 안이면 준비 동작 뒤에 맞는다', () => {
  const f = createFight({ enemies: [[0, 1]] });
  assert.deepEqual(update(f, 0.01, P), ['windup:0']);
  assert.deepEqual(update(f, 0.5, P), ['hurt']);
  assert.equal(f.hp, PLAYER_MAX_HP - 1);
});

test('준비 동작 끝 무렵에 피하면 맞지 않는다', () => {
  const f = createFight({ enemies: [[0, 1]] });
  update(f, 0.01, P);
  update(f, 0.2, P);
  assert.equal(dodge(f), true);
  assert.equal(dodge(f), false);
  assert.deepEqual(update(f, 0.3, P), []);
  assert.equal(f.hp, PLAYER_MAX_HP);
});

test('베기는 앞쪽 적만 맞히고, 쿨다운 동안은 나가지 않는다', () => {
  const f = createFight({ enemies: [[0, 2], [0, -2]] });
  assert.deepEqual(swing(f, P), ['swing', 'hit:0']);
  assert.deepEqual(f.enemies.map(e => e.hp), [ENEMY_HP - 1, ENEMY_HP]);
  assert.deepEqual(swing(f, P), []);
  update(f, 0.5, P);
  assert.deepEqual(swing(f, P), ['swing', 'hit:0']);
});

test('모두 쓰러뜨리면 이긴다', () => {
  const f = createFight({ enemies: [[0, 2]], enemyHp: 1 });
  assert.deepEqual(swing(f, P), ['swing', 'down:0', 'won']);
  assert.equal(f.result, 'won');
  assert.deepEqual(swing(f, P), []);
});

test('체력이 다 떨어지면 진다', () => {
  const f = createFight({ enemies: [[0, 1]] });
  f.hp = 1;
  update(f, 0.01, P);
  assert.deepEqual(update(f, 0.5, P), ['hurt', 'lost']);
  assert.equal(f.result, 'lost');
});

test('멈춘 시간: 적은 움직이지 않고, 제한 시간이 지나면 진다', () => {
  const f = createFight({ enemies: [[0, 1]], frozen: true, enemyHp: 1, timeLimit: 2 });
  assert.deepEqual(update(f, 1, P), []);
  assert.deepEqual(f.enemies[0], { x: 0, z: 1, hp: 1, cd: 0, windup: 0 });
  assert.deepEqual(update(f, 1, P), ['lost']);
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test`
Expected: FAIL — `src/combat.js`를 찾을 수 없음

- [ ] **Step 3: 구현** — `src/combat.js`

```js
// 순수 전투 규칙. 좌표는 x,z 평면, 시간은 초. 화면 연출은 main.js가 이벤트를 보고 처리한다.
import { dist, inArc } from './geom.js';

export const PLAYER_MAX_HP = 5;
export const ENEMY_HP = 3;
export const ENEMY_SPEED = 2.2;
export const ENEMY_REACH = 1.4;      // 이 거리 안이면 공격 준비에 들어간다
export const ENEMY_WINDUP = 0.5;     // 공격 준비 시간. 이 사이에 피하면 맞지 않는다
export const ENEMY_COOLDOWN = 1.2;
export const SWING_RANGE = 2.4;
export const SWING_HALF = Math.PI / 3;
export const SWING_COOLDOWN = 0.45;
export const DODGE_TIME = 0.4;

export function createFight(def) {
  return {
    def,
    hp: PLAYER_MAX_HP,
    enemies: def.enemies.map(([x, z]) => ({ x, z, hp: def.enemyHp ?? ENEMY_HP, cd: 0, windup: 0 })),
    time: 0,
    swingCd: 0,
    invuln: 0,
    result: null,
  };
}

// ponytail: 적끼리는 겹쳐도 밀어내지 않는다. 한 번에 3마리라 티가 덜 난다. 거슬리면 resolve로 서로 밀어낸다.
export function update(f, dt, player) {
  const events = [];
  if (f.result) return events;
  f.time += dt;
  f.swingCd = Math.max(0, f.swingCd - dt);
  f.invuln = Math.max(0, f.invuln - dt);
  if (f.def.frozen) {
    if (f.time >= f.def.timeLimit) { f.result = 'lost'; events.push('lost'); }
    return events;
  }
  f.enemies.forEach((e, i) => {
    if (e.hp <= 0) return;
    e.cd = Math.max(0, e.cd - dt);
    const d = dist(e, player);
    if (e.windup > 0) {
      e.windup -= dt;
      if (e.windup <= 0) {
        e.cd = ENEMY_COOLDOWN;
        if (d <= ENEMY_REACH + 0.4 && f.invuln <= 0) { f.hp -= 1; events.push('hurt'); }
      }
    } else if (d > ENEMY_REACH) {
      const step = Math.min(ENEMY_SPEED * dt, d - ENEMY_REACH);
      e.x += ((player.x - e.x) / d) * step;
      e.z += ((player.z - e.z) / d) * step;
    } else if (e.cd <= 0) {
      e.windup = ENEMY_WINDUP;
      events.push(`windup:${i}`);
    }
  });
  if (f.hp <= 0) { f.result = 'lost'; events.push('lost'); }
  return events;
}

export function swing(f, player) {
  if (f.result || f.swingCd > 0) return [];
  f.swingCd = SWING_COOLDOWN;
  const events = ['swing'];
  f.enemies.forEach((e, i) => {
    if (e.hp <= 0 || !inArc(player, player.facing, e, SWING_RANGE, SWING_HALF)) return;
    e.hp -= 1;
    events.push(e.hp > 0 ? `hit:${i}` : `down:${i}`);
  });
  if (f.enemies.every(e => e.hp <= 0)) { f.result = 'won'; events.push('won'); }
  return events;
}

export function dodge(f) {
  if (f.result || f.invuln > 0) return false;
  f.invuln = DODGE_TIME;
  return true;
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test`
Expected: PASS — 39 tests

- [ ] **Step 5: 커밋**

```bash
git add src/combat.js tests/combat.test.js
git commit -m "feat: 전투 규칙(접근·공격 준비·회피·베기·멈춘 시간)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 에셋 받기와 출처

**Files:**
- Create: `data/models.js`, `tools/fetch-assets.mjs`, `CREDITS.md`
- Create: `assets/kaykit/**` (도구가 받는다)
- Test: `tests/assets.test.js`

**Interfaces:**
- Produces: `MODELS: Record<key, { url: string, scale: number }>` — `url`은 저장소 루트 기준 상대 경로(브라우저와 Node 둘 다 그대로 쓴다). 키: `knight mage barbarian rogue hooded minion castle barracks church tavern home_a home_b well tower wall wall_gate bridge mountain_a mountain_b mountain_c hills trees_a trees_b tree rock_a rock_c weaponrack tent barrel crate post_lantern dead_tree dead_tree_m fence bed`
- 배율은 실제 모델 크기를 재서 정했다(캐릭터 키 약 2.5 기준). 헥사곤 팩 건물은 타일 크기(집 높이 0.93)로 만들어져 있어 ×6, 산은 ×12다. 화면에서 어색하면 Task 7에서 조정한다.

- [ ] **Step 1: 실패하는 테스트 쓰기** — `tests/assets.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { posix } from 'node:path';
import { MODELS } from '../data/models.js';

test('모든 모델 파일과 .gltf가 참조하는 .bin·텍스처가 저장소에 있다', () => {
  const missing = [];
  for (const { url } of Object.values(MODELS)) {
    if (!existsSync(url)) { missing.push(url); continue; }
    if (!url.endsWith('.gltf')) continue;
    const json = JSON.parse(readFileSync(url, 'utf8'));
    for (const { uri } of [...(json.buffers ?? []), ...(json.images ?? [])]) {
      if (!uri || uri.startsWith('data:')) continue;
      const dep = posix.join(posix.dirname(url), decodeURIComponent(uri));
      if (!existsSync(dep)) missing.push(dep);
    }
  }
  assert.deepEqual(missing, []);
});
```

- [ ] **Step 2: 모델 목록 쓰기** — `data/models.js`

```js
// 모델 키 → 파일 경로와 기본 배율. 경로는 tools/fetch-assets.mjs가 받는 위치와 같다.
// 배율은 캐릭터(키 약 2.5) 기준. 헥사곤 팩은 타일 크기로 만들어져 있어 크게 키운다.
const ADV = 'assets/kaykit/adventurers/';
const SKE = 'assets/kaykit/skeletons/';
const HEX = 'assets/kaykit/hexagon/';
const HAL = 'assets/kaykit/halloween/';
const FUR = 'assets/kaykit/furniture/';

export const MODELS = {
  knight: { url: ADV + 'Knight.glb', scale: 1 },
  mage: { url: ADV + 'Mage.glb', scale: 1 },
  barbarian: { url: ADV + 'Barbarian.glb', scale: 1 },
  rogue: { url: ADV + 'Rogue.glb', scale: 1 },
  hooded: { url: ADV + 'Rogue_Hooded.glb', scale: 1 },
  minion: { url: SKE + 'Skeleton_Minion.glb', scale: 1 },
  castle: { url: HEX + 'buildings/red/building_castle_red.gltf', scale: 6 },
  barracks: { url: HEX + 'buildings/red/building_barracks_red.gltf', scale: 6 },
  church: { url: HEX + 'buildings/red/building_church_red.gltf', scale: 6 },
  tavern: { url: HEX + 'buildings/red/building_tavern_red.gltf', scale: 6 },
  home_a: { url: HEX + 'buildings/red/building_home_A_red.gltf', scale: 6 },
  home_b: { url: HEX + 'buildings/red/building_home_B_red.gltf', scale: 6 },
  well: { url: HEX + 'buildings/red/building_well_red.gltf', scale: 3 },
  tower: { url: HEX + 'buildings/blue/building_tower_B_blue.gltf', scale: 6 },
  wall: { url: HEX + 'buildings/neutral/wall_straight.gltf', scale: 6 },
  wall_gate: { url: HEX + 'buildings/neutral/wall_straight_gate.gltf', scale: 6 },
  bridge: { url: HEX + 'buildings/neutral/building_bridge_A.gltf', scale: 6 },
  mountain_a: { url: HEX + 'decoration/nature/mountain_A.gltf', scale: 12 },
  mountain_b: { url: HEX + 'decoration/nature/mountain_B.gltf', scale: 12 },
  mountain_c: { url: HEX + 'decoration/nature/mountain_C_grass_trees.gltf', scale: 12 },
  hills: { url: HEX + 'decoration/nature/hills_A_trees.gltf', scale: 8 },
  trees_a: { url: HEX + 'decoration/nature/trees_A_large.gltf', scale: 6 },
  trees_b: { url: HEX + 'decoration/nature/trees_B_medium.gltf', scale: 6 },
  tree: { url: HEX + 'decoration/nature/tree_single_A.gltf', scale: 6 },
  rock_a: { url: HEX + 'decoration/nature/rock_single_A.gltf', scale: 6 },
  rock_c: { url: HEX + 'decoration/nature/rock_single_C.gltf', scale: 8 },
  weaponrack: { url: HEX + 'decoration/props/weaponrack.gltf', scale: 9 },
  tent: { url: HEX + 'decoration/props/tent.gltf', scale: 9 },
  barrel: { url: HEX + 'decoration/props/barrel.gltf', scale: 6 },
  crate: { url: HEX + 'decoration/props/crate_A_big.gltf', scale: 6 },
  post_lantern: { url: HAL + 'post_lantern.gltf', scale: 1 },
  dead_tree: { url: HAL + 'tree_dead_large.gltf', scale: 1.5 },
  dead_tree_m: { url: HAL + 'tree_dead_medium.gltf', scale: 1.5 },
  fence: { url: HAL + 'fence.gltf', scale: 1 },
  bed: { url: FUR + 'bed_single_A.gltf', scale: 1 },
};
```

- [ ] **Step 3: 실패 확인**

Run: `npm test`
Expected: FAIL — `missing`에 `assets/kaykit/...` 경로 35개 이상

- [ ] **Step 4: 다운로드 도구 쓰기** — `tools/fetch-assets.mjs`

```js
// KayKit CC0 에셋을 data/models.js 목록대로 assets/ 아래에 받는다. .gltf가 참조하는 .bin·텍스처도 함께 받는다.
// 저장소 루트에서 실행: npm run fetch-assets  (이미 있는 파일은 다시 받지 않는다)
import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { posix } from 'node:path';
import { MODELS } from '../data/models.js';

const RAW = 'https://raw.githubusercontent.com/KayKit-Game-Assets/';
const PACKS = {
  'assets/kaykit/adventurers/': RAW + 'KayKit-Character-Pack-Adventures-1.0/main/addons/kaykit_character_pack_adventures/Characters/gltf/',
  'assets/kaykit/skeletons/': RAW + 'KayKit-Character-Pack-Skeletons-1.0/main/addons/kaykit_character_pack_skeletons/Characters/gltf/',
  'assets/kaykit/hexagon/': RAW + 'KayKit-Medieval-Hexagon-Pack-1.0/main/addons/kaykit_medieval_hexagon_pack/Assets/gltf/',
  'assets/kaykit/halloween/': RAW + 'KayKit-Halloween-Bits-1.0/main/addons/kaykit_halloween_bits/Assets/gltf/',
  'assets/kaykit/furniture/': RAW + 'KayKit-Furniture-Bits-1.0/main/addons/kaykit_furniture_bits/Assets/gltf/',
};

const seen = new Set();

async function fetchOne(local) {
  if (seen.has(local)) return;
  seen.add(local);
  const prefix = Object.keys(PACKS).find(p => local.startsWith(p));
  if (!prefix) throw new Error(`어느 팩인지 모르는 경로: ${local}`);
  let body;
  if (await access(local).then(() => true, () => false)) {
    body = await readFile(local);
  } else {
    const res = await fetch(PACKS[prefix] + local.slice(prefix.length));
    if (!res.ok) throw new Error(`${res.status} ${local}`);
    body = Buffer.from(await res.arrayBuffer());
    await mkdir(posix.dirname(local), { recursive: true });
    await writeFile(local, body);
    console.log('받음', local);
  }
  if (!local.endsWith('.gltf')) return;
  const json = JSON.parse(body.toString('utf8'));
  for (const { uri } of [...(json.buffers ?? []), ...(json.images ?? [])]) {
    if (uri && !uri.startsWith('data:')) await fetchOne(posix.join(posix.dirname(local), decodeURIComponent(uri)));
  }
}

for (const { url } of Object.values(MODELS)) await fetchOne(url);
console.log(`완료: 파일 ${seen.size}개`);
```

- [ ] **Step 5: 에셋 받기**

Run: `npm run fetch-assets`
Expected: `받음 ...` 줄이 이어지고 마지막에 `완료: 파일 N개`(이 계획을 쓸 때 확인한 값은 71개, 약 24MB). 404가 나면 그 경로를 GitHub 저장소에서 확인해 `data/models.js`를 고친다.

- [ ] **Step 6: 통과 확인**

Run: `npm test`
Expected: PASS — 40 tests

- [ ] **Step 7: 출처 쓰기** — `CREDITS.md`

```markdown
# Credits

## 3D 에셋 — CC0 1.0 (퍼블릭 도메인)
Kay Lousberg, KayKit (https://kaylousberg.com)
- KayKit: Adventurers Character Pack 1.0 — https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0
- KayKit: Skeletons Character Pack 1.0 — https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Skeletons-1.0
- KayKit: Medieval Hexagon Pack 1.0 — https://github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0
- KayKit: Halloween Bits 1.0 — https://github.com/KayKit-Game-Assets/KayKit-Halloween-Bits-1.0
- KayKit: Furniture Bits 1.0 — https://github.com/KayKit-Game-Assets/KayKit-Furniture-Bits-1.0

## 라이브러리
- three.js 0.170.0 — MIT License — https://threejs.org

## 글꼴
- 나눔명조(Nanum Myeongjo) — SIL Open Font License 1.1 — Google Fonts
```

- [ ] **Step 8: 커밋**

```bash
git add data/models.js tools/fetch-assets.mjs tests/assets.test.js CREDITS.md assets
git commit -m "feat: KayKit CC0 에셋과 다운로드 도구, 출처" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 지역 배치와 대본

**Files:**
- Create: `data/regions.js`, `data/script.js`
- Test: `tests/content.test.js`

**Interfaces:**
- Consumes: Task 1~3의 `createState`, `createDialogue`, `applyEffect`, `winFight`, `markDone`, `triggersFor`; Task 5의 `MODELS`
- Produces:
  - `REGIONS: { 1: Region, 2: Region, 3: Region }` (형식은 Task 3 참고)
  - `FIGHTS: { road, valley, freeze }` (형식은 Task 4의 `FightDef`)
  - `SCRIPT: Record<id, Node>` (Task 1 형식), `MEMORIES: { mem_falls, mem_ring, mem_stars, mem_clock, mem_name }` — 값은 화면에 보일 이름
  - 화자 `'@aion'` = 아이온(이름을 알기 전 `마술사`), `''` = 나레이션
  - 쓰는 플래그: `soldiers`, `king_done`, `gate_open`, `asked_name`, `promise`, `people`, `stubborn`, `knows_name`
  - 트리거 `ends: true` = 진행하면 되돌릴 수 없는 트리거(프롬프트에 경고를 붙인다)
  - 쓰는 애니메이션 이름(KayKit 공통): `Idle`, `Walking_A`, `Running_A`, `Lie_Idle`, `Sit_Floor_Idle`

- [ ] **Step 1: 실패하는 테스트 쓰기** — `tests/content.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCRIPT, MEMORIES } from '../data/script.js';
import { REGIONS, FIGHTS } from '../data/regions.js';
import { MODELS } from '../data/models.js';
import { createState, createDialogue, applyEffect, winFight, markDone } from '../src/story.js';
import { triggersFor } from '../src/region.js';

const triggers = Object.values(REGIONS).flatMap(r => r.triggers);
const EFFECT = /^(nextDay|ending|region:[123]|combat:(\w+))$/;

test('모든 next와 선택지가 있는 노드를 가리킨다', () => {
  const bad = [];
  for (const [id, n] of Object.entries(SCRIPT)) {
    if (n.next && !SCRIPT[n.next]) bad.push(`${id} → ${n.next}`);
    for (const c of n.choices ?? []) if (!SCRIPT[c.next]) bad.push(`${id} 선택지 → ${c.next}`);
  }
  assert.deepEqual(bad, []);
});

test('트리거·전투·엔딩이 가리키는 노드가 있다', () => {
  for (const t of triggers) assert.ok(SCRIPT[t.node], `트리거 ${t.id}`);
  for (const [id, f] of Object.entries(FIGHTS)) assert.ok(SCRIPT[f.then], `전투 ${id}`);
  assert.ok(SCRIPT.ending);
});

test('do 효과 형식이 맞고 전투 id가 정의돼 있다', () => {
  for (const [id, n] of Object.entries(SCRIPT)) {
    if (!n.do) continue;
    const m = n.do.match(EFFECT);
    assert.ok(m, `${id}: ${n.do}`);
    if (m[2]) assert.ok(FIGHTS[m[2]], `${id}: 없는 전투 ${m[2]}`);
  }
});

test('기억 조각 5개가 모두 쓰이고, 글이 있는 노드에만 붙는다', () => {
  const used = new Set();
  for (const [id, n] of Object.entries(SCRIPT)) {
    if (!n.memory) continue;
    assert.ok(MEMORIES[n.memory], `${id}: 정의 안 된 ${n.memory}`);
    assert.ok(n.text, `${id}: 글이 없다`);
    used.add(n.memory);
  }
  assert.deepEqual([...used].sort(), Object.keys(MEMORIES).sort());
  assert.equal(Object.keys(MEMORIES).length, 5);
});

test('선택지 노드에는 조건 없는 선택지가 하나 이상 있다', () => {
  for (const [id, n] of Object.entries(SCRIPT)) {
    if (n.choices) assert.ok(n.choices.some(c => !c.if), id);
  }
});

test('어디서도 닿지 않는 노드가 없다', () => {
  const seen = new Set();
  const stack = [...triggers.map(t => t.node), ...Object.values(FIGHTS).map(f => f.then), 'ending'];
  while (stack.length) {
    const id = stack.pop();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const n = SCRIPT[id];
    stack.push(n.next, ...(n.choices ?? []).map(c => c.next));
  }
  assert.deepEqual(Object.keys(SCRIPT).filter(id => !seen.has(id)), []);
});

test('트리거 id는 겹치지 않고, 배치한 모델은 모두 정의돼 있다', () => {
  const ids = triggers.map(t => t.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const r of Object.values(REGIONS)) {
    for (const it of [...r.props, ...r.actors]) assert.ok(MODELS[it.m], `${r.name}: ${it.m}`);
  }
});

// 트리거를 하나씩 골라 대화를 끝까지 넘기고, 효과를 적용하며 엔딩까지 간다. 전투는 이긴 것으로 친다.
function playthrough({ pickTrigger, pickChoice }) {
  const state = createState();
  function run(id) {
    const d = createDialogue(SCRIPT, state);
    for (let v = d.start(id); v; ) v = v.choices ? d.choose(pickChoice(v.choices.length)) : d.next();
    for (const fx of d.takeEffects()) {
      const cmd = applyEffect(state, fx);
      if (cmd.type === 'combat') run(winFight(state, FIGHTS));
      if (cmd.type === 'ending') run('ending');
    }
  }
  for (let step = 0; step < 300 && !state.ended; step++) {
    const avail = triggersFor(REGIONS[state.region], state);
    assert.ok(avail.length, `막혔다: 지역 ${state.region}, ${state.day}일째, 플래그 [${state.flags}]`);
    const t = pickTrigger(avail);
    markDone(state, t);
    run(t.node);
  }
  assert.ok(state.ended, '300번 안에 엔딩에 닿지 못했다');
  return state;
}

test('기억 조각을 모두 모으며 끝까지 갈 수 있다', () => {
  const s = playthrough({ pickTrigger: a => a.find(t => !t.ends) ?? a[0], pickChoice: () => 0 });
  assert.deepEqual([...s.memories].sort(), Object.keys(MEMORIES).sort());
});

test('기억 조각 없이도 끝까지 갈 수 있다', () => {
  const s = playthrough({ pickTrigger: a => a.find(t => !t.id.startsWith('r2_mem')) ?? a[0], pickChoice: n => n - 1 });
  assert.deepEqual(s.memories, []);
});

test('무작위로 골라도 언제나 끝까지 갈 수 있다', () => {
  for (let seed = 1; seed <= 40; seed++) {
    let x = seed;
    const rnd = () => (x = (x * 16807) % 2147483647) / 2147483647;
    playthrough({ pickTrigger: a => a[Math.floor(rnd() * a.length)], pickChoice: n => Math.floor(rnd() * n) });
  }
});

function endingLines(memories) {
  const d = createDialogue(SCRIPT, { ...createState(), memories, flags: ['knows_name'] });
  let n = 0;
  for (let v = d.start('ending'); v; v = d.next()) n++;
  return n;
}

test('엔딩 회상에는 모은 기억 조각만 나온다', () => {
  assert.equal(endingLines(Object.keys(MEMORIES)) - endingLines([]), 5);
  assert.equal(endingLines(['mem_stars']) - endingLines([]), 1);
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test`
Expected: FAIL — `data/script.js`를 찾을 수 없음

- [ ] **Step 3: 지역 배치 쓰기** — `data/regions.js`

좌표 규약: 지면은 y = 0 평지. 플레이어는 대체로 -z 쪽(왕도에선 성문, 골짜기에선 탑)으로 나아간다. `rot`는 방향각(라디안)이다. 0이면 +z, π면 -z를 바라본다. 배치는 Task 7에서 화면을 보며 조정한다.

```js
// 지역 배치와 전투 정의. 형식은 docs/superpowers/plans/2026-10-08-journey-of-achos.md Task 3 참고.
const PI = Math.PI;

export const REGIONS = {
  1: {
    name: '역병의 왕도',
    light: 'night',
    ground: '#24232a',
    bounds: { minX: -20, maxX: 20, minZ: -60, maxZ: 34 },
    start: { x: 0, z: 30, rot: PI },
    props: [
      { m: 'castle', x: 0, z: 54, rot: PI },
      { m: 'barracks', x: -14, z: 28, rot: PI / 2, r: 5 },
      { m: 'weaponrack', x: -8.5, z: 26.5, rot: PI / 2, r: 0.8 },
      { m: 'church', x: 14, z: 30, rot: -PI / 2, r: 5 },
      { m: 'tent', x: 14, z: 16, rot: -PI / 2, r: 2.2 },
      { m: 'bed', x: 11, z: 16, rot: -PI / 2, r: 1.4 },
      { m: 'home_a', x: -15, z: 12, rot: PI / 2, r: 3.5 },
      { m: 'home_b', x: 15, z: 4, rot: -PI / 2, r: 3.5 },
      { m: 'tavern', x: -15, z: -1, rot: PI / 2, r: 4 },
      { m: 'home_a', x: 15, z: -4, rot: -PI / 2, r: 3.5 },
      { m: 'well', x: 0, z: 10, r: 1.6 },
      { m: 'post_lantern', x: -5, z: 22 },
      { m: 'post_lantern', x: 5, z: 8 },
      { m: 'post_lantern', x: -5, z: -5 },
      { m: 'barrel', x: -10, z: 4, r: 0.8 },
      { m: 'crate', x: -10.5, z: 5.6, r: 0.8 },
      { m: 'wall_gate', x: 0, z: -10 },
      { m: 'wall', x: -12, z: -10 },
      { m: 'wall', x: 12, z: -10 },
      { m: 'wall', x: -24, z: -10 },
      { m: 'wall', x: 24, z: -10 },
      { m: 'dead_tree', x: -11, z: -24, r: 1 },
      { m: 'dead_tree_m', x: 12, z: -33, r: 1 },
      { m: 'dead_tree', x: -9, z: -47, r: 1 },
      { m: 'fence', x: 8, z: -45, rot: 0.3 },
      { m: 'rock_c', x: 6, z: -20, r: 1.2 },
    ],
    procs: [
      { kind: 'lamp', x: -5, z: 22 },
      { kind: 'lamp', x: 5, z: 8 },
      { kind: 'lamp', x: -5, z: -5 },
      { kind: 'blight', x: 3, z: 20 },
      { kind: 'blight', x: -7, z: 7, s: 0.8 },
      { kind: 'blight', x: 9, z: -2, s: 1.5 },
      { kind: 'blight', x: -3, z: -30, s: 2 },
      { kind: 'fire', x: 0, z: -52 },
    ],
    walls: [[-30, -10, -2.5, -10], [2.5, -10, 30, -10]],
    blockers: [{ x: 0, z: -10, r: 2.5, if: '!gate_open' }],
    actors: [
      { m: 'barbarian', x: -7, z: 21, rot: PI / 2 },                       // 병사들
      { m: 'barbarian', x: -5.5, z: 22.8, rot: PI },
      { m: 'rogue', x: 11, y: 0.5, z: 16, rot: -PI / 2, scale: 0.6, anim: 'Lie_Idle' }, // 병상의 왕자
      { m: 'knight', x: 3, z: 13, rot: PI, scale: 1.05, tint: '#d8b45a' },   // 왕
      { m: 'hooded', x: 3.5, z: -7, rot: 0 },                                 // 성문 경비병
      { m: 'hooded', x: 1.5, z: -53, rot: 0, tint: '#a08060', anim: 'Sit_Floor_Idle' }, // 여행자
    ],
    triggers: [
      { id: 'r1_open', node: 'r1_open', x: 0, z: 30, r: 4, auto: true },
      { id: 'r1_rack', node: 'r1_rack', x: -8.5, z: 26.5, r: 2.5, label: '빈 갑주 걸이를 살핀다' },
      { id: 'r1_soldiers', node: 'r1_soldiers', x: -6.3, z: 21.8, r: 3, label: '병사들과 이야기한다' },
      { id: 'r1_prince', node: 'r1_prince', x: 11, z: 16, r: 3.5, label: '격리 천막으로 간다' },
      { id: 'r1_king', node: 'r1_king', x: 3, z: 13, r: 3, label: '폐하를 뵙는다' },
      { id: 'r1_gate_early', node: 'r1_gate_early', x: 0, z: -7, r: 3.5, auto: true, if: '!king_done' },
      { id: 'r1_gate', node: 'r1_gate', x: 0, z: -7, r: 3.5, if: 'king_done', label: '성문 경비병에게 말한다' },
      { id: 'r1_road', node: 'r1_road', x: 0, z: -26, r: 5, auto: true, if: 'gate_open' },
      { id: 'r1_traveler', node: 'r1_traveler', x: 1.5, z: -53, r: 3.5, if: 'won:road', ends: true, label: '모닥불 곁의 여행자에게 말을 건다' },
    ],
  },

  2: {
    name: '멈춘 계절의 골짜기',
    light: { 1: 'dusk', 2: 'day', 3: 'night' },
    ground: '#3d4a36',
    bounds: { minX: -28, maxX: 28, minZ: -32, maxZ: 30 },
    start: { x: 0, z: 26, rot: PI },
    props: [
      { m: 'mountain_a', x: -40, z: -10 },
      { m: 'mountain_b', x: 40, z: -6 },
      { m: 'mountain_c', x: -18, z: -50 },
      { m: 'mountain_a', x: 20, z: -52, rot: 1 },
      { m: 'mountain_b', x: -42, z: 24, rot: 2 },
      { m: 'mountain_c', x: 42, z: 28, rot: 0.5 },
      { m: 'tower', x: 0, z: -24, r: 4, tint: '#c8b0f0' },
      { m: 'trees_a', x: -14, z: 12, r: 4 },
      { m: 'trees_b', x: 16, z: 10, r: 4 },
      { m: 'tree', x: 10, z: -10, r: 1 },
      { m: 'tree', x: -6, z: 20, r: 1 },
      { m: 'trees_a', x: 20, z: -18, r: 4 },
      { m: 'rock_c', x: 14, z: -2, r: 1.4 },
      { m: 'rock_a', x: -20, z: -14 },
    ],
    procs: [
      { kind: 'waterfall', x: -24, z: -8, rot: PI / 2, w: 7, h: 16 },
      { kind: 'water', x: -21, z: -8, w: 6, d: 9 },
      { kind: 'leaves', x: 0, z: 0, w: 50, d: 55, n: 400 },
      { kind: 'clock', x: 4, z: -19 },
    ],
    walls: [[-24, -13, -24, -3]],
    actors: [
      { m: 'mage', x: 0, z: -16, rot: 0, day: 1 },
      { m: 'mage', x: -16, z: -6, rot: PI / 2, day: 2 },
      { m: 'mage', x: 0, z: -16, rot: 0, day: 3 },
    ],
    triggers: [
      { id: 'r2_arrive', node: 'r2_arrive', x: 0, z: 26, r: 4, auto: true, day: 1 },
      { id: 'r2_meet', node: 'r2_meet', x: 0, z: -16, r: 3, day: 1, ends: true, label: '탑 앞의 여인에게 말을 건다' },
      { id: 'r2_d2_talk', node: 'r2_d2_talk', x: -16, z: -6, r: 3, day: 2, label: '마술사에게 말을 건다' },
      { id: 'r2_mem_falls', node: 'r2_mem_falls', x: -20, z: -10, r: 3, day: 2, if: 'done:r2_d2_talk', label: '멈춘 폭포 아래를 걷는다' },
      { id: 'r2_mem_ring', node: 'r2_mem_ring', x: 14, z: -2, r: 3, day: 2, if: 'soldiers', label: '바위에 앉아 쉰다' },
      { id: 'r2_alarm', node: 'r2_alarm', x: 0, z: 22, r: 6, day: 2, if: 'done:r2_d2_talk', auto: true, ends: true },
      { id: 'r2_mem_stars', node: 'r2_mem_stars', x: -10, z: -20, r: 3, day: 3, label: '풀밭에 누워 별을 본다' },
      { id: 'r2_mem_clock', node: 'r2_mem_clock', x: 4, z: -19, r: 2.5, day: 3, label: '멈춘 괘종시계를 살핀다' },
      { id: 'r2_d3_night', node: 'r2_d3_night', x: 0, z: -16, r: 3, day: 3, ends: true, label: '마술사에게 말을 건다' },
    ],
  },

  3: {
    name: '새벽의 다리',
    light: 'dawn',
    ground: '#4a4438',
    bounds: { minX: -14, maxX: 14, minZ: -90, maxZ: 18 },
    start: { x: 0, z: 12, rot: PI },
    props: [
      { m: 'bridge', x: 0, z: 24 },
      { m: 'castle', x: 0, z: -150, scale: 1.4 },     // 지평선 너머의 왕도
      { m: 'mountain_c', x: -30, z: 10 },
      { m: 'mountain_a', x: 32, z: 0 },
      { m: 'tree', x: 8, z: -10, r: 1 },
      { m: 'tree', x: -9, z: -30, r: 1 },
      { m: 'trees_b', x: 12, z: -45 },
      { m: 'hills', x: -22, z: -60 },
      { m: 'hills', x: 24, z: -80 },
    ],
    procs: [{ kind: 'water', x: 0, z: 24, w: 40, d: 6 }],
    walls: [],
    actors: [{ m: 'mage', x: 2.5, z: 15, rot: PI, if: 'done:r3_arrive' }],
    triggers: [
      { id: 'r3_arrive', node: 'r3_arrive', x: 0, z: 12, r: 3, auto: true },
      { id: 'r3_bridge', node: 'r3_bridge', x: 2.5, z: 15, r: 3, if: 'done:r3_arrive', ends: true, label: '그녀에게 다가간다' },
    ],
  },
};

export const FIGHTS = {
  road: { enemies: [[-4, -35], [4, -37]], player: [0, -26, PI], then: 'r1_road_after' },
  valley: { enemies: [[-5, 27], [0, 29], [5, 27]], player: [0, 18, 0], then: 'r2_valley_after' },
  freeze: {
    enemies: [[-8, 18], [-4, 22], [0, 16], [4, 21], [8, 17], [0, 26]],
    frozen: true, enemyHp: 1, timeLimit: 25, player: [0, 12, 0], then: 'r2_freeze_after',
  },
};
```

- [ ] **Step 4: 대본 쓰기** — `data/script.js`

```js
// 모든 대사. 노드 형식은 스펙 5-2 참고.
// 화자: '' = 나레이션, '@aion' = 아이온(knows_name 전에는 '마술사'로 보인다).
// 대사에 '째깍'이 들어가면 시계 소리가 난다(main.js).

// 한 줄씩 이어지는 대사 묶음. 노드 id는 id, id.1, id.2 … 이고, 마지막 줄에 last의 필드를 덧붙인다.
function chain(id, lines, last = {}) {
  const nodes = {};
  lines.forEach(([who, text], i) => {
    const isLast = i === lines.length - 1;
    nodes[i ? `${id}.${i}` : id] = { who, text, ...(isLast ? last : { next: `${id}.${i + 1}` }) };
  });
  return nodes;
}

const N = '', K = '아코스', A = '@aion';

export const MEMORIES = {
  mem_falls: '멈춘 물보라',
  mem_ring: '병사의 반지',
  mem_stars: '움직이지 않는 별',
  mem_clock: '다시 가는 시계',
  mem_name: '이름',
};

export const SCRIPT = {
  // ───────── 지역 1: 역병의 왕도 ─────────
  ...chain('r1_open', [
    [N, '역병이 돈 지 석 달째. 왕도의 밤은 등불보다 기침 소리가 많다.'],
    [N, '걸린 자는 몸이 조금씩 다른 것으로 변해 간다. 그리고 끝내, 죽는다.'],
    [K, '…오늘 밤 떠난다. 고칠 방법을 찾을 때까지는 돌아오지 않는다.'],
    [N, '(WASD로 걷고 Shift로 달린다. 마우스를 끌어 둘러본다. 가까이 가서 E로 말을 건다.)'],
  ]),

  ...chain('r1_rack', [
    [N, '숙소 앞의 빈 갑주 걸이. 기둥에 누군가 칼끝으로 새겨 둔 글씨가 있다.'],
    [N, '「그가 돌아오면, 이 자리에.」'],
    [K, '…녀석들. 갑옷은 입고 가는 거다. 걸어 둘 생각은 없어.'],
  ]),

  ...chain('r1_soldiers', [
    ['병사', '대장님. 정말 혼자 가십니까.'],
    [K, '너희는 성문을 지켜라. 역병은 사람만 데려가지 않는다. 질서도 데려가지.'],
    ['병사', '…그 반지, 아직도 끼고 계시네요. 병사 시절부터 끼시던 철 반지.'],
    [K, '녹슨 철이라도, 처음 산 거라서.'],
  ], { set: 'soldiers', choices: [
    { text: '떠나 있는 동안 맡아 두겠나?', next: 'r1_soldiers_keep' },
    { text: '(반지를 쥐고 고개를 끄덕인다)', next: 'r1_soldiers_end' },
  ] }),
  ...chain('r1_soldiers_keep', [['병사', '아뇨. 그건 대장님 손에 있어야죠.']], { next: 'r1_soldiers_end' }),
  ...chain('r1_soldiers_end', [['병사', '돌아오셔서 저희한테 직접 보여 주십시오. 기다리겠습니다.']]),

  ...chain('r1_prince', [
    [N, '격리 천막 앞, 작은 침상에 왕자가 누워 있다. 이불 밖으로 나온 손등에 검은 딱지가 번져 있다.'],
    ['왕자', '아코스 경… 어디 가요?'],
    [K, '약을 구하러 갑니다, 전하. 아주 멀리까지요.'],
    ['왕자', '그럼 돌아오면 목마 태워 주세요. 잭 아저씨가 만들어 준 거요. 이제 나 혼자는 못 타요.'],
  ], { choices: [
    { text: '약속하겠습니다.', next: 'r1_prince_promise' },
    { text: '그때는 전하께서 저를 태워 주셔야지요.', next: 'r1_prince_joke' },
  ] }),
  ...chain('r1_prince_promise', [['왕자', '약속이에요.']], { next: 'r1_prince_end' }),
  ...chain('r1_prince_joke', [['왕자', '(웃다가 기침을 한다) …그건 무리예요.']], { next: 'r1_prince_end' }),
  ...chain('r1_prince_end', [[N, '천막을 나서는 등 뒤로, 작은 기침 소리가 오래 따라온다.']]),

  ...chain('r1_king', [
    ['왕', '떠나는가, 아코스.'],
    [K, '예, 폐하. 성 밖 어딘가에는 방법이 있을 겁니다. 의원도 학자도 아닌, 누군가가.'],
    ['왕', '…아이의 손등을 보았나.'],
  ], { next: 'r1_king_saw' }),
  r1_king_saw: { if: 'done:r1_prince', who: K, text: '…보았습니다.', next: 'r1_king_notyet' },
  r1_king_notyet: { if: '!done:r1_prince', who: K, text: '아직 뵙지 못했습니다.', next: 'r1_king_end' },
  ...chain('r1_king_end', [
    ['왕', '왕으로서 명하네. 이 나라를 구할 길을 찾아 오게.'],
    ['왕', '그리고 아비로서 부탁하네. …늦지 말게.'],
  ], { set: 'king_done' }),

  ...chain('r1_gate_early', [[N, '성문은 굳게 닫혀 있다. 떠나기 전에 폐하를 뵈어야 한다.']]),

  ...chain('r1_gate', [
    ['성문 경비병', '대장님. 문을 열까요?'],
    [K, '열어라. 내가 나가면 바로 닫고.'],
    ['성문 경비병', '…성 밖 짐승들이 이상해졌다고 합니다. 역병이 사람한테만 붙는 게 아닌 모양입니다.'],
    [N, '육중한 성문이 열린다.'],
  ], { set: 'gate_open' }),

  ...chain('r1_road', [
    [N, '어둠 속에서 무언가가 기어 나온다. 검게 굳은 딱지 틈으로 병든 황록빛이 새어 나온다.'],
    [K, '…짐승이었던 것인가. 아니면, 사람이었던 것인가.'],
    [N, '(클릭으로 벤다. Space로 몸을 피한다. 마우스를 끌면 시야가 돈다.)'],
  ], { do: 'combat:road' }),
  ...chain('r1_road_after', [[K, '사람만이 아니군. 이 병은 무엇이든 다른 것으로 바꿔 놓는다.']]),

  ...chain('r1_traveler', [
    ['여행자', '칼 소리가 나길래 숨어 있었소. 기사 양반, 이 밤에 어딜 가시오?'],
    [K, '병을 고칠 방법을 찾고 있소. 무엇이든 좋소.'],
    ['여행자', '고치는 법은 모르오. 대신 이상한 소문은 하나 아오.'],
    ['여행자', '서쪽 골짜기에 시간을 멈추는 마술사가 산다더군. 그 골짜기에선 낙엽이 땅에 닿지 않는다오.'],
  ], { choices: [
    { text: '시간을 멈춘다… 병의 시간도?', next: 'r1_traveler_a' },
    { text: '소문일 뿐이겠지.', next: 'r1_traveler_b' },
  ] }),
  ...chain('r1_traveler_a', [['여행자', '그건 직접 물어보시오. 거기 갔다가 돌아온 사람이 없어서 말이오.']], { next: 'r1_traveler_end' }),
  ...chain('r1_traveler_b', [['여행자', '그렇겠지. 그래도 가 볼 거잖소. 얼굴에 다 쓰여 있소.']], { next: 'r1_traveler_end' }),
  ...chain('r1_traveler_end', [[N, '바람이 멎은 순간, 아주 멀리서 째깍, 하고 초침 소리가 들린 것 같았다.']], { do: 'region:2' }),

  // ───────── 지역 2: 멈춘 계절의 골짜기 — 첫날(노을) ─────────
  ...chain('r2_arrive', [
    [N, '골짜기에 들어서자 바람이 멎는다. 떨어지던 낙엽들이 공중에 그대로 멈춰 있다.'],
    [N, '안쪽의 폭포도 움직이지 않는다. 얼어붙은 것이 아니다. 물이, 그저 멈춰 있다.'],
    [K, '…소문이 사실이었군.'],
  ]),

  ...chain('r2_meet', [
    [A, '골짜기에 사람이 들어온 건 오랜만이군. 길을 잃었나, 기사.'],
    [K, '찾아왔소. 시간을 멈추는 마술사를.'],
    [A, '그럼 찾았군. 용건은?'],
    [K, '내 나라에 역병이 돌고 있소. 걸린 자는 몸이 다른 것으로 변해 가다 죽소. 고칠 방법을 찾고 있소.'],
    [A, '시간은 병을 고치지 못한다. 멈출 수 있을 뿐이다.'],
    [A, '멈춘 것은 낫지 않는다. 죽지 않을 뿐이지. 그걸 구원이라 부를 수 있겠나?'],
  ], { choices: [
    { text: '(무릎을 꿇는다) 그래도 부탁하오.', next: 'r2_meet_plead' },
    { text: '그럼 하룻밤만 묵게 해 주시오. 내일 다시 묻겠소.', next: 'r2_meet_stay' },
  ] }),
  ...chain('r2_meet_plead', [
    [A, '일어나라. 무릎으로 하는 부탁은 질색이다.'],
    [A, '…해가 졌군. 밤 골짜기는 칼잡이한테도 위험하다. 오늘은 탑 아래에서 자라.'],
  ], { next: 'r2_meet_name' }),
  ...chain('r2_meet_stay', [
    [A, '내일 물어도 대답은 같다.'],
    [A, '…하지만 해가 졌으니, 탑 아래에서 자는 것까지 막지는 않겠다.'],
  ], { next: 'r2_meet_name' }),
  r2_meet_name: { who: K, text: '…고맙소.', choices: [
    { text: '당신 이름은 무엇이오?', set: 'asked_name', next: 'r2_meet_asked' },
    { text: '(고개를 숙이고 물러난다)', next: 'r2_meet_bow' },
  ] },
  ...chain('r2_meet_asked', [
    [A, '알 필요 없다. 너는 곧 떠날 사람이니까.'],
    [K, '나는 아코스요. 내 이름은 알아 두시오.'],
    [A, '아코스. …슬픔이라는 뜻이군. 이상한 이름을 달고 다니는구나.'],
    [K, '어머니 말로는, 남의 슬픔을 대신 짊어지라는 이름이라더군.'],
  ], { next: 'r2_meet_end' }),
  ...chain('r2_meet_bow', [
    [K, '아코스라 하오. 내일 다시 오겠소.'],
    [N, '그녀는 대답 없이 탑으로 들어간다. 문이 닫히기 직전, 안쪽에서 째깍이는 소리가 들린다.'],
  ], { next: 'r2_meet_end' }),
  ...chain('r2_meet_end', [[N, '골짜기의 첫날 밤이 지나간다.']], { do: 'nextDay' }),

  // ───────── 둘째 날(낮) ─────────
  ...chain('r2_d2_talk', [
    [A, '아직 안 갔군.'],
    [K, '대답이 같아도 다시 묻겠다고 했소.'],
    [A, '…밤새 생각해 봤다. 내 힘으로 병을 고칠 수는 없다.'],
    [A, '하지만 병이 사람을 데려가기 전에, 그 시간을 멈춰 둘 수는 있을지도 모르지.'],
    [A, '하나만 묻자. 왜 그렇게까지 하지? 기사의 맹세 때문인가?'],
  ], { choices: [
    { text: '약속했으니까. 돌아가겠다고.', set: 'promise', next: 'r2_d2_promise' },
    { text: '기다리는 사람들이 있으니까.', set: 'people', next: 'r2_d2_people' },
    { text: '…모르겠소. 멈추는 법을 몰라서일지도.', set: 'stubborn', next: 'r2_d2_stubborn' },
  ] }),
  ...chain('r2_d2_promise', [
    [A, '약속이라. 지키지 못할 약속을 하는 자들을 많이 봤다.'],
    [A, '…너는 조금 다를지도 모르겠군.'],
  ], { next: 'r2_d2_end' }),
  ...chain('r2_d2_people', [[A, '기다리는 사람이라. 나한테는 오래전에 없어진 것이다.']], { next: 'r2_d2_end' }),
  ...chain('r2_d2_stubborn', [[A, '(짧게 웃는다) 시간을 멈추는 사람 앞에서 할 소리는 아니군.']], { next: 'r2_d2_end' }),
  ...chain('r2_d2_end', [
    [A, '오늘은 골짜기를 둘러봐라. 저 폭포 아래는 걸을 만하다.'],
    [A, '그리고 입구 쪽은 조심해라. 요즘 무언가가 자꾸 골짜기 경계를 긁는다.'],
  ]),

  ...chain('r2_mem_falls', [
    [N, '멈춘 물줄기 아래로 들어선다. 공중에 매달린 물방울들이 아침 빛을 받아 반짝인다.'],
    [A, '손을 대 봐라. 차갑지 않을 거다. 멈춘 물은 아무것도 적시지 않거든.'],
    [K, '…이상하오. 이렇게 아름다운데, 어딘가 슬프군.'],
    [A, '처음 보는 사람은 다 그렇게 말한다. 나는 이제 아무렇지도 않다.'],
    [N, '그렇게 말하면서도 그녀는 물방울 하나를 손끝으로 오래 굴린다. 그러다 아주 작게, 웃는다.'],
  ], { memory: 'mem_falls' }),

  ...chain('r2_mem_ring', [
    [N, '바위에 앉아 장갑을 벗는다. 녹슨 철 반지가 드러난다.'],
    [N, '어느새 마술사가 다가와 반지를 내려다본다.'],
    [A, '기사치고는 수수한 반지군.'],
    [K, '병사 시절 첫 봉급으로 산 거요. 그때 같이 산 녀석들이 지금은 내 부하들이고.'],
    [K, '떠나기 전에 녀석들이 그러더군. 돌아와서 직접 보여 달라고.'],
    [A, '…그럼 돌아가야겠군.'],
  ], { memory: 'mem_ring' }),

  ...chain('r2_alarm', [
    [N, '골짜기 입구. 멈춘 낙엽들 사이로 검은 것들이 기어 들어온다.'],
    [K, '왕도에서부터 따라온 건가.'],
  ], { do: 'combat:valley' }),
  ...chain('r2_valley_after', [
    [N, '쓰러뜨린 것들 너머로, 더 많은 것들이 몰려온다. 열, 스물…'],
    [K, '…많군.'],
    [A, '물러서지 마라, 기사.'],
    [N, '째깍. 세상이 소리를 잃는다. 달려들던 것들이 허공에서 그대로 굳는다.'],
    [A, '오래는 못 버틴다. 지금 베어라.'],
    [N, '(멈춘 시간이 다시 흐르기 전에 모두 벤다.)'],
  ], { do: 'combat:freeze' }),
  ...chain('r2_freeze_after', [
    [N, '시간이 다시 흐른다. 굳어 있던 것들이 한꺼번에 무너져 내린다.'],
    [N, '돌아보니, 마술사가 바위에 기대어 숨을 고르고 있다.'],
    [K, '괜찮소?'],
    [A, '골짜기 하나를 잠깐 멈추는 데도 이렇다. 나라 하나를 멈추려면…'],
    [K, '…할 수 있다는 말로 들리오.'],
    [A, '할 수 없다고는 안 했다. 그게 문제지.'],
    [N, '그날 밤, 탑의 불빛은 늦게까지 꺼지지 않았다.'],
  ], { do: 'nextDay' }),

  // ───────── 셋째 날(밤) ─────────
  ...chain('r2_mem_stars', [
    [N, '탑 옆 풀밭에 눕는다. 이 골짜기의 별은 움직이지 않는다.'],
    [N, '마술사가 말없이 곁에 와 앉는다.'],
    [A, '여기 별들은 몇 년째 같은 자리에 있다. 내가 멈춰 놨으니까.'],
    [K, '왜 멈춘 거요?'],
    [A, '…혼자 보는 밤이 너무 빨리 지나가서.'],
  ], { choices: [
    { text: '오늘 밤은 천천히 가도 되겠소.', next: 'r2_mem_stars_a' },
    { text: '(말없이 함께 별을 본다)', next: 'r2_mem_stars_b' },
  ] }),
  ...chain('r2_mem_stars_a', [[A, '…그래. 오늘은 그래도 되겠지.']], { next: 'r2_mem_stars_end' }),
  ...chain('r2_mem_stars_b', [[N, '둘은 한참을 아무 말 없이 누워 있다.']], { next: 'r2_mem_stars_end' }),
  ...chain('r2_mem_stars_end', [[N, '멈춘 별 아래서, 처음으로 밤이 짧게 느껴졌다.']], { memory: 'mem_stars' }),

  ...chain('r2_mem_clock', [
    [N, '탑 문 옆에 낡은 괘종시계가 서 있다. 바늘이 멈춘 채 녹슬어 있다.'],
    [K, '시간의 마술사 집 시계가 멈춰 있다니.'],
    [A, '그건 내가 멈춘 게 아니다. 그냥 고장 난 거다. 나는 손재주가 없어서.'],
    [N, '아코스가 장갑을 벗고, 칼끝으로 태엽을 조심스럽게 감는다. 째깍. 시계가 다시 간다.'],
    [A, '…칼 말고도 쓸 줄 아는 게 있었군.'],
    [K, '우리 왕궁에 솜씨 좋은 시계공이 있소. 어깨너머로 배웠지.'],
    [A, '왕궁의 시계공이라.'],
    [N, '그녀는 다시 가기 시작한 초침을 한참 바라보았다.'],
  ], { memory: 'mem_clock' }),

  ...chain('r2_d3_night', [
    [A, '새벽이면 떠나겠지.'],
    [K, '그렇소. 더 늦으면 안 되오.'],
  ], { choices: [
    { text: '이름을 다시 묻겠소.', if: 'asked_name', next: 'r2_name' },
    { text: '함께 가 주시오.', next: 'r2_d3_ask' },
  ] }),
  ...chain('r2_name', [
    [A, '…끈질기군.'],
    [A, '아이온.'],
  ], { set: 'knows_name', next: 'r2_name_b' }),
  ...chain('r2_name_b', [
    [K, '아이온… 끝나지 않는 시간이라는 뜻이었던가.'],
    [A, '그래서 잘 말하지 않는다. 내 이름을 부르던 사람들은, 다 먼저 가 버렸으니까.'],
    [K, '아이온.'],
    [N, '그는 그 이름을 한 번 더 불렀다. 그녀는 대답하지 않았지만, 고개를 돌리지도 않았다.'],
  ], { memory: 'mem_name', next: 'r2_d3_ask' }),
  ...chain('r2_d3_ask', [
    [K, '함께 가 주시오. 고칠 수 없어도 좋소. 시간을 벌 수만 있다면.'],
    [A, '…대답은 새벽에 하겠다.'],
    [A, '골짜기 어귀에 다리가 있다. 해가 뜰 때까지 내가 오지 않으면, 혼자 가라.'],
    [N, '그 밤, 아코스는 잠들지 못했다.'],
  ], { do: 'region:3' }),

  // ───────── 지역 3: 새벽의 다리 ─────────
  ...chain('r3_arrive', [
    [N, '새벽. 골짜기 어귀의 다리를 건넜다. 여기서부터는 낙엽이 땅에 떨어진다.'],
    [N, '해가 떠오르기 시작한다. 아무도 오지 않는다.'],
    [K, '…그래. 무리한 부탁이었지.'],
    [N, '돌아서려는 순간, 등 뒤에서 째깍이는 소리가 들린다.'],
  ]),
  ...chain('r3_bridge', [
    [A, '혼자 가라고는 했지만, 정말 혼자 가려고 하다니.'],
    [K, '…와 주었구려.'],
  ], { next: 'r3_why_promise' }),
  r3_why_promise: { if: 'promise', who: A, text: '지키지 못할 약속을 하는 자들을 많이 봤다고 했지. 네 약속이 지켜지는 걸, 한 번쯤은 보고 싶어졌다.', next: 'r3_why_people' },
  r3_why_people: { if: 'people', who: A, text: '기다리는 사람이 있다는 게 어떤 건지, 잊고 살았다. 네 나라에 가면 기억날지도 모르지.', next: 'r3_why_stubborn' },
  r3_why_stubborn: { if: 'stubborn', who: A, text: '멈추는 법을 모르는 사람을 혼자 보냈다간, 어디까지 갈지 모르니까.', next: 'r3_name' },
  r3_name: { if: '!knows_name', who: A, text: '…그리고 이름 정도는 알려 줘야겠지. 아이온이다.', set: 'knows_name', next: 'r3_go' },
  ...chain('r3_go', [
    [K, '가지, 아이온. 내 나라로.'],
    [A, '앞장서라, 기사. 나는 걸음이 느리다. …시간이 많은 사람이라서.'],
  ], { do: 'ending' }),

  // ───────── 엔딩: 함께 걷는 동안의 회상(모은 기억 조각만) ─────────
  ending: { who: N, text: '해가 뜨는 쪽으로, 둘이 걷는다.', next: 'ending_falls' },
  ending_falls: { if: 'mem_falls', who: N, text: '멈춘 물보라 아래서, 그녀가 처음 웃었다.', next: 'ending_ring' },
  ending_ring: { if: 'mem_ring', who: N, text: '녹슨 반지를 보고, 그녀는 그가 돌아갈 곳을 말했다.', next: 'ending_stars' },
  ending_stars: { if: 'mem_stars', who: N, text: '움직이지 않는 별 아래서, 밤이 처음으로 짧았다.', next: 'ending_clock' },
  ending_clock: { if: 'mem_clock', who: N, text: '다시 가기 시작한 초침을, 그녀는 오래 바라보았다.', next: 'ending_name' },
  ending_name: { if: 'mem_name', who: N, text: '그가 이름을 불렀을 때, 그녀는 고개를 돌리지 않았다.', next: 'ending_last' },
  ...chain('ending_last', [
    [N, '아코스가 장갑을 고쳐 낀다.'],
    [N, '손목에 번진 검은 딱지가, 가죽 아래로 숨는다.'],
    [A, '왜 그러지?'],
    [K, '…아무것도 아니오. 가지.'],
    [N, '지평선 너머에서, 그의 나라가 기다리고 있다.'],
  ]),
};
```

- [ ] **Step 5: 통과 확인**

Run: `npm test`
Expected: PASS — 51 tests. 실패하면 메시지가 가리키는 노드·트리거를 고친다(테스트를 고치지 않는다).

- [ ] **Step 6: 커밋**

```bash
git add data/regions.js data/script.js tests/content.test.js
git commit -m "feat: 지역 3개 배치와 전체 대본, 완주 시뮬레이션 테스트" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: 3D 화면과 이동

**Files:**
- Create: `index.html`, `src/world.js`, `src/player.js`, `src/ui.js`(임시), `src/main.js`(임시)
- Modify: `data/regions.js`, `data/models.js` (화면을 보며 배치·배율 조정)

**Interfaces:**
- Consumes: `MODELS`, `REGIONS`, `createState`, `has`, `lightFor`, `matches`, `obstaclesFor`, `moveVector`, `facingOf`, `resolve`
- Produces (`world.js`):
  - `spawn(key, { x, y, z, rot, scale, tint }?): Promise<Object3D>` — 스킨 메시도 안전하게 복제. `obj.userData.clips`에 애니메이션 클립.
  - `animate(obj) → { mixer, play(name, { once }?), busy(): boolean }` — `busy()`는 한 번만 재생하는 동작이 도는 중이면 true
  - `plagueLook(obj)` — 몸은 검게, 눈은 황록빛으로
  - `buildRegion(scene, region, state): Promise<{ root, actors: { def, obj, anim }[], update(dt, t) }>` — 배경·안개·조명·지면·소품·배우·코드 소품을 만들어 `scene`에 붙인다. `update`가 배우 표시 조건(`matches`)을 매 프레임 반영한다.
  - 모델을 못 불러오면 `Error('에셋을 불러오지 못했습니다: <경로>')`
- Produces (`player.js`):
  - `createPlayer(obj, anim, camera, canvas) → { state: {x,z,facing,auto}, update(dt, obstacles, bounds), clearKeys(), teleport(x, z, facing), dash(), set onClick(fn) }`
  - `state.auto = true`면 바라보는 방향으로 천천히 저절로 걷는다(엔딩용, 충돌 무시).
- Produces (`ui.js` 임시): `fade(on): Promise`, `showError(msg)`

- [ ] **Step 1: index.html 쓰기**

```html
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Journey of Achos — 아코스의 여정</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700&display=swap">
<style>
  :root { --gold: #c9a86a; --ink: #e8e0d0; --dim: #9a9284; --panel: rgba(12, 10, 16, 0.86); }
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; overflow: hidden; background: #000; color: var(--ink); font-family: 'Nanum Myeongjo', serif; }
  canvas#game { display: block; width: 100vw; height: 100vh; touch-action: none; }
  [hidden] { display: none !important; }
  .overlay { position: fixed; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.2rem; text-align: center; padding: 1rem; }
  #title, #end { background: radial-gradient(ellipse at center, #1d1726 0%, #050407 75%); }
  h1 { font-size: clamp(2rem, 6vw, 3.6rem); letter-spacing: 0.08em; margin: 0; color: var(--gold); font-weight: 700; }
  .sub { color: var(--dim); margin: 0; }
  button { font: inherit; color: var(--ink); background: transparent; border: 1px solid var(--gold); padding: 0.6rem 1.6rem; cursor: pointer; min-width: 12rem; }
  button:hover, button:focus-visible { background: rgba(201, 168, 106, 0.18); outline: none; }
  #dialog { position: fixed; left: 50%; bottom: 4vh; transform: translateX(-50%); width: min(860px, 92vw); background: var(--panel); border: 1px solid var(--gold); padding: 1.1rem 1.4rem 1.2rem; cursor: pointer; }
  #who { color: var(--gold); font-weight: 700; margin-bottom: 0.4rem; }
  #text { line-height: 1.75; min-height: 3.5em; white-space: pre-wrap; }
  #text.narration { color: #c8c0d8; font-style: italic; }
  #choices { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.8rem; }
  #choices button { text-align: left; min-width: 0; }
  #prompt { position: fixed; left: 50%; bottom: 8vh; transform: translateX(-50%); background: var(--panel); border: 1px solid var(--gold); padding: 0.4rem 1rem; }
  #toast { position: fixed; top: 4vh; right: 3vw; background: var(--panel); border-left: 3px solid #a98be0; padding: 0.7rem 1.1rem; }
  #hud { position: fixed; top: 3vh; left: 3vw; font-size: 1.4rem; letter-spacing: 0.2em; color: #e07a6a; }
  #timer { color: #c8b0f0; font-size: 1rem; letter-spacing: 0; margin-left: 1rem; }
  #fade { position: fixed; inset: 0; background: #000; opacity: 0; pointer-events: none; transition: opacity 0.6s; }
  #fade.on { opacity: 1; }
  #error { background: rgba(0, 0, 0, 0.94); color: #f0c0b0; white-space: pre-wrap; }
</style>
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"
  }
}
</script>
</head>
<body>
<canvas id="game"></canvas>
<div id="hud" hidden><span id="hearts"></span><span id="timer"></span></div>
<div id="prompt" hidden></div>
<div id="toast" hidden></div>
<div id="dialog" hidden><div id="who"></div><div id="text"></div><div id="choices"></div></div>
<div id="fade" class="on"></div>
<div id="title" class="overlay" hidden>
  <h1>Journey of Achos</h1>
  <p class="sub">아코스의 여정</p>
  <button id="btn-continue" hidden>이어하기</button>
  <button id="btn-new">새로 시작</button>
</div>
<div id="end" class="overlay" hidden>
  <h1>Journey of Achos</h1>
  <p class="sub" id="end-memories"></p>
  <button id="btn-restart">처음으로</button>
</div>
<div id="error" class="overlay" hidden></div>
<script type="module" src="src/main.js"
  onerror="var e=document.getElementById('error');e.textContent='게임 파일을 불러오지 못했습니다.\n인터넷 연결을 확인하고 새로고침해 주세요.';e.hidden=false"></script>
</body>
</html>
```

- [ ] **Step 2: world.js 쓰기**

```js
// 3D 씬 구성: 모델 로드·복제, 지역 조립, 조명 프리셋, 코드로 만드는 소품.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { MODELS } from '../data/models.js';
import { lightFor, matches } from './region.js';
import { has } from './story.js';

const loader = new GLTFLoader();
const cache = new Map();

function loadModel(key) {
  const def = MODELS[key];
  if (!def) return Promise.reject(new Error(`모르는 모델: ${key}`));
  if (!cache.has(key)) {
    cache.set(key, loader.loadAsync(def.url).catch(() => {
      cache.delete(key);
      throw new Error(`에셋을 불러오지 못했습니다: ${def.url}`);
    }));
  }
  return cache.get(key);
}

// 스킨 메시는 SkeletonUtils.clone으로 복제해야 뼈대를 공유하지 않는다(일반 메시에도 써도 된다).
export async function spawn(key, { x = 0, y = 0, z = 0, rot = 0, scale = 1, tint } = {}) {
  const gltf = await loadModel(key);
  const obj = clone(gltf.scene);
  obj.scale.setScalar(scale * MODELS[key].scale);
  obj.position.set(x, y, z);
  obj.rotation.y = rot;
  const color = tint && new THREE.Color(tint);
  obj.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = o.receiveShadow = true;
    if (color) { o.material = o.material.clone(); o.material.color.multiply(color); }
  });
  obj.userData.clips = gltf.animations;
  return obj;
}

// 역병에 먹힌 것: 몸은 검게 굳고, 눈만 병든 황록빛으로 빛난다.
export function plagueLook(obj) {
  obj.traverse(o => {
    if (!o.isMesh) return;
    o.material = o.material.clone();
    if (o.name.includes('Eyes')) {
      o.material.color.set('#b6e04a');
      o.material.emissive = new THREE.Color('#9acd32');
      o.material.emissiveIntensity = 2;
    } else {
      o.material.color.set('#26241f');
    }
  });
}

export function animate(obj) {
  const mixer = new THREE.AnimationMixer(obj);
  let current = null;
  return {
    mixer,
    play(name, { once = false } = {}) {
      const clip = THREE.AnimationClip.findByName(obj.userData.clips, name);
      if (!clip) return;
      const action = mixer.clipAction(clip);
      if (action === current && !once) return;
      action.reset();
      action.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
      action.clampWhenFinished = once;
      action.fadeIn(0.15).play();
      if (current && current !== action) current.fadeOut(0.15);
      current = action;
    },
    busy: () => !!current && current.loop === THREE.LoopOnce && current.isRunning(),
  };
}

const LIGHTS = {
  night: { sky: '#0b0f1a', fog: [14, 75], hemi: ['#5a6a9a', '#141018', 1.0], sun: ['#9fb0e0', 0.7, [-20, 30, 10]], stars: true },
  dusk: { sky: '#4a3048', fog: [20, 95], hemi: ['#d89a7a', '#2a1f2a', 1.1], sun: ['#ff9a5a', 1.6, [-30, 14, -20]] },
  day: { sky: '#a9bccb', fog: [35, 130], hemi: ['#e6eef4', '#4a5a3a', 1.3], sun: ['#fff1d6', 2.4, [20, 40, 10]] },
  dawn: { sky: '#e3a487', fog: [30, 170], hemi: ['#ffd6b8', '#3a3040', 1.2], sun: ['#ffb070', 2.0, [0, 10, -80]] },
};

// ponytail: 지역을 바꿀 때 코드로 만든 지오메트리를 dispose하지 않는다. 한 판에 지역 로드가 5번 남짓이라 괜찮다.
// 오래 켜 두는 구조로 바뀌면 root.traverse로 geometry·material을 dispose한다.
export async function buildRegion(scene, region, state) {
  const root = new THREE.Group();
  const L = LIGHTS[lightFor(region, state)];
  scene.background = new THREE.Color(L.sky);
  scene.fog = new THREE.Fog(L.sky, ...L.fog);
  root.add(new THREE.HemisphereLight(...L.hemi));
  const sun = new THREE.DirectionalLight(L.sun[0], L.sun[1]);
  sun.position.set(...L.sun[2]);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, far: 200 });
  root.add(sun);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshStandardMaterial({ color: region.ground, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  root.add(ground);

  for (const obj of await Promise.all(region.props.map(p => spawn(p.m, p)))) root.add(obj);
  const actors = await Promise.all(region.actors.map(async def => {
    const obj = await spawn(def.m, def);
    const anim = animate(obj);
    anim.play(def.anim ?? 'Idle');
    root.add(obj);
    return { def, obj, anim };
  }));

  const updaters = region.procs.map(p => PROCS[p.kind](root, p, state)).filter(Boolean);
  if (L.stars) PROCS.stars(root);
  scene.add(root);
  return {
    root,
    actors,
    update(dt, t) {
      for (const a of actors) { a.obj.visible = matches(a.def, state); a.anim.mixer.update(dt); }
      for (const u of updaters) u(dt, t);
    },
  };
}

function seeded(seed) {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
}

// 코드로 만드는 소품. (root, 데이터, state) → 매 프레임 호출할 함수 또는 undefined
const PROCS = {
  lamp(root, p) {
    const light = new THREE.PointLight('#ffb35c', 40, 18, 2);
    light.position.set(p.x, p.y ?? 3, p.z);
    root.add(light);
  },
  fire(root, p) {
    const light = new THREE.PointLight('#ff7a2e', 45, 16, 2);
    light.position.set(p.x, 1.2, p.z);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 8), new THREE.MeshBasicMaterial({ color: '#ff9a3c' }));
    flame.position.set(p.x, 0.45, p.z);
    root.add(light, flame);
    return (dt, t) => {
      light.intensity = 40 + Math.sin(t * 13) * 5 + Math.sin(t * 7.3) * 3;
      flame.scale.y = 1 + Math.sin(t * 11) * 0.15;
    };
  },
  blight(root, p) {
    // 역병 얼룩: 검은 원판에 병든 황록빛 테두리
    const s = p.s ?? 1.2;
    const spot = new THREE.Mesh(new THREE.CircleGeometry(s, 24), new THREE.MeshStandardMaterial({ color: '#0a0a08', roughness: 1 }));
    const rim = new THREE.Mesh(new THREE.RingGeometry(s * 0.85, s, 24), new THREE.MeshBasicMaterial({ color: '#9acd32', transparent: true, opacity: 0.35 }));
    spot.position.set(p.x, 0.02, p.z);
    rim.position.set(p.x, 0.03, p.z);
    spot.rotation.x = rim.rotation.x = -Math.PI / 2;
    root.add(spot, rim);
  },
  water(root, p) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.d), new THREE.MeshStandardMaterial({ color: '#2b4a5e', roughness: 0.15, metalness: 0.2 }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(p.x, 0.04, p.z);
    root.add(m);
  },
  waterfall(root, p) {
    // 멈춘 폭포: 물줄기 판과 공중에 매달린 물방울. 시간이 멈춰 있으니 움직이지 않는다.
    const g = new THREE.Group();
    g.position.set(p.x, 0, p.z);
    g.rotation.y = p.rot ?? 0;
    const fall = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.h), new THREE.MeshStandardMaterial({
      color: '#cde8f4', emissive: '#2f5f74', transparent: true, opacity: 0.8, roughness: 0.1, side: THREE.DoubleSide,
    }));
    fall.position.y = p.h / 2;
    const n = 160, rnd = seeded(11), m = new THREE.Matrix4();
    const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.08, 6, 4), new THREE.MeshStandardMaterial({ color: '#e8f6ff', emissive: '#6aa8c8' }), n);
    for (let i = 0; i < n; i++) drops.setMatrixAt(i, m.makeTranslation((rnd() - 0.5) * p.w, rnd() * p.h * 0.5, rnd() * 3));
    g.add(fall, drops);
    root.add(g);
  },
  leaves(root, p) {
    // 공중에 멈춘 낙엽. 시드가 고정이라 매번 같은 자리에 걸려 있다.
    const rnd = seeded(7), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    const pos = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
    const leaves = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.28, 0.2), new THREE.MeshStandardMaterial({ color: '#c7703a', side: THREE.DoubleSide }), p.n);
    for (let i = 0; i < p.n; i++) {
      pos.set(p.x + (rnd() - 0.5) * p.w, 0.8 + rnd() * 7, p.z + (rnd() - 0.5) * p.d);
      q.setFromEuler(e.set(rnd() * 6, rnd() * 6, rnd() * 6));
      leaves.setMatrixAt(i, m.compose(pos, q, one));
    }
    root.add(leaves);
  },
  clock(root, p, state) {
    // 탑 앞의 낡은 괘종시계. 아코스가 고치면(mem_clock) 초침이 돈다.
    const g = new THREE.Group();
    g.position.set(p.x, 0, p.z);
    g.rotation.y = p.rot ?? 0;
    const body = new THREE.Mesh(new THREE.BoxGeometry(1, 3.2, 0.6), new THREE.MeshStandardMaterial({ color: '#4a3424', roughness: 0.9 }));
    body.position.y = 1.6;
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.4, 32), new THREE.MeshStandardMaterial({ color: '#d8ccb0' }));
    face.position.set(0, 2.6, 0.31);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.34, 0.02), new THREE.MeshStandardMaterial({ color: '#1a1410' }));
    hand.geometry.translate(0, 0.17, 0);
    hand.position.set(0, 2.6, 0.33);
    hand.rotation.z = -2.1;
    g.add(body, face, hand);
    root.add(g);
    return dt => { if (has(state, 'mem_clock')) hand.rotation.z -= (dt * Math.PI) / 30; };
  },
  stars(root) {
    const n = 700, rnd = seeded(3), pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, h = 0.15 + rnd() * 0.85, ring = Math.sqrt(1 - h * h) * 180;
      pos.set([Math.cos(a) * ring, h * 180, Math.sin(a) * ring], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    root.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, fog: false })));
  },
};
```

- [ ] **Step 3: player.js 쓰기**

```js
// 3인칭 조작: WASD(방향키) 이동, Shift 달리기, 마우스 드래그로 시야 회전, 짧은 클릭 콜백, 회피 대시.
// 키는 e.code로 읽는다. 한글 입력 상태에서도 같은 자리의 키가 같은 뜻이 된다.
import { moveVector, facingOf, resolve } from './geom.js';

const WALK = 4.2, RUN = 7.5, DASH = 13, DASH_TIME = 0.25, AUTO_WALK = 1.3, RADIUS = 0.6, CAM_DIST = 9;
const CODES = {
  KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd',
  ArrowUp: 'w', ArrowLeft: 'a', ArrowDown: 's', ArrowRight: 'd',
  ShiftLeft: 'shift', ShiftRight: 'shift',
};

export function createPlayer(obj, anim, camera, canvas) {
  const keys = {};
  const st = { x: 0, z: 0, facing: 0, auto: false };
  let yaw = 0, pitch = 0.32, dash = 0, dashDir = null, drag = null, onClick = () => {};

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
    else v = moveVector(keys, yaw);
    if (v) {
      const next = { x: st.x + v.x * speed * dt, z: st.z + v.z * speed * dt };
      Object.assign(st, st.auto ? next : resolve(next, RADIUS, obstacles, bounds));
      if (!st.auto && dash <= 0) st.facing = facingOf(v);
    }
    if (!anim.busy()) anim.play(!v ? 'Idle' : speed === RUN ? 'Running_A' : 'Walking_A');
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
    },
    dash() {
      dash = DASH_TIME;
      dashDir = moveVector(keys, yaw) ?? { x: Math.sin(st.facing), z: Math.cos(st.facing) };
      anim.play('Dodge_Forward', { once: true });
    },
    set onClick(fn) { onClick = fn; },
  };
}
```

- [ ] **Step 4: 임시 ui.js 쓰기** (Task 8에서 전체를 바꾼다)

```js
// DOM 오버레이(임시). Task 8에서 대화창·타이틀 등이 더해진다.
const $ = id => document.getElementById(id);

export function fade(on) {
  $('fade').classList.toggle('on', on);
  return new Promise(r => setTimeout(r, 650));
}

export function showError(msg) {
  const el = $('error');
  el.textContent = `문제가 생겼습니다.\n\n${msg}\n\n새로고침해서 다시 시도해 주세요.`;
  el.hidden = false;
}
```

- [ ] **Step 5: 임시 main.js 쓰기** (Task 8에서 전체를 바꾼다)

```js
// 진입점(임시): 지역 하나를 띄우고 아코스로 걸어 다닌다. ?region=2&day=3 처럼 골라 볼 수 있다.
import * as THREE from 'three';
import { REGIONS } from '../data/regions.js';
import { createState } from './story.js';
import { obstaclesFor } from './region.js';
import { buildRegion, spawn, animate } from './world.js';
import { createPlayer } from './player.js';
import * as ui from './ui.js';

const canvas = document.getElementById('game');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); }
catch (e) { ui.showError('이 브라우저에서 WebGL을 쓸 수 없습니다.'); throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 400);
function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

const params = new URLSearchParams(location.search);
const state = createState();
state.region = Number(params.get('region') ?? 1);
state.day = Number(params.get('day') ?? 1);
const region = REGIONS[state.region];
let world, player, hero;

async function boot() {
  world = await buildRegion(scene, region, state);
  const obj = await spawn('knight');
  hero = animate(obj);
  scene.add(obj);
  player = createPlayer(obj, hero, camera, canvas);
  player.teleport(region.start.x, region.start.z, region.start.rot);
  await ui.fade(false);
}

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  world?.update(dt, clock.elapsedTime);
  hero?.mixer.update(dt);
  player?.update(dt, obstaclesFor(region, state), region.bounds);
  renderer.render(scene, camera);
});
boot().catch(e => { console.error(e); ui.showError(e.message); });
```

- [ ] **Step 6: 브라우저에서 확인**

Run: `npm run serve` 후 `http://localhost:8000/?region=1`, `?region=2&day=1`, `?region=2&day=2`, `?region=2&day=3`, `?region=3` 을 차례로 연다.
확인할 것:
- 콘솔 오류 없음. 아코스가 서 있고 WASD로 걷고 Shift로 달리며 애니메이션이 바뀐다.
- **한글 입력 상태로 바꾼 뒤에도** WASD가 똑같이 동작한다.
- 마우스로 끌면 시야가 돌고, 놓으면 그 시야 기준으로 W가 앞이다.
- 집·벽·나무에 막히고 지역 경계 밖으로 나가지 않는다. 지역 1의 성문은 닫혀 있다(통과 불가).
- 조명이 지역·날짜별로 다르다(왕도 밤 + 가로등, 골짜기 노을/낮/밤 + 별, 새벽).
- 지역 2: 공중에 멈춘 낙엽, 멈춘 폭포, 보랏빛 탑, 괘종시계가 보인다. 날짜마다 마술사 위치가 다르다.
- 지역 1: 병상의 왕자가 침대 위에 누워 있다(아니면 actor의 `y`·`rot`를 조정).
- Chrome DevTools → Rendering → Frame Rendering Stats에서 60fps 근처(최소 30fps).
- **오류 화면 확인**: `assets/kaykit/hexagon/buildings/red/building_castle_red.gltf`의 이름을 잠깐 바꾸고 새로고침 → "에셋을 불러오지 못했습니다: …castle…"가 보인다. 이름을 되돌린다.

- [ ] **Step 7: 배치와 배율 조정**

화면에서 어색한 것(건물이 너무 크거나 작음, 물에 잠긴 다리, 벽과 성문 틈, 충돌 반경이 모델과 안 맞음, 트리거가 배우와 어긋남)을 `data/regions.js`·`data/models.js`에서 고친다. 트리거는 해당 배우 위치와 같게 유지한다. 고칠 때마다 `npm test`로 대본·배치 테스트가 그대로 통과하는지 확인한다.

Run: `npm test`
Expected: PASS — 51 tests

- [ ] **Step 8: 커밋**

```bash
git add index.html src/world.js src/player.js src/ui.js src/main.js data/regions.js data/models.js
git commit -m "feat: 3D 지역 조립, 조명 프리셋, 3인칭 이동" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: 이야기 연결(트리거·대화·저장·지역 전환)

**Files:**
- Modify: `src/ui.js` (전체 교체)
- Modify: `src/main.js` (전체 교체)

**Interfaces:**
- Consumes: Task 1~7 전부
- Produces (`ui.js`):
  - `showPrompt(text|null)`, `showLine(view, speaker, onChoose(i))`, `completeTyping(): boolean`(글자가 나오는 중이었으면 끝까지 보여 주고 true), `hideDialog()`, `onDialogClick(cb)`
  - `toast(text)`, `showHud(hp, max, timeLeft|null)`, `hideHud()`, `setFrozenLook(on)`, `tick()`
  - `fade(on): Promise`, `showTitle(canContinue): Promise<'continue'|'new'>`, `showEnd(found, total): Promise`, `showError(msg)`
- Produces (`main.js`): Task 9·10이 고칠 자리 — `startFight(id)`(지금은 임시), `startEnding()`(지금은 임시), 게임 루프

- [ ] **Step 1: ui.js 전체 교체**

```js
// DOM 오버레이: 대화창, 프롬프트, 토스트, HUD, 페이드, 타이틀/엔딩 화면, 오류, 시계 소리.
const $ = id => document.getElementById(id);
let typing = null;

export function showPrompt(text) {
  $('prompt').textContent = text ?? '';
  $('prompt').hidden = !text;
}

// 글자를 한 자씩 보여 주고, 다 나오면 선택지 버튼을 붙인다.
export function showLine(view, speaker, onChoose) {
  const textEl = $('text'), choicesEl = $('choices');
  $('dialog').hidden = false;
  $('who').textContent = speaker;
  $('who').hidden = !speaker;
  textEl.classList.toggle('narration', !speaker);
  textEl.textContent = '';
  choicesEl.replaceChildren();
  if (typing) clearInterval(typing.id);
  const chars = [...view.text];
  let i = 0;
  function finish() {
    clearInterval(typing.id);
    typing = null;
    textEl.textContent = view.text;
    (view.choices ?? []).forEach((c, idx) => {
      const b = document.createElement('button');
      b.textContent = `${idx + 1}. ${c}`;
      b.onclick = e => { e.stopPropagation(); onChoose(idx); };
      choicesEl.append(b);
    });
    choicesEl.querySelector('button')?.focus();
  }
  typing = { id: setInterval(() => { textEl.textContent += chars[i++] ?? ''; if (i >= chars.length) finish(); }, 28), finish };
  if (!chars.length) finish();
}

export function completeTyping() {
  if (!typing) return false;
  typing.finish();
  return true;
}

export function hideDialog() {
  if (typing) clearInterval(typing.id);
  typing = null;
  $('dialog').hidden = true;
}

export function onDialogClick(cb) {
  $('dialog').addEventListener('click', e => { if (!e.target.closest('button')) cb(); });
}

let toastTimer;
export function toast(text) {
  const el = $('toast');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3200);
}

export function showHud(hp, max, timeLeft) {
  const h = Math.max(0, hp);
  $('hud').hidden = false;
  $('hearts').textContent = '♥'.repeat(h) + '♡'.repeat(max - h);
  $('timer').textContent = timeLeft == null ? '' : `멈춘 시간 ${Math.max(0, Math.ceil(timeLeft))}초`;
}

export function hideHud() { $('hud').hidden = true; }

export function setFrozenLook(on) {
  $('game').style.filter = on ? 'grayscale(0.85) sepia(0.25) hue-rotate(220deg) brightness(0.9)' : '';
}

export function fade(on) {
  $('fade').classList.toggle('on', on);
  return new Promise(r => setTimeout(r, 650));
}

export function showTitle(canContinue) {
  $('title').hidden = false;
  $('btn-continue').hidden = !canContinue;
  (canContinue ? $('btn-continue') : $('btn-new')).focus();
  return new Promise(resolve => {
    const pick = choice => () => { $('title').hidden = true; resolve(choice); };
    $('btn-continue').onclick = pick('continue');
    $('btn-new').onclick = pick('new');
  });
}

export function showEnd(found, total) {
  $('end-memories').textContent = `모은 기억 조각 ${found} / ${total}`;
  $('end').hidden = false;
  $('btn-restart').focus();
  return new Promise(resolve => { $('btn-restart').onclick = resolve; });
}

export function showError(msg) {
  const el = $('error');
  el.textContent = `문제가 생겼습니다.\n\n${msg}\n\n새로고침해서 다시 시도해 주세요.`;
  el.hidden = false;
}

let audio;
// 시계 째깍 소리: 짧은 사각파 두 번을 합성한다. 브라우저가 소리를 막으면 조용히 넘어간다.
export function tick() {
  try {
    audio ??= new AudioContext();
    const t = audio.currentTime;
    for (const [dt, freq] of [[0, 1800], [0.09, 1400]]) {
      const osc = audio.createOscillator(), gain = audio.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.05, t + dt);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.04);
      osc.connect(gain).connect(audio.destination);
      osc.start(t + dt);
      osc.stop(t + dt + 0.05);
    }
  } catch { /* 소리 없이 진행한다 */ }
}
```

- [ ] **Step 2: main.js 전체 교체**

```js
// 진입점: 렌더러, 게임 루프, 모드 전환(타이틀 → 탐험 ⇄ 대화 ⇄ 전투 → 엔딩).
import * as THREE from 'three';
import { SCRIPT, MEMORIES } from '../data/script.js';
import { REGIONS, FIGHTS } from '../data/regions.js';
import { createState, createDialogue, applyEffect, winFight, markDone, speakerName, saveGame, loadGame, clearSave } from './story.js';
import { triggersFor, obstaclesFor } from './region.js';
import { dist } from './geom.js';
import { buildRegion, spawn, animate } from './world.js';
import { createPlayer } from './player.js';
import * as ui from './ui.js';

const canvas = document.getElementById('game');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); }
catch (e) { ui.showError('이 브라우저에서 WebGL을 쓸 수 없습니다.'); throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 400);
function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// localStorage 접근 자체가 막혀 있으면 null. story.js의 저장 함수들은 null도 받아 준다.
const storage = (() => { try { return localStorage; } catch { return null; } })();
let state, world, player, hero;
let mode = 'title';   // title | loading | explore | dialogue | combat | end | error
let dialogue = null, view = null, ending = null;

const region = () => REGIONS[state.region];

function fail(e) {
  console.error(e);
  mode = 'error';
  ui.showError(e.message);
}

async function enterRegion() {
  mode = 'loading';
  ui.showPrompt(null);
  await ui.fade(true);
  if (world) scene.remove(world.root);
  world = await buildRegion(scene, region(), state);
  if (!player) {
    const obj = await spawn('knight');
    hero = animate(obj);
    scene.add(obj);
    player = createPlayer(obj, hero, camera, canvas);
  }
  const s = region().start;
  player.teleport(s.x, s.z, s.rot);
  saveGame(storage, state);
  await ui.fade(false);
  if (state.pendingFight) await startFight(state.pendingFight);
  else mode = 'explore';
}

function nearestTrigger() {
  let best = null, bestD = Infinity;
  for (const t of triggersFor(region(), state)) {
    const d = dist(player.state, t);
    if (d <= t.r && d < bestD) { best = t; bestD = d; }
  }
  return best;
}

function checkTriggers() {
  const t = nearestTrigger();
  if (t?.auto) return openDialogue(t.node, t);
  ui.showPrompt(t ? `[E] ${t.label}${t.ends ? ' (되돌릴 수 없음)' : ''}` : null);
}

function openDialogue(nodeId, trigger) {
  if (trigger) markDone(state, trigger);
  mode = 'dialogue';
  player.clearKeys();
  hero.play('Idle');
  ui.showPrompt(null);
  dialogue = createDialogue(SCRIPT, state);
  show(dialogue.start(nodeId));
}

function show(v) {
  view = v;
  if (!v) { closeDialogue().catch(fail); return; }
  if (v.memory) ui.toast(`기억 조각 — ${MEMORIES[v.memory]}`);
  if (v.text.includes('째깍')) ui.tick();
  ui.showLine(v, speakerName(v.who, state), i => show(dialogue.choose(i)));
}

function advance() {
  if (ui.completeTyping() || view?.choices) return;
  show(dialogue.next());
}

async function closeDialogue() {
  ui.hideDialog();
  const effects = dialogue.takeEffects();
  dialogue = view = null;
  if (ending) return finish();
  mode = 'explore';
  const cmds = effects.map(fx => applyEffect(state, fx));
  if (cmds.some(c => c.type === 'ending')) return startEnding();
  saveGame(storage, state);
  for (const c of cmds) {
    if (c.type === 'reload') await enterRegion();
    if (c.type === 'combat') await startFight(c.id);
  }
}

// Task 9에서 실제 전투로 바뀐다. 지금은 바로 이긴 것으로 친다.
async function startFight() {
  openDialogue(winFight(state, FIGHTS));
}

// Task 10에서 함께 걷는 연출로 바뀐다. 지금은 엔딩 대사만 띄운다.
function startEnding() {
  clearSave(storage);
  ending = {};
  openDialogue('ending');
}

async function finish() {
  mode = 'end';
  await ui.fade(true);
  await ui.showEnd(state.memories.length, Object.keys(MEMORIES).length);
  location.reload();
}

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
  }
});
ui.onDialogClick(() => { if (mode === 'dialogue') advance(); });

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  world?.update(dt, t);
  hero?.mixer.update(dt);
  if (player && (mode === 'explore' || mode === 'combat' || ending)) {
    player.update(dt, obstaclesFor(region(), state), region().bounds);
  }
  if (mode === 'explore') checkTriggers();
  renderer.render(scene, camera);
});

async function boot() {
  const saved = loadGame(storage);
  state = (await ui.showTitle(!!saved)) === 'continue' ? saved : createState();
  if (state.pendingFight && !FIGHTS[state.pendingFight]) state.pendingFight = null;
  await enterRegion();
}
boot().catch(fail);
```

- [ ] **Step 3: 테스트 통과 확인**

Run: `npm test`
Expected: PASS — 51 tests (순수 모듈은 바뀌지 않았다)

- [ ] **Step 4: 브라우저에서 확인** (`npm run serve`, `http://localhost:8000`)

- 타이틀에 "새로 시작"만 보인다(저장 없음). 누르면 왕도에서 첫 나레이션이 자동으로 뜬다.
- 글자가 한 자씩 나오고, 클릭·Space·E·Enter를 한 번 누르면 끝까지 보이고, 한 번 더 누르면 다음 줄로 간다.
- 선택지는 클릭·숫자키·버튼 포커스 후 Enter로 고를 수 있다. **한글 입력 상태에서도** E·Space·숫자키가 동작한다.
- 가까이 가면 `[E] …` 프롬프트가 뜨고, 한 번 끝낸 트리거는 다시 뜨지 않는다. 왕을 뵙기 전엔 성문에서 "굳게 닫혀 있다"가 한 번 나온다.
- 성문 경비병과 대화한 뒤 성문을 지나갈 수 있다. 길에서 전투 대사가 나오고(지금은 바로 이긴 것으로 처리) 여행자 → 골짜기로 넘어간다.
- 골짜기: 첫날 → 둘째 날 → 셋째 날로 조명·마술사 위치가 바뀌고, 이름을 들은 뒤 화자 표시가 `마술사` → `아이온`으로 바뀐다. 기억 조각을 얻으면 오른쪽 위에 토스트가 뜬다.
- **W를 누른 채 트리거에 다가가 자동 대화가 열리게 한 뒤 대화를 끝낸다** → 아코스가 혼자 걷지 않는다. W를 누른 채 다른 창으로 Alt+Tab 했다가 돌아와도 마찬가지다.
- 대화 도중 새로고침 → "이어하기"가 보이고, 누르면 그 대화를 시작하기 전 상태로 돌아온다.
- DevTools → Application → Local Storage에서 `journeyOfAchos.save` 값을 `{`로 바꾸고 새로고침 → "새로 시작"만 보이고 오류 없이 진행된다.
- 새벽의 다리에서 엔딩 대사가 나오고, 끝나면 "모은 기억 조각 n / 5"와 "처음으로"가 보인다. 누르면 타이틀로 돌아가고 "이어하기"는 없다.

- [ ] **Step 5: 커밋**

```bash
git add src/ui.js src/main.js
git commit -m "feat: 트리거·대화창·선택지·자동 저장·지역 전환 연결" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: 전투 연결

**Files:**
- Modify: `src/main.js`

**Interfaces:**
- Consumes: Task 4의 `createFight`, `update`, `swing`, `dodge`, `PLAYER_MAX_HP`; Task 7의 `spawn`, `animate`, `plagueLook`; Task 2의 `winFight`
- 쓰는 애니메이션: 아코스 `1H_Melee_Attack_Slice_Horizontal`, `Dodge_Forward`, `Hit_A`, `Death_A`; 적(Skeleton_Minion) `Walking_A`, `Idle`, `Running_A`, `1H_Melee_Attack_Chop`, `Hit_A`, `Death_A`

- [ ] **Step 1: import 바꾸기** — `src/main.js`에서

찾기:
```js
import { buildRegion, spawn, animate } from './world.js';
```
바꾸기:
```js
import { buildRegion, spawn, animate, plagueLook } from './world.js';
import { createFight, update as updateFight, swing, dodge, PLAYER_MAX_HP } from './combat.js';
```

- [ ] **Step 2: 전투 상태 변수 추가**

찾기:
```js
let dialogue = null, view = null, ending = null;
```
바꾸기:
```js
let dialogue = null, view = null, ending = null;
let fight = null, enemies = [], dying = [], tickAcc = 0;
```

- [ ] **Step 3: 클릭을 공격에 연결**

찾기:
```js
    player = createPlayer(obj, hero, camera, canvas);
  }
```
바꾸기:
```js
    player = createPlayer(obj, hero, camera, canvas);
    player.onClick = attack;
  }
```

- [ ] **Step 4: 임시 startFight를 실제 전투로 교체**

찾기:
```js
// Task 9에서 실제 전투로 바뀐다. 지금은 바로 이긴 것으로 친다.
async function startFight() {
  openDialogue(winFight(state, FIGHTS));
}
```
바꾸기:
```js
async function startFight(id) {
  mode = 'loading';
  const def = FIGHTS[id];
  fight = createFight(def);
  if (def.player) player.teleport(...def.player);
  enemies = await Promise.all(fight.enemies.map(async e => {
    const obj = await spawn('minion', { x: e.x, z: e.z });
    plagueLook(obj);
    const anim = animate(obj);
    scene.add(obj);
    return { obj, anim };
  }));
  // 멈춘 시간: 달려들던 자세 그대로 굳혀 둔다(믹서를 조금만 돌리고 더 돌리지 않는다).
  if (def.frozen) for (const { anim } of enemies) { anim.play('Running_A'); anim.mixer.update(0.4); }
  ui.setFrozenLook(!!def.frozen);
  tickAcc = 0;
  mode = 'combat';
}

function stepFight(dt) {
  const events = updateFight(fight, dt, player.state);
  fight.enemies.forEach((e, i) => {
    const { obj, anim } = enemies[i];
    if (e.hp <= 0) { anim.mixer.update(dt); return; }
    obj.position.set(e.x, 0, e.z);
    obj.rotation.y = Math.atan2(player.state.x - e.x, player.state.z - e.z);
    if (fight.def.frozen) return;
    anim.mixer.update(dt);
    if (!anim.busy()) anim.play(dist(e, player.state) > 1.6 ? 'Walking_A' : 'Idle');
  });
  for (const ev of events) {
    const [kind, i] = ev.split(':');
    if (kind === 'windup') enemies[i].anim.play('1H_Melee_Attack_Chop', { once: true });
    if (kind === 'hurt') hero.play('Hit_A', { once: true });
    if (kind === 'lost') return loseFight();
  }
  if (fight.def.frozen && (tickAcc += dt) >= 1) { tickAcc -= 1; ui.tick(); }
  ui.showHud(fight.hp, PLAYER_MAX_HP, fight.def.frozen ? fight.def.timeLimit - fight.time : null);
}

function attack() {
  if (mode !== 'combat') return;
  const events = swing(fight, player.state);
  if (!events.length) return;
  hero.play('1H_Melee_Attack_Slice_Horizontal', { once: true });
  for (const ev of events) {
    const [kind, i] = ev.split(':');
    if (kind === 'hit') enemies[i].anim.play('Hit_A', { once: true });
    if (kind === 'down') enemies[i].anim.play('Death_A', { once: true });
    if (kind === 'won') winCurrentFight();
  }
}

function clearFight() {
  ui.setFrozenLook(false);
  ui.hideHud();
  dying = enemies;
  enemies = [];
  fight = null;
}

function winCurrentFight() {
  mode = 'loading';
  clearFight();
  setTimeout(() => {
    for (const e of dying) scene.remove(e.obj);
    dying = [];
    openDialogue(winFight(state, FIGHTS));
  }, 1500);
}

function loseFight() {
  mode = 'loading';
  const id = state.pendingFight, frozen = fight.def.frozen;
  clearFight();
  for (const e of dying) scene.remove(e.obj);
  dying = [];
  hero.play('Death_A', { once: true });
  ui.toast(frozen ? '멈춘 시간이 다시 흐른다… 처음부터.' : '쓰러졌다… 다시 일어선다.');
  setTimeout(() => startFight(id).catch(fail), 1800);
}
```

- [ ] **Step 5: 회피 키 연결**

찾기:
```js
  } else if (mode === 'explore' && e.code === 'KeyE') {
    const t = nearestTrigger();
    if (t && !t.auto) openDialogue(t.node, t);
  }
});
```
바꾸기:
```js
  } else if (mode === 'explore' && e.code === 'KeyE') {
    const t = nearestTrigger();
    if (t && !t.auto) openDialogue(t.node, t);
  } else if (mode === 'combat' && e.code === 'Space' && dodge(fight)) {
    player.dash();
  }
});
```

- [ ] **Step 6: 게임 루프에 전투 넣기**

찾기:
```js
  hero?.mixer.update(dt);
  if (player && (mode === 'explore' || mode === 'combat' || ending)) {
```
바꾸기:
```js
  hero?.mixer.update(dt);
  for (const e of dying) e.anim.mixer.update(dt);
  if (player && (mode === 'explore' || mode === 'combat' || ending)) {
```

찾기:
```js
  if (mode === 'explore') checkTriggers();
  renderer.render(scene, camera);
```
바꾸기:
```js
  if (mode === 'explore') checkTriggers();
  if (mode === 'combat') stepFight(dt);
  renderer.render(scene, camera);
```

- [ ] **Step 7: 테스트 통과 확인**

Run: `npm test`
Expected: PASS — 51 tests

- [ ] **Step 8: 브라우저에서 확인**

- 왕도 길: 검게 굳은 몸에 황록빛 눈을 한 적 둘이 걸어온다. 공격 직전 내려찍는 동작을 보고 Space로 피하면 체력이 줄지 않는다. 클릭하면 베기 동작이 나오고, 앞쪽 적만 맞는다. 셋째 대에 쓰러진다. 왼쪽 위에 ♥ 5칸이 보인다.
- 일부러 맞아서 체력이 0이 되면 "쓰러졌다… 다시 일어선다." 뒤에 같은 전투가 처음부터 다시 시작한다(게임 오버 없음).
- 골짜기 둘째 날 입구: 3마리 전투 → 대사 → 화면이 보라빛 흑백이 되고 적 6마리가 달려들던 자세로 굳는다. `멈춘 시간 25초`가 줄어들고 1초마다 째깍 소리가 난다. 한 번씩 베면 쓰러지며, 다 베면 색이 돌아오고 대사가 이어진다. 시간을 넘기면 처음부터 다시 한다.
- **전투 도중 새로고침 → "이어하기" → 같은 전투가 처음부터 시작한다.** 전투를 이긴 직후 대사 도중 새로고침해도 같은 전투로 돌아온다(막히지 않는다).
- 전투 중 fps가 30 이상이다.

- [ ] **Step 9: 커밋**

```bash
git add src/main.js
git commit -m "feat: 전투 연결(베기·회피·피격·재시작·멈춘 시간 연출)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: 엔딩 연출, README, 최종 확인

**Files:**
- Modify: `src/main.js`
- Create: `README.md`

**Interfaces:**
- Consumes: Task 7의 `player.state.auto`, `player.teleport`, `world.actors`; Task 8의 `finish`, `openDialogue`

- [ ] **Step 1: 임시 startEnding을 함께 걷는 연출로 교체** — `src/main.js`

찾기:
```js
// Task 10에서 함께 걷는 연출로 바뀐다. 지금은 엔딩 대사만 띄운다.
function startEnding() {
  clearSave(storage);
  ending = {};
  openDialogue('ending');
}
```
바꾸기:
```js
// 엔딩: 저장을 지우고, 둘이 지평선(-z) 쪽으로 천천히 걷는 동안 회상 대사를 띄운다.
function startEnding() {
  clearSave(storage);
  ending = { aion: world.actors.find(a => a.def.m === 'mage') };
  player.teleport(player.state.x, player.state.z, Math.PI);
  player.state.auto = true;
  ending.aion?.anim.play('Walking_A');
  openDialogue('ending');
}

function followAion() {
  if (!ending.aion) return;
  ending.aion.obj.position.set(player.state.x + 1.6, 0, player.state.z + 0.6);
  ending.aion.obj.rotation.y = Math.PI;
}
```

- [ ] **Step 2: 게임 루프에서 아이온이 따라오게 하기**

찾기:
```js
  if (mode === 'combat') stepFight(dt);
  renderer.render(scene, camera);
```
바꾸기:
```js
  if (mode === 'combat') stepFight(dt);
  if (ending) followAion();
  renderer.render(scene, camera);
```

- [ ] **Step 3: README 쓰기** — `README.md`

```markdown
# Journey of Achos — 아코스의 여정

역병이 도는 왕국의 기사 아코스가 병을 고칠 방법을 찾아 떠났다가, 시간을 멈추는 마술사 아이온을 만나는
30분 분량의 3D 웹 RPG입니다. 「어둠의 회랑」의 세계관을 빌린 독립작입니다.

## 실행

빌드가 없습니다. 저장소 루트에서 정적 서버를 띄우고 브라우저로 엽니다.

    npm run serve        # = python -m http.server 8000
    # http://localhost:8000

최신 Chrome·Edge를 권장합니다. 인터넷 연결이 필요합니다(Three.js·글꼴을 CDN에서 받습니다).

## 조작

| 키 | 동작 |
|---|---|
| WASD / 방향키 | 걷기 |
| Shift | 달리기 |
| 마우스 끌기 | 시야 돌리기 |
| E | 말 걸기·살펴보기 |
| 클릭 / Space / E / Enter | 대사 넘기기 |
| 숫자 1–3 | 선택지 고르기 |
| 클릭 (전투) | 베기 |
| Space (전투) | 피하기 |

진행은 자동 저장됩니다(지역에 들어갈 때, 대화가 끝날 때).

## 개발

    npm test             # node --test, Node 20 이상
    npm run fetch-assets # data/models.js 목록대로 KayKit 에셋을 다시 받기

- 대사: `data/script.js` · 지역 배치와 전투: `data/regions.js` · 모델 목록: `data/models.js`
- 게임 규칙(대화·저장·전투·충돌)은 `src/story.js`, `src/combat.js`, `src/geom.js`, `src/region.js`에 있고 테스트가 있습니다.
- 설계: `docs/superpowers/specs/2026-10-08-journey-of-achos-design.md`

## 배포

GitHub 저장소 Settings → Pages → Branch: `main`, 폴더: `/ (root)`. 모든 경로가 상대 경로라 그대로 동작합니다.

## 출처

`CREDITS.md`를 보세요. 3D 에셋은 모두 KayKit(Kay Lousberg)의 CC0입니다.
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test`
Expected: PASS — 51 tests

- [ ] **Step 5: 처음부터 끝까지 두 번 플레이하며 확인** (스펙 7장 완료 기준)

1회차 — 기억 조각을 모두 모은다(병사들과 이야기, 첫날 이름을 묻기, 둘째 날 폭포·바위, 셋째 날 별·시계, 마지막 밤 "이름을 다시 묻겠소").
2회차 — 기억 조각 없이 필요한 것만 한다.
확인할 것:
- 두 번 다 엔딩까지 막힘 없이 간다. 1회차 플레이 시간을 재서 적어 둔다(목표 30분 내외).
- 엔딩에서 아코스와 아이온이 나란히 지평선 쪽으로 걸어가고 회상 대사가 나온다. 1회차는 회상 5줄, 2회차는 0줄이다. 끝 화면에 `5 / 5`, `0 / 5`가 뜬다.
- 지역 3에서 이름을 모르는 채 왔다면 아이온이 다리에서 이름을 알려 주고, 그 줄부터 화자가 `아이온`으로 바뀐다.
- 중간중간 새로고침해도 "이어하기"로 이어진다. 엔딩을 본 뒤에는 "이어하기"가 없다.
- 전 구간에서 fps가 30 이상(목표 60)이다.
- 콘솔 오류가 없다.

- [ ] **Step 6: 커밋**

```bash
git add src/main.js README.md
git commit -m "feat: 함께 걷는 엔딩 연출과 README" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
