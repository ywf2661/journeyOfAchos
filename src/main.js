// 진입점: 게임 루프와 모드 전환(타이틀 → 탐험 ⇄ 대화 ⇄ 전투 → 엔딩).
import { SCRIPT, MEMORIES } from '../data/script.js';
import { REGIONS, FIGHTS } from '../data/regions.js';
import { TILES, STAMPS } from '../data/tiles.js';
import { SPRITES } from '../data/sprites.js';
import { createState, createDialogue, applyEffect, winFight, markDone, speakerName, saveGame, loadGame, clearSave } from './story.js';
import { triggersFor, actorsFor, blockedFor, lightFor, matches } from './region.js';
import { parseMap, isSolid } from './map.js';
import { dist } from './geom.js';
import { createWalker, step, dash, front, OPPOSITE } from './player.js';
import { frameOf, SLASH_TIME } from './anim.js';
import { createFight, update as updateFight, swing, dodge, holySlash, PLAYER_MAX_HP, HOLY_CHARGE, HOLY_GAUGE } from './combat.js';
import { createInput } from './input.js';
import { createTouchControls } from './touch.js';
import { loadSheets, createRenderer } from './draw.js';
import * as ui from './ui.js';

// 주로 터치로 조작하는 기기(휴대폰·태블릿). 부팅 때 한 번 정한다.
const TOUCH = matchMedia('(pointer: coarse)').matches;
document.body.classList.toggle('touch', TOUCH);
// localStorage 접근 자체가 막혀 있으면 null. story.js의 저장 함수들은 null도 받아 준다.
const storage = (() => { try { return localStorage; } catch { return null; } })();
const MAPS = Object.fromEntries(Object.entries(REGIONS).map(([k, r]) => [k, parseMap(r.map, r.bounds, TILES, STAMPS)]));
const input = createInput({ onPress, onRelease });
const WAVE_TIME = 0.3;   // 성휘참 빛 칼날이 4칸을 날아가는 시간(초)

let renderer, state, hero, blocked;
let mode = 'title';   // title | loading | explore | dialogue | combat | end | error
let dialogue = null, view = null, ending = false;
let fight = null, looks = [], heroSlash = 0, hurt = 0, tickAcc = 0, time = 0;   // heroSlash: 베기 동작이 끝날 때까지 남은 시간
let charge = null, waves = [], flash = 0;   // charge: 전투 중 Z를 누르고 있는 시간(안 누르면 null)
// 지역·날짜를 바꾸는 동안 그리기를 멈춘다. 상태는 이미 다음 날로 바뀌었지만, 화면이 다 어두워질 때까지 지난 장면을 그대로 둔다.
let transitioning = false;

const region = () => REGIONS[state.region];
const map = () => MAPS[state.region];
// 플래그가 바뀌면(성문이 열림, 인물이 나타남) 다시 만든다
const refreshBlocked = () => { blocked = blockedFor(region(), map(), state); };

function fail(e) {
  console.error(e);
  mode = 'error';
  ui.showError(e.message);
}

async function enterRegion() {
  mode = 'loading';
  transitioning = true;
  ui.showPrompt(null);
  await ui.fade(true);
  const s = region().start;
  hero = createWalker(s.x, s.z, s.dir);
  refreshBlocked();
  transitioning = false;
  saveGame(storage, state);
  await ui.fade(false);
  if (state.pendingFight) startFight(state.pendingFight);
  else mode = 'explore';
}

// 바라보는 앞 칸에서 1.5칸 안에 있는, 말을 걸 수 있는 트리거(가장 가까운 것)
function facingTrigger() {
  const f = front(hero);
  let best = null, bestD = 1.5;
  for (const t of triggersFor(region(), state)) {
    const d = dist(f, t);
    if (!t.auto && d <= bestD) { best = t; bestD = d; }
  }
  return best;
}

function checkTriggers() {
  const auto = triggersFor(region(), state).find(t => t.auto && dist(hero, t) <= t.r);
  if (auto) return openDialogue(auto.node, auto);
  const t = facingTrigger();
  ui.showPrompt(t ? `${t.label}${t.ends ? ' (되돌릴 수 없음)' : ''}` : null);
}

function openDialogue(nodeId, trigger) {
  if (trigger) markDone(state, trigger);
  mode = 'dialogue';
  input.clear();
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

// Z: 글자가 덜 나왔으면 마저 보이고, 선택지면 고른 것을, 아니면 다음 대사
function confirm() {
  if (ui.completeTyping()) return;
  show(view?.choices ? dialogue.choose(ui.selectedChoice()) : dialogue.next());
}

// X·대화창 클릭: 대사만 넘긴다(선택지는 고르지 않는다)
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
  refreshBlocked();
  for (const c of cmds) {
    if (c.type === 'reload') await enterRegion();
    if (c.type === 'combat') startFight(c.id);
  }
}

