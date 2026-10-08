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
  const dt = Math.min(clock.getDelta(), 0.1);
  world?.update(dt, clock.elapsedTime);
  hero?.mixer.update(dt);
  player?.update(dt, obstaclesFor(region, state), region.bounds);
  renderer.render(scene, camera);
});
boot().catch(e => { console.error(e); ui.showError(e.message); });
