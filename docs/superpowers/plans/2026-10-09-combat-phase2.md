# 2단계 전투 강화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 지역마다 필드 전투 하나, 적 3종(걸음꾼·투척꾼·돌진꾼), 전투 사이에 이어지는 체력과 약초.

**Architecture:** 규칙은 순수 모듈에 둔다 — 적 종류·오물·돌진은 `src/combat.js`, 필드 전투·약초 고르기는 `src/region.js`, 저장 검사는 `src/story.js`. 데이터는 `data/regions.js`(FIGHTS의 `field`, 지역의 `herbs`), `data/script.js`, `data/sprites.js`. `src/main.js`가 필드 전투 시작·체력 이어짐·약초 줍기를 잇고 `src/draw.js`가 오물·약초를 그린다.

**Tech Stack:** 바닐라 JS(ES 모듈), Canvas 2D, Node 20 `node --test`.

**Spec:** `docs/superpowers/specs/2026-10-09-combat-phase2-design.md` (바탕: `2026-10-08-2d-topdown-design.md` 9장)

## Global Constraints

- 저장 형식 `v: 1` 그대로. `hp`는 없어도 되는 값(없으면 가득).
- 수치(체력 3·2·4, 던지기 1.5초·초당 6칸·최대 8칸, 거리 3~6칸, 돌진 준비 0.7초·초당 12칸·6칸, 기절 1.5초)는 `combat.js` 맨 위 상수.
- 필드 전투는 순간이동·화면 전환 없이 그 자리에서 시작한다.
- 커밋 메시지 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **필드 전투 도중 새로고침(이어하기)** → 전투가 취소되고 적이 맵에 그대로 서 있으며, 다시 다가가면 시작한다(`pendingFight`가 필드 전투면 지역에 들어갈 때 지운다).
2. **필드 전투에서 짐** → 전투가 시작된 칸에서 체력 가득으로 다시 시작(적은 처음 자리).
3. **투척꾼이 벽·맵 끝으로 물러남, 돌진꾼이 맵 밖으로 돌진** → 막힌 칸으로는 물러나지 않고, 돌진은 막힌 칸(맵 밖 포함)에서 멈추고 기절(Task 1 테스트).
4. **예전 저장(hp 없음)·이긴 뒤 저장** → 가득으로 시작, 이긴 뒤 남은 체력이 저장되고 지역에 들어가면 가득(Task 2 테스트 + Task 4 화면).
5. **필드 전투를 피해 다음 이야기로 가기** → 막을 수 없는 길목(Task 3 맵 테스트).

---

### Task 1: 적 3종·오물·돌진·시작 체력 (`src/combat.js`)

**Files:**
- Modify: `src/combat.js`
- Test: `tests/combat.test.js`

**Interfaces:**
- Produces: `createFight(def, hp = PLAYER_MAX_HP)` — 적은 `{ x, z, kind, hp, cd, windup, dash, stun }`, 전투는 `shots: [{ x, z, dx, dz, left }]`; `update(f, dt, player, blocked = () => false)`; 상수 `THROWER_HP, CHARGER_HP, THROW_EVERY, SHOT_SPEED, SHOT_RANGE, THROWER_NEAR, THROWER_FAR, THROW_MAX, CHARGE_WINDUP, CHARGE_SPEED, CHARGE_RANGE, STUN_TIME`. 이벤트: 지금 것 + `stun:<i>`.

- [ ] **Step 1: 실패하는 테스트**