function startFight(id) {
  const def = FIGHTS[id];
  fight = createFight(def);
  if (def.player) hero = createWalker(...def.player);
  looks = fight.enemies.map(() => ({ red: 0, white: 0, gone: 0 }));
  ui.setFrozenLook(!!def.frozen);
  tickAcc = 0;
  mode = 'combat';
}

function stepFight(dt) {
  for (const ev of updateFight(fight, dt, hero)) {
    const [kind, i] = ev.split(':');
    if (kind === 'windup') looks[i].red = 0.5;
    if (kind === 'hurt') hurt = 0.4;
    if (kind === 'lost') return loseFight();
  }
  if (fight.def.frozen && (tickAcc += dt) >= 1) { tickAcc -= 1; ui.tick(); }
  ui.showHud(fight.hp, PLAYER_MAX_HP, fight.def.frozen ? fight.def.timeLimit - fight.time : null, fight.gauge, HOLY_GAUGE);
}

function attack() {
  const events = swing(fight, hero);
  if (!events.length) return;
  heroSlash = SLASH_TIME;
  showHits(events);
}

// 성휘참: Z를 HOLY_CHARGE초 넘게 누르고 있다 떼면, 게이지가 가득할 때 빛의 초승달 칼날이 앞으로 뻗어 나간다
function holyAction() {
  const events = holySlash(fight, hero);
  if (!events.length) return;
  heroSlash = SLASH_TIME;
  flash = 0.12;
  waves.push({ x: hero.x, z: hero.z, facing: hero.facing, t: 0 });
  showHits(events);
}

function showHits(events) {
  for (const ev of events) {
    const [kind, i] = ev.split(':');
    if (kind === 'hit' || kind === 'down') looks[i].white = 0.15;
    if (kind === 'won') winCurrentFight();
  }
}

// 피하기: 무적(combat.dodge)과 함께 누르고 있는 방향(없으면 뒤로) 한 칸
function dodgeAction() {
  if (dodge(fight)) dash(hero, input.state().dir ?? OPPOSITE[hero.dir], blocked);
}

function clearFight() {
  ui.setFrozenLook(false);
  ui.hideHud();
  fight = null;
  looks = [];
  charge = null;
}

// 이기거나 지면 잠깐 그대로 보여 준 뒤(쓰러진 적이 깜빡이며 사라진다) 정리한다
function winCurrentFight() {
  mode = 'loading';
  setTimeout(() => {
    clearFight();
    openDialogue(winFight(state, FIGHTS));
  }, 1200);
}

function loseFight() {
  mode = 'loading';
  const id = state.pendingFight;
  ui.toast(fight.def.frozen ? '멈춘 시간이 다시 흐른다… 처음부터.' : '쓰러졌다… 다시 일어선다.');
  setTimeout(() => {
    clearFight();
    startFight(id);
  }, 1800);
}

// 엔딩: 둘이 지평선(북쪽)으로 천천히 걷는 동안 회상 대사를 띄운다.
// 저장은 끝 화면에서 지운다 — 회상 도중 새로고침하면 다리에서 엔딩을 다시 볼 수 있다.
function startEnding() {
  ending = true;
  hero = createWalker(Math.round(hero.x), Math.round(hero.z), 'up');
  openDialogue('ending');
}

async function finish() {
  mode = 'end';
  clearSave(storage);
  await ui.fade(true);
  await ui.showEnd(state.memories.length, Object.keys(MEMORIES).length);
  location.reload();
}

// 버튼을 누르는 순간: 모드에 따라 Z·X·방향의 뜻이 다르다
function onPress(b) {
  if (mode === 'dialogue') {
    if (b === 'z') confirm();
    else if (b === 'x') advance();
    else if (b === 'up' || b === 'down') ui.moveChoice(b === 'up' ? -1 : 1);
  } else if (mode === 'explore' && b === 'z') {
    const t = facingTrigger();
    if (t) openDialogue(t.node, t);
  } else if (mode === 'combat') {
    if (b === 'z') { attack(); charge = 0; }
    if (b === 'x') dodgeAction();
  }
}

// 버튼을 떼는 순간: 전투 중 Z를 충분히 모았으면 성휘참
function onRelease(b) {
  if (b !== 'z') return;
  if (mode === 'combat' && charge !== null && charge >= HOLY_CHARGE) holyAction();
  charge = null;
}

