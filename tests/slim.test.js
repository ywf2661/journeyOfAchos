import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readGlb, slimGlb } from '../tools/slim-anims.mjs';
import { MODELS, ANIMATIONS } from '../data/models.js';

const KNIGHT = readFileSync(MODELS.knight.url);
const names = glb => (readGlb(glb).json.animations ?? []).map(a => a.name);

// bufferView·accessor가 가리키는 바이트
function view({ json, bin }, i) {
  const v = json.bufferViews[i], start = v.byteOffset ?? 0;
  return bin.subarray(start, start + v.byteLength);
}
const accessor = (g, i) => view(g, g.json.accessors[i].bufferView);

test('keep에 있는 애니메이션만 남고 파일이 작아진다', () => {
  const out = slimGlb(KNIGHT, ['Walking_A', 'Idle']);
  assert.deepEqual(names(out).sort(), ['Idle', 'Walking_A']);
  assert.ok(out.length < KNIGHT.length);
});

test('메시·스킨·텍스처 데이터는 원본과 같다', () => {
  const a = readGlb(KNIGHT), b = readGlb(slimGlb(KNIGHT, ['Idle']));
  a.json.meshes.forEach((mesh, mi) => mesh.primitives.forEach((p, pi) => {
    const q = b.json.meshes[mi].primitives[pi];
    for (const k in p.attributes) assert.ok(accessor(a, p.attributes[k]).equals(accessor(b, q.attributes[k])), `${mesh.name}.${k}`);
    if (p.indices !== undefined) assert.ok(accessor(a, p.indices).equals(accessor(b, q.indices)), `${mesh.name}.indices`);
  }));
  a.json.skins.forEach((s, i) => assert.ok(accessor(a, s.inverseBindMatrices).equals(accessor(b, b.json.skins[i].inverseBindMatrices))));
  a.json.images.forEach((im, i) => assert.ok(view(a, im.bufferView).equals(view(b, b.json.images[i].bufferView))));
});

test('남긴 애니메이션의 데이터도 원본과 같다', () => {
  const a = readGlb(KNIGHT), b = readGlb(slimGlb(KNIGHT, ['Walking_A']));
  const before = a.json.animations.find(x => x.name === 'Walking_A'), after = b.json.animations[0];
  assert.equal(after.samplers.length, before.samplers.length);
  before.samplers.forEach((s, i) => {
    assert.ok(accessor(a, s.input).equals(accessor(b, after.samplers[i].input)));
    assert.ok(accessor(a, s.output).equals(accessor(b, after.samplers[i].output)));
  });
  assert.deepEqual(after.channels, before.channels);
});

test('모든 bufferView가 버퍼 안에 4바이트 정렬로 있다', () => {
  const { json, bin } = readGlb(slimGlb(KNIGHT, ['Idle']));
  assert.ok(json.buffers[0].byteLength <= bin.length);
  for (const v of json.bufferViews) {
    assert.equal(v.byteOffset % 4, 0);
    assert.ok(v.byteOffset + v.byteLength <= json.buffers[0].byteLength);
  }
  for (const a of json.accessors) assert.ok(json.bufferViews[a.bufferView]);
});

test('두 번 줄여도 결과가 같다', () => {
  const once = slimGlb(KNIGHT, ANIMATIONS);
  assert.ok(slimGlb(once, ANIMATIONS).equals(once));
});

test('GLB가 아니면 오류를 낸다', () => {
  assert.throws(() => slimGlb(Buffer.from('not a glb file'), ['Idle']), /GLB/);
});
