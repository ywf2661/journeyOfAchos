import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { posix } from 'node:path';
import { MODELS } from '../data/models.js';

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
