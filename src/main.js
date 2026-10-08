// 진입점: 렌더러, 게임 루프, 모드 전환(타이틀 → 탐험 ⇄ 대화 ⇄ 전투 → 엔딩).
import * as THREE from 'three';
import { SCRIPT, MEMORIES } from '../data/script.js';
import { REGIONS, FIGHTS } from '../data/regions.js';
import { createState, createDialogue, applyEffect, winFight, markDone, speakerName, saveGame, loadGame, clearSave } from './story.js';
import { triggersFor, obstaclesFor } from './region.js';
import { dist } from './geom.js';
import { buildRegion, spawn, animate, plagueLook } from './world.js';
import { createFight, update as updateFight, swing, dodge, PLAYER_MAX_HP } from './combat.js';
import { createPlayer } from './player.js';
import * as ui from './ui.js';

const canvas = document.getElementById('game');
// 주로 터치로 조작하는 기기(휴대폰·태블릿). 부팅 때 한 번 정한다.
const TOUCH = matchMedia('(pointer: coarse)').matches;
document.body.classList.toggle('touch', TOUCH);
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); }
catch (e) { ui.showError('이 브라우저에서 WebGL을 쓸 수 없습니다.'); throw e; }
// 휴대폰은 화면 배율이 높아(보통 3) 그대로 그리면 무겁다. 해상도와 그림자를 낮춘다.
renderer.setPixelRatio(Math.min(devicePixelRatio, TOUCH ? 1.5 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = TOUCH ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 400);
function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.fov = innerHeight > innerWidth ? 70 : 55;   // 세로 화면은 시야를 넓혀 아코스가 화면을 덜 가리게
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// localStorage 접근 자체가 막혀 있으면 null. story.js의 저장 함수들은 null도 받아 준다.
const storage = (() => { try { return localStorage; } catch { return null; } })();
let state, world, player, hero;
let mode = 'title';   // title | loading | explore | dialogue | combat | end | error
let dialogue = null, view = null, ending = null;
let fight = null, enemies = [], dying = [], tickAcc = 0;

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
  world = await buildRegion(scene, region(), state, { shadowSize: TOUCH ? 1024 : 2048 });
  if (!player) {
    const obj = await spawn('knight');
    hero = animate(obj);
    scene.add(obj);
    player = createPlayer(obj, hero, camera, canvas);
    player.onClick = attack;
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
  ui.showPrompt(t ? `${TOUCH ? '' : '[E] '}${t.label}${t.ends ? ' (되돌릴 수 없음)' : ''}` : null);
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

// 엔딩: 둘이 지평선(-z) 쪽으로 천천히 걷는 동안 회상 대사를 띄운다.
// 저장은 끝 화면에서 지운다 — 회상 도중 새로고침하면 다리에서 엔딩을 다시 볼 수 있다.
function startEnding() {
  ending = { aion: world.actors.find(a => a.def.m === 'mage') };
  player.teleport(player.state.x, player.state.z, Math.PI);
  player.state.auto = true;
  ending.aion?.anim.play('Walking_A');
  openDialogue('ending');
}

function followAion() {
  if (!ending.aion) return;
  ending.aion.anim.play(player.state.moving ? 'Walking_A' : 'Idle');
  ending.aion.obj.position.set(player.state.x + 1.6, 0, player.state.z + 0.6);
  ending.aion.obj.rotation.y = Math.PI;
}

async function finish() {
  mode = 'end';
  clearSave(storage);
  await ui.fade(true);
  await ui.showEnd(state.memories.length, Object.keys(MEMORIES).length);
  location.reload();
}

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

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime;
  document.body.dataset.mode = mode;   // 터치 조작이 보일지는 CSS(body.touch[data-mode])가 정한다
  world?.update(dt, t);
  hero?.mixer.update(dt);
  for (const e of dying) e.anim.mixer.update(dt);
  if (player && (mode === 'explore' || mode === 'combat' || ending)) {
    player.update(dt, obstaclesFor(region(), state), region().bounds);
  }
  if (mode === 'explore') checkTriggers();
  if (mode === 'combat') stepFight(dt);
  if (ending) followAion();
  renderer.render(scene, camera);
});

async function boot() {
  const saved = loadGame(storage);
  state = (await ui.showTitle(!!saved)) === 'continue' ? saved : createState();
  if (state.pendingFight && !FIGHTS[state.pendingFight]) state.pendingFight = null;
  // 대본의 조작 안내가 이 플래그로 갈린다. 저장에 남아 있어도 이번 기기에 맞춰 다시 정한다.
  state.flags = state.flags.filter(f => f !== 'touch');
  if (TOUCH) state.flags.push('touch');
  await enterRegion();
}
boot().catch(fail);