// 숫자 1~9로 선택지를 바로 고른다
addEventListener('keydown', e => {
  const n = Number(e.code.match(/^Digit([1-9])$/)?.[1]);
  if (mode === 'dialogue' && n && !e.repeat && view?.choices && !ui.completeTyping() && n <= view.choices.length) {
    show(dialogue.choose(n - 1));
  }
});
ui.onDialogClick(() => { if (mode === 'dialogue') advance(); });
ui.onPromptClick(() => onPress('z'));
if (TOUCH) createTouchControls({ onStick: a => input.setStick(a), onButton: (b, down) => input.button(b, down) });

function render(dt) {
  heroSlash = Math.max(0, heroSlash - dt);
  hurt = Math.max(0, hurt - dt);
  flash = Math.max(0, flash - dt);
  waves = waves.filter(w => (w.t += dt) < WAVE_TIME);
  // 성휘참을 쓸 수 있게 모였으면 금빛으로 깜빡인다
  const ready = charge !== null && charge >= HOLY_CHARGE && fight?.gauge >= HOLY_GAUGE;
  const bob = moving => moving && Math.floor(time * 8) % 2 === 1;
  // 큰 스프라이트(아코스·아이온)는 자세에 맞는 프레임을, 작은 인물은 Kenney 칸 하나를 그린다
  const look = (sp, pose) => {
    if (!sp.sheet) return { art: sp.art };
    const f = frameOf(sp, pose);
    return { art: [sp.sheet, f.index], foot: sp.foot, flip: f.flip };
  };
  const things = actorsFor(region(), state).map(a => {
    const follow = ending && a.m === 'aion';   // 엔딩: 아이온이 아코스 오른쪽에서 함께(뒷모습으로) 걷는다
    const sp = SPRITES[a.m];
    return {
      ...look(sp, { dir: follow ? 'up' : 'down' }), tint: a.tint ?? sp.tint,
      x: follow ? hero.x + 1 : a.x, z: follow ? hero.z : a.z, lie: a.lie, bob: follow && bob(hero.moving),
    };
  });
  things.push({
    ...look(SPRITES.achos, { dir: hero.dir, moving: hero.moving, slash: heroSlash, t: time }),
    x: hero.x, z: hero.z, alpha: fight?.invuln > 0 ? 0.5 : 1,
    tint: hurt > 0 ? '#c0392b' : ready && Math.floor(time * 12) % 2 ? '#ffd76a' : undefined,
  });
  fight?.enemies.forEach((e, i) => {
    const l = looks[i], p = SPRITES.plague;
    l.red = Math.max(0, l.red - dt);
    l.white = Math.max(0, l.white - dt);
    if (e.hp <= 0) l.gone += dt;
    if (l.gone > 0.6) return;
    things.push({
      art: p.art, x: e.x, z: e.z, flip: e.x > hero.x,
      tint: l.white > 0 ? '#ffffff' : l.red > 0 ? '#c0392b' : p.tint,
      alpha: e.hp <= 0 && Math.floor(l.gone * 10) % 2 ? 0.2 : 1,
    });
  });
  renderer.draw({
    map: map(), cam: hero, things, t: time, flash,
    waves: waves.map(w => ({ x: w.x, z: w.z, facing: w.facing, p: w.t / WAVE_TIME })),
    blockers: (region().blockers ?? []).filter(b => b.art && matches(b, state)),
    marks: mode === 'explore' && facingTrigger() ? [{ x: hero.x, z: hero.z }] : [],
    light: lightFor(region(), state),
  });
}

let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  time += dt;
  document.body.dataset.mode = mode;   // 터치 조작이 보일지는 CSS(body.touch[data-mode])가 정한다
  if (hero && ending) {
    // 엔딩 자동 걷기는 인물을 무시하고, 맵의 막힌 칸(지평선의 성)에서 선다
    step(hero, { dir: 'up', auto: true }, dt, (x, z) => isSolid(map(), x, z));
  } else if (hero && (mode === 'explore' || mode === 'combat')) {
    if (charge !== null) charge += dt;
    step(hero, { ...input.state(), slow: mode === 'combat' && charge !== null }, dt, blocked);   // 모으는 동안은 반 속도
  }
  if (mode === 'explore') checkTriggers();
  if (mode === 'combat') stepFight(dt);
  if (hero && !transitioning) render(dt);
  requestAnimationFrame(frame);
}

async function boot() {
  renderer = createRenderer(document.getElementById('game'), await loadSheets());
  const saved = loadGame(storage);
  state = (await ui.showTitle(!!saved)) === 'continue' ? saved : createState();
  if (state.pendingFight && !FIGHTS[state.pendingFight]) state.pendingFight = null;
  // 대본의 조작 안내가 이 플래그로 갈린다. 저장에 남아 있어도 이번 기기에 맞춰 다시 정한다.
  state.flags = state.flags.filter(f => f !== 'touch');
  if (TOUCH) state.flags.push('touch');
  await enterRegion();
}
requestAnimationFrame(frame);
boot().catch(fail);
