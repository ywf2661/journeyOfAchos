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
