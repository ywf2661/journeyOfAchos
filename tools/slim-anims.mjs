// 캐릭터 GLB에서 keep에 없는 애니메이션을 지우고, 그 때문에 쓰지 않게 된 데이터까지 걷어 내 GLB를 다시 쓴다.
// 저장소 루트에서 실행: npm run slim-assets  (data/models.js의 .glb를 ANIMATIONS만 남기고 덮어쓴다. 이미 줄어 있으면 결과가 같다)
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODELS, ANIMATIONS } from '../data/models.js';

const MAGIC = 0x46546c67, JSON_CHUNK = 0x4e4f534a, BIN_CHUNK = 0x004e4942;

export function readGlb(buf) {
  if (buf.length < 12 || buf.readUInt32LE(0) !== MAGIC) throw new Error('GLB 파일이 아니다');
  let json = null, bin = Buffer.alloc(0);
  for (let off = 12; off < buf.length; ) {
    const len = buf.readUInt32LE(off), type = buf.readUInt32LE(off + 4);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === JSON_CHUNK) json = JSON.parse(data.toString('utf8'));
    else if (type === BIN_CHUNK) bin = data;
    off += 8 + len;
  }
  return { json, bin };
}

function writeGlb(json, bin) {
  const pad = (b, fill) => Buffer.concat([b, Buffer.alloc((4 - (b.length % 4)) % 4, fill)]);
  const chunk = (data, type) => {
    const head = Buffer.alloc(8);
    head.writeUInt32LE(data.length, 0);
    head.writeUInt32LE(type, 4);
    return Buffer.concat([head, data]);
  };
  const body = Buffer.concat([
    chunk(pad(Buffer.from(JSON.stringify(json)), 0x20), JSON_CHUNK),
    chunk(pad(bin, 0), BIN_CHUNK),
  ]);
  const head = Buffer.alloc(12);
  head.writeUInt32LE(MAGIC, 0);
  head.writeUInt32LE(2, 4);
  head.writeUInt32LE(12 + body.length, 8);
  return Buffer.concat([head, body]);
}

export function slimGlb(glb, keep) {
  const { json, bin } = readGlb(glb);
  if (json.extensionsUsed?.length) throw new Error(`확장을 쓰는 GLB는 다루지 않는다: ${json.extensionsUsed.join(', ')}`);
  if ((json.buffers ?? []).length !== 1) throw new Error('버퍼가 하나인 GLB만 다룬다');
  if (json.accessors.some(a => a.sparse || a.bufferView === undefined)) throw new Error('sparse이거나 bufferView가 없는 accessor는 다루지 않는다');

  const animations = (json.animations ?? []).filter(a => keep.includes(a.name));

  // 남는 것(메시·스킨·남은 애니메이션)이 참조하는 accessor
  const used = new Set();
  for (const m of json.meshes ?? []) {
    for (const p of m.primitives) {
      Object.values(p.attributes).forEach(i => used.add(i));
      if (p.indices !== undefined) used.add(p.indices);
      for (const t of p.targets ?? []) Object.values(t).forEach(i => used.add(i));
    }
  }
  for (const s of json.skins ?? []) if (s.inverseBindMatrices !== undefined) used.add(s.inverseBindMatrices);
  for (const a of animations) for (const s of a.samplers) used.add(s.input).add(s.output);

  const accIndex = new Map(), accessors = [];
  json.accessors.forEach((a, i) => {
    if (!used.has(i)) return;
    accIndex.set(i, accessors.length);
    accessors.push(a);
  });

  // 남는 accessor와 이미지가 쓰는 bufferView만 4바이트 정렬로 다시 이어 붙인다
  const views = new Set(accessors.map(a => a.bufferView));
  for (const im of json.images ?? []) if (im.bufferView !== undefined) views.add(im.bufferView);
  const viewIndex = new Map(), bufferViews = [], parts = [];
  let length = 0;
  json.bufferViews.forEach((v, i) => {
    if (!views.has(i)) return;
    const gap = (4 - (length % 4)) % 4;
    parts.push(Buffer.alloc(gap));
    length += gap;
    const start = v.byteOffset ?? 0;
    parts.push(bin.subarray(start, start + v.byteLength));
    viewIndex.set(i, bufferViews.length);
    bufferViews.push({ ...v, byteOffset: length });
    length += v.byteLength;
  });

  // 번호를 새로 매긴다
  for (const a of accessors) a.bufferView = viewIndex.get(a.bufferView);
  for (const im of json.images ?? []) if (im.bufferView !== undefined) im.bufferView = viewIndex.get(im.bufferView);
  for (const m of json.meshes ?? []) {
    for (const p of m.primitives) {
      for (const k in p.attributes) p.attributes[k] = accIndex.get(p.attributes[k]);
      if (p.indices !== undefined) p.indices = accIndex.get(p.indices);
      for (const t of p.targets ?? []) for (const k in t) t[k] = accIndex.get(t[k]);
    }
  }
  for (const s of json.skins ?? []) if (s.inverseBindMatrices !== undefined) s.inverseBindMatrices = accIndex.get(s.inverseBindMatrices);
  for (const a of animations) {
    for (const s of a.samplers) {
      s.input = accIndex.get(s.input);
      s.output = accIndex.get(s.output);
    }
  }

  Object.assign(json, { accessors, bufferViews, buffers: [{ byteLength: length }] });
  if (animations.length) json.animations = animations;
  else delete json.animations;
  return writeGlb(json, Buffer.concat(parts));
}

// 직접 실행했을 때만 저장소의 캐릭터 GLB를 줄인다(테스트·fetch-assets가 import할 때는 실행하지 않는다).
const isMain = process.argv[1] && resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();
if (isMain) {
  for (const { url } of Object.values(MODELS)) {
    if (!url.endsWith('.glb')) continue;
    const before = await readFile(url);
    const after = slimGlb(before, ANIMATIONS);
    await writeFile(url, after);
    console.log(`${url}: ${(before.length / 1048576).toFixed(2)}MB → ${(after.length / 1048576).toFixed(2)}MB`);
  }
}
