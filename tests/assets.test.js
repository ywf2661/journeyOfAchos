import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { posix } from 'node:path';
import { MODELS, ANIMATIONS } from '../data/models.js';
import { REGIONS } from '../data/regions.js';
import { readGlb } from '../tools/slim-anims.mjs';

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


// 모델 하나 때문에 받게 되는 파일들(.gltf는 참조하는 .bin·텍스처 포함)
function filesOf(key) {
  const url = MODELS[key].url, files = [url];
  if (url.endsWith('.gltf')) {
    const json = JSON.parse(readFileSync(url, 'utf8'));
    for (const { uri } of [...(json.buffers ?? []), ...(json.images ?? [])]) {
      if (uri && !uri.startsWith('data:')) files.push(posix.join(posix.dirname(url), decodeURIComponent(uri)));
    }
  }
  return files;
}

test('지역 1에 처음 들어갈 때 받는 모델이 11MB 이하다', () => {
  const r = REGIONS[1];
  const keys = new Set([...r.props, ...r.actors].map(x => x.m).concat('knight', 'minion'));
  const files = new Set([...keys].flatMap(filesOf));
  const mb = [...files].reduce((sum, f) => sum + statSync(f).size, 0) / 1048576;
  assert.ok(mb <= 11, `${mb.toFixed(1)}MB`);
});

test('캐릭터 GLB에는 게임이 쓰는 애니메이션만 들어 있다', () => {
  for (const { url } of Object.values(MODELS)) {
    if (!url.endsWith('.glb')) continue;
    const names = (readGlb(readFileSync(url)).json.animations ?? []).map(a => a.name);
    assert.ok(names.length > 0, url);
    assert.deepEqual(names.filter(n => !ANIMATIONS.includes(n)), [], url);
  }
});

// 코드의 애니메이션 이름(대문자·숫자로 시작하고 밑줄로 이어진 문자열, 또는 'Idle')을 모아 ANIMATIONS와 비교한다.
// 쓰는데 목록에 없으면 줄이다가 지워 버리고, 목록에만 있으면 쓸데없이 남는다.
test('코드가 쓰는 애니메이션과 ANIMATIONS가 정확히 같다', () => {
  const used = new Set();
  for (const f of ['src/main.js', 'src/player.js', 'src/world.js', 'data/regions.js']) {
    for (const [, name] of readFileSync(f, 'utf8').matchAll(/'((?:[0-9A-Z][A-Za-z0-9]*_)+[A-Za-z0-9]+|Idle)'/g)) used.add(name);
  }
  assert.deepEqual([...used].sort(), [...ANIMATIONS].sort());
});