```js
test('종류별 체력(걸음꾼 3·투척꾼 2·돌진꾼 4), 시작 체력을 줄 수 있다', () => {
  const f = createFight({ enemies: [[0, 5], [1, 5, 'thrower'], [2, 5, 'charger']] }, 2);
  assert.deepEqual(f.enemies.map(e => [e.kind, e.hp]), [['walker', ENEMY_HP], ['thrower', THROWER_HP], ['charger', CHARGER_HP]]);
  assert.equal(f.hp, 2);
});

test('투척꾼: 가까우면 물러나고(막힌 칸으로는 못 감), 거리를 두고 오물을 던진다', () => {
  const f = createFight({ enemies: [[0, 2, 'thrower']] });
  update(f, 0.1, P);
  assert.ok(f.enemies[0].z > 2, '물러난다');
  const g = createFight({ enemies: [[0, 2, 'thrower']] });
  update(g, 0.1, P, (x, z) => z >= 2);
  assert.equal(g.enemies[0].z, 2, '뒤가 막혀 있으면 그대로');
  const h = createFight({ enemies: [[0, 5, 'thrower']] });
  update(h, THROW_EVERY, P);
  assert.equal(h.shots.length, 1);
  assert.equal(h.enemies[0].z, 5, '알맞은 거리에서는 서 있다');
});

test('오물: 날아와 맞으면 1피해, 피하는 중이면 지나가고, 막힌 칸이나 사거리 끝에서 사라진다', () => {
  const f = createFight({ enemies: [[0, 5, 'thrower']] });
  update(f, THROW_EVERY, P);
  let hurt = 0;
  for (let i = 0; i < 20; i++) hurt += update(f, 0.05, P).filter(e => e === 'hurt').length;
  assert.equal(hurt, 1);
  assert.equal(f.hp, PLAYER_MAX_HP - 1);
  const g = createFight({ enemies: [[0, 5, 'thrower']] });
  update(g, THROW_EVERY, P);
  for (let i = 0; i < 14; i++) update(g, 0.05, P);   // 오물이 코앞(0.8칸)까지 온다
  dodge(g);
  for (let i = 0; i < 10; i++) update(g, 0.05, P);
  assert.equal(g.hp, PLAYER_MAX_HP, '피하는 중에는 지나간다');
  const w = createFight({ enemies: [[0, 5, 'thrower']] });
  update(w, THROW_EVERY, P, (x, z) => z === 3);
  update(w, 0.3, P, (x, z) => z === 3);
  assert.equal(w.shots.length, 0, '벽에서 사라짐');
});

test('돌진꾼: 같은 줄이면 준비 뒤 돌진해 1피해, 막힌 칸에 부딪히면 기절한다', () => {
  const f = createFight({ enemies: [[0, 4, 'charger']] });
  assert.deepEqual(update(f, 0.01, P), ['windup:0']);
  update(f, CHARGE_WINDUP, P);
  const ev = [];
  for (let i = 0; i < 10; i++) ev.push(...update(f, 0.05, P));
  assert.equal(ev.filter(e => e === 'hurt').length, 1);
  const g = createFight({ enemies: [[0, 4, 'charger']] });
  update(g, 0.01, P, (x, z) => z === 2);
  update(g, CHARGE_WINDUP, P, (x, z) => z === 2);
  const ev2 = [];
  for (let i = 0; i < 5; i++) ev2.push(...update(g, 0.05, P, (x, z) => z === 2));
  assert.ok(ev2.includes('stun:0'));
  const z = g.enemies[0].z;
  update(g, STUN_TIME / 2, P, (x, z2) => z2 === 2);
  assert.equal(g.enemies[0].z, z, '기절 중에는 그대로');
});

test('돌진꾼: 줄이 안 맞으면 줄을 맞추러 움직인다(차이가 작은 축부터)', () => {
  const f = createFight({ enemies: [[3, 1.5, 'charger']] });
  update(f, 0.1, P);
  assert.ok(f.enemies[0].z < 1.5 && f.enemies[0].x === 3);
});
```

`import`에 `THROWER_HP, CHARGER_HP, THROW_EVERY, CHARGE_WINDUP, STUN_TIME`를 더한다.

- [ ] **Step 2: 실행 → FAIL** — `npm test -- tests/combat.test.js` (없는 export)

- [ ] **Step 3: 구현** — 상수, `createFight(def, hp)`(투척꾼은 `cd: THROW_EVERY`로 시작해 첫 오물에 틈을 준다), `update`가 종류별로 나눈다: 걸음꾼은 지금 코드, `thrower(e, d)`(물러나기/다가가기는 다음 칸이 막혔으면 안 움직임, 3~7칸이고 cd 0이면 던짐), `charger`(기절 → 돌진 중 → 준비 중 → 같은 줄이면 준비 시작 → 아니면 줄 맞추기: 두 축이 다 0.5 넘게 어긋나면 작은 축을 줄이고, 줄은 맞는데 멀면 긴 축으로 다가간다), 오물을 먼저 움직이고(던진 프레임에는 안 움직인다) 적이 움직인다. 오물 이동(맞으면 무적이 아닐 때만 1피해 후 사라짐, 무적이면 지나감, 막힌 칸·사거리 끝에서 사라짐).

- [ ] **Step 4: 실행 → PASS**, `npm test` 전체 PASS

- [ ] **Step 5: 커밋** `feat: 투척꾼·돌진꾼과 오물·돌진, 전투 시작 체력`

### Task 2: 저장의 체력, 필드 전투·약초 고르기 (`src/story.js`, `src/region.js`)

**Files:**
- Modify: `src/story.js`, `src/region.js`
- Test: `tests/story.test.js`, `tests/region.test.js`

**Interfaces:**
- Produces: `fieldFightsFor(fights, regionId, state) → [[id, def], ...]`(필드이고, 그 지역이고, 안 이겼고, `matches`), `herbsFor(region, state) → [{ id, x, z }]`(안 먹은 것). 저장 검사: `hp`는 없거나 1 이상 정수.

- [ ] **Step 1: 실패하는 테스트**

