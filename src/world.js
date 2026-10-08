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
  night: { sky: '#0b0f1a', fog: [16, 80], hemi: ['#7686c0', '#2a2638', 2.4], sun: ['#a8b8e8', 1.1, [-20, 30, 10]], stars: true },
  dusk: { sky: '#5a3a56', fog: [22, 100], hemi: ['#f0b090', '#3a2a3a', 1.9], sun: ['#ffa060', 2.0, [-30, 22, -20]] },
  day: { sky: '#a9bccb', fog: [35, 130], hemi: ['#e6eef4', '#4a5a3a', 1.3], sun: ['#fff1d6', 2.4, [20, 40, 10]] },
  dawn: { sky: '#e3a487', fog: [30, 170], hemi: ['#ffd6b8', '#4a4050', 1.7], sun: ['#ffb070', 2.2, [25, 30, -60]] },
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
