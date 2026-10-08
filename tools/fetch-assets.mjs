// KayKit CC0 에셋을 data/models.js 목록대로 assets/ 아래에 받는다. .gltf가 참조하는 .bin·텍스처도 함께 받는다.
// 저장소 루트에서 실행: npm run fetch-assets  (이미 있는 파일은 다시 받지 않는다)
import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { posix } from 'node:path';
import { MODELS } from '../data/models.js';

const RAW = 'https://raw.githubusercontent.com/KayKit-Game-Assets/';
const PACKS = {
  'assets/kaykit/adventurers/': RAW + 'KayKit-Character-Pack-Adventures-1.0/main/addons/kaykit_character_pack_adventures/Characters/gltf/',
  'assets/kaykit/skeletons/': RAW + 'KayKit-Character-Pack-Skeletons-1.0/main/addons/kaykit_character_pack_skeletons/Characters/gltf/',
  'assets/kaykit/hexagon/': RAW + 'KayKit-Medieval-Hexagon-Pack-1.0/main/addons/kaykit_medieval_hexagon_pack/Assets/gltf/',
  'assets/kaykit/halloween/': RAW + 'KayKit-Halloween-Bits-1.0/main/addons/kaykit_halloween_bits/Assets/gltf/',
  'assets/kaykit/furniture/': RAW + 'KayKit-Furniture-Bits-1.0/main/addons/kaykit_furniture_bits/Assets/gltf/',
};

const seen = new Set();

async function fetchOne(local) {
  if (seen.has(local)) return;
  seen.add(local);
  const prefix = Object.keys(PACKS).find(p => local.startsWith(p));
  if (!prefix) throw new Error(`어느 팩인지 모르는 경로: ${local}`);
  let body;
  if (await access(local).then(() => true, () => false)) {
    body = await readFile(local);
  } else {
    const res = await fetch(PACKS[prefix] + local.slice(prefix.length));
    if (!res.ok) throw new Error(`${res.status} ${local}`);
    body = Buffer.from(await res.arrayBuffer());
    await mkdir(posix.dirname(local), { recursive: true });
    await writeFile(local, body);
    console.log('받음', local);
  }
  if (!local.endsWith('.gltf')) return;
  const json = JSON.parse(body.toString('utf8'));
  for (const { uri } of [...(json.buffers ?? []), ...(json.images ?? [])]) {
    if (uri && !uri.startsWith('data:')) await fetchOne(posix.join(posix.dirname(local), decodeURIComponent(uri)));
  }
}

for (const { url } of Object.values(MODELS)) await fetchOne(url);
console.log(`완료: 파일 ${seen.size}개`);