```js
// story.test.js
test('체력(hp)이 있는 저장도, 없는 예전 저장도 불러오고, 잘못된 체력은 깨진 저장', () => {
  const st = memStorage();
  const s = { ...createState(), hp: 3 };
  saveGame(st, s);
  assert.deepEqual(loadGame(st), s);
  for (const hp of [0, -1, 2.5, '3']) {
    st.setItem(SAVE_KEY, JSON.stringify({ ...createState(), hp }));
    assert.equal(loadGame(st), null, String(hp));
  }
});

// region.test.js
test('fieldFightsFor: 그 지역의 필드 전투 중 조건이 맞고 아직 안 이긴 것', () => {
  const fights = {
    a: { region: 1, field: { x: 0, z: 0, r: 2 } },
    b: { region: 1, field: { x: 0, z: 0, r: 2 }, if: 'ready', day: 2 },
    c: { region: 2, field: { x: 0, z: 0, r: 2 } },
    d: { region: 1, enemies: [] },
  };
  const s = createState();
  assert.deepEqual(fieldFightsFor(fights, 1, s).map(([id]) => id), ['a']);
  s.flags.push('ready', 'won:a'); s.day = 2;
  assert.deepEqual(fieldFightsFor(fights, 1, s).map(([id]) => id), ['b']);
});

test('herbsFor: 아직 먹지 않은 약초', () => {
  const r = { herbs: [{ id: 'h1', x: 0, z: 0 }, { id: 'h2', x: 1, z: 0 }] }, s = createState();
  s.flags.push('done:h1');
  assert.deepEqual(herbsFor(r, s).map(h => h.id), ['h2']);
  assert.deepEqual(herbsFor({}, s), []);
});
```

- [ ] **Step 2: 실행 → FAIL**
- [ ] **Step 3: 구현** — `isValidSave`에 `&& (s.hp === undefined || (Number.isInteger(s.hp) && s.hp >= 1))`; region.js에 두 함수.
- [ ] **Step 4: 실행 → PASS**, 전체 PASS
- [ ] **Step 5: 커밋** `feat: 저장의 체력, 필드 전투·약초 고르기`

### Task 3: 데이터 — 필드 전투 넷, 약초, 대사, 적 그림

**Files:**
- Modify: `data/regions.js`, `data/script.js`, `data/sprites.js`
- Test: `tests/maps.test.js`

**Interfaces:**
- Consumes: Task 1 종류 이름(`walker|thrower|charger`), Task 2 `fieldFightsFor`, `herbsFor`.
- Produces: `FIGHTS.road_field|forest_field|village_field|valley_field`(`field`, `then`), `REGIONS[k].herbs`, `SPRITES.thrower|charger`.

데이터:

```js
road_field: { region: 1, if: 'won:road', field: { x: 2, z: -20, r: 3 }, enemies: [[-1, -19], [5, -19], [6, -16, 'thrower']], then: 'r1_field_after' },
forest_field: { region: 4, field: { x: -3, z: 5, r: 2.5 }, enemies: [[-7, 4, 'charger'], [-7, 6, 'charger']], then: 'r4_field_after' },
village_field: { region: 5, if: 'won:village', field: { x: -8, z: -11, r: 3 }, enemies: [[-11, -11, 'thrower'], [-5, -11, 'thrower'], [-9, -9], [-7, -9]], then: 'r5_field_after' },
valley_field: { region: 2, day: 2, if: 'done:r2_d2_talk', field: { x: 0, z: -3, r: 2.5 }, enemies: [[-4, -2, 'charger'], [2, -2], [6, -2, 'thrower']], then: 'r2_field_after' },
// valley(이야기 전투): [[-5, 12, 'charger'], [0, 14, 'thrower'], [5, 12]]
```

약초: 지역 1 `(-6,-15)`, 4 `(-7,-1)`, 5 `(-11,-5)`, 2 `(-6,-2)` — `{ id: 'r1_herb', x, z }` 꼴.
대사: `r1_field_after`(나그네를 에워싸던 무리가 쓰러졌다), `r4_field_after`(검게 굳은 짐승 — 성 밖 짐승들까지), `r5_field_after`(마을을 나가는 길목이 비었다), `r2_field_after`(골짜기에도 역병이 스며들고 있다). `r1_traveler` 첫 대사: "살았소… 칼 소리에 숨어 있었는데 저놈들한테 들킬 뻔했지 뭐요. 기사 양반, 이 밤에 어딜 가시오?"
그림: `thrower: { art: ['dungeon', 108], tint: '#2c3a1a' }`, `charger: { art: ['dungeon', 124], tint: '#3a1814' }`.

- [ ] **Step 1: 실패하는 테스트(maps.test.js)**

