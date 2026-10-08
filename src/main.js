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
  const dt = Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime;
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
