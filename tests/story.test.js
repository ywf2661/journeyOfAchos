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