```js
// 필드 전투는 다음 이야기로 가는 길목: 원 안을 막으면 from에서 to로 못 간다(원을 안 막으면 간다)
const FIELD_PATHS = { road_field: [[0, -12], [2, -19]], forest_field: [[0, 15], [-6, 0]], village_field: [[0, -3], [-7, -12]], valley_field: [[-6, -5], [0, 10]] };
test('필드 전투는 지역마다 하나이고, 피해 갈 수 없는 길목에 있다', () => {
  const fields = Object.entries(FIGHTS).filter(([, f]) => f.field);
  assert.deepEqual(fields.map(([, f]) => f.region).sort(), [1, 2, 4, 5]);
  for (const [id, f] of fields) {
    const [from, to] = FIELD_PATHS[id], has = cells => cells.some(c => c.x === to[0] && c.z === to[1]);
    assert.ok(has(reachable(f.region, from)), `${id}: 원래는 간다`);
    assert.ok(!has(reachable(f.region, from, (x, z) => Math.hypot(x - f.field.x, z - f.field.z) <= f.field.r)), `${id}: 피해 간다`);
  }
});

test('약초는 지역마다 하나, 걸어서 닿는 빈칸에 있다', () => {
  for (const k of [1, 2, 4, 5]) {
    const [h] = REGIONS[k].herbs ?? [];
    assert.ok(h, REGIONS[k].name);
    assert.ok(reachable(k).some(c => c.x === h.x && c.z === h.z), `${REGIONS[k].name}: ${h.id}`);
  }
});
```

`reachable(k, from = start, extra = () => false)`로 넓힌다. "시작 위치와 전투 시작 위치…", "전투 시작 칸과 적 칸…" 테스트는 `f.player`가 있는 전투만 시작 칸을 본다(필드 전투는 `field` 중심 칸이 막혀 있지 않은지 본다).

- [ ] **Step 2: 실행 → FAIL**
- [ ] **Step 3: 데이터 넣기**
- [ ] **Step 4: 실행 → PASS**, 전체 PASS(`content.test.js`가 `then` 노드를 확인한다)
- [ ] **Step 5: 커밋** `feat: 필드 전투 넷(지역마다 하나)·약초·대사, 골짜기 경보 전투에 새 적`

### Task 4: 게임 연결과 그리기 (`src/main.js`, `src/draw.js`)

**Files:**
- Modify: `src/main.js`, `src/draw.js`

- 필드 전투: `checkTriggers` 맨 앞에서 `fieldFightsFor(FIGHTS, state.region, state)` 중 `dist(hero, field) <= r`이면 `startField(id)` — `state.pendingFight = id`, `fieldStart = { ...standing(hero), dir: hero.dir }`, 알림 "무리가 달려든다!", `startFight(id)`.
- `startFight(id, full = false)`: `createFight(def, full ? PLAYER_MAX_HP : state.hp ?? PLAYER_MAX_HP)`; `def.player`면 지금처럼 옮기고, 필드 전투를 다시 시작할 때(`full`)는 `fieldStart`로 옮긴다.
- `enterRegion`: `state.hp = PLAYER_MAX_HP`; `pendingFight`가 필드 전투면 지운다.
- `updateFight(fight, dt, hero, blocked)`; 준비 깜빡임은 `looks[i].red = 적의 windup`.
- 이기면 `state.hp = fight.hp` 뒤 `winFight`. 지면 `startFight(id, true)`.
- 탐험 중 그리기: 안 이긴 필드 전투의 적을 제자리에 세워 그린다(종류별 그림). 전투 중 적 그림도 종류별, 기절한 돌진꾼은 반투명.
- 오물: `scene.shots`, 작은 어두운 녹색 원. 약초: `scene.herbs`, `farm 80` 타일(막힌 문 다음, 인물 아래).
- 약초 줍기: 새 칸에 들어설 때(`standing`) 그 칸의 약초가 있고 다쳤으면 ♥+1, `markDone`, 알림, 저장, 하트 갱신.
- 하트: `showLife()` — 탐험 중 다쳤으면 `ui.showHud(hp, max, null)`, 아니면 숨김. 대화가 끝날 때·약초를 먹을 때·지역에 들어갈 때.

- [ ] **Step 1:** 고치고 `node --check`, `npm test` 전체 PASS
- [ ] **Step 2: 화면 확인** — 필드 전투 전 서 있는 적(지역 4 서쪽 빈터), 돌진꾼 준비·돌진, 투척꾼 오물(지역 1 나그네), 이긴 뒤 탐험 하트와 약초 줍기. 필드 전투 도중 새로고침하면 적이 다시 서 있다.
- [ ] **Step 3: 커밋** `feat: 필드 전투를 게임에 연결(그 자리에서 시작·다시 시작), 체력 이어짐·약초·하트, 오물 그리기`

### Task 5: 문서

- [ ] README에 한 줄(필드 전투·약초·하트), 설계 상태 `구현됨(2026-10-09)`. `npm test` PASS. 커밋 `docs: 2단계 전투 안내`.
