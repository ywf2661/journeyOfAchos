import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, has, createDialogue, speakerName, markDone, applyEffect, winFight, SAVE_KEY, saveGame, loadGame, clearSave } from '../src/story.js';

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

test('새로 넣은 지역 4·5(검은 숲길·버려진 마을)에서 한 저장도 불러온다', () => {
  const st = memStorage();
  for (const region of [4, 5]) {
    const s = { ...createState(), region };
    saveGame(st, s);
    assert.deepEqual(loadGame(st), s);
  }
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
