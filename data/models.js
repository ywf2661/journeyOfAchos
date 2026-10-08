// 모델 키 → 파일 경로와 기본 배율. 경로는 tools/fetch-assets.mjs가 받는 위치와 같다.
// 배율은 캐릭터(키 약 2.5) 기준. 헥사곤 팩은 타일 크기로 만들어져 있어 크게 키운다.
const ADV = 'assets/kaykit/adventurers/';
const SKE = 'assets/kaykit/skeletons/';
const HEX = 'assets/kaykit/hexagon/';
const HAL = 'assets/kaykit/halloween/';
const FUR = 'assets/kaykit/furniture/';

export const MODELS = {
  knight: { url: ADV + 'Knight.glb', scale: 1 },
  mage: { url: ADV + 'Mage.glb', scale: 1 },
  barbarian: { url: ADV + 'Barbarian.glb', scale: 1 },
  rogue: { url: ADV + 'Rogue.glb', scale: 1 },
  hooded: { url: ADV + 'Rogue_Hooded.glb', scale: 1 },
  minion: { url: SKE + 'Skeleton_Minion.glb', scale: 1 },
  castle: { url: HEX + 'buildings/red/building_castle_red.gltf', scale: 6 },
  barracks: { url: HEX + 'buildings/red/building_barracks_red.gltf', scale: 6 },
  church: { url: HEX + 'buildings/red/building_church_red.gltf', scale: 6 },
  tavern: { url: HEX + 'buildings/red/building_tavern_red.gltf', scale: 6 },
  home_a: { url: HEX + 'buildings/red/building_home_A_red.gltf', scale: 6 },
  home_b: { url: HEX + 'buildings/red/building_home_B_red.gltf', scale: 6 },
  well: { url: HEX + 'buildings/red/building_well_red.gltf', scale: 3 },
  tower: { url: HEX + 'buildings/blue/building_tower_B_blue.gltf', scale: 6 },
  wall: { url: HEX + 'buildings/neutral/wall_straight.gltf', scale: 6 },
  wall_gate: { url: HEX + 'buildings/neutral/wall_straight_gate.gltf', scale: 6 },
  bridge: { url: HEX + 'buildings/neutral/building_bridge_A.gltf', scale: 6 },
  mountain_a: { url: HEX + 'decoration/nature/mountain_A.gltf', scale: 12 },
  mountain_b: { url: HEX + 'decoration/nature/mountain_B.gltf', scale: 12 },
  mountain_c: { url: HEX + 'decoration/nature/mountain_C_grass_trees.gltf', scale: 12 },
  hills: { url: HEX + 'decoration/nature/hills_A_trees.gltf', scale: 8 },
  trees_a: { url: HEX + 'decoration/nature/trees_A_large.gltf', scale: 6 },
  trees_b: { url: HEX + 'decoration/nature/trees_B_medium.gltf', scale: 6 },
  tree: { url: HEX + 'decoration/nature/tree_single_A.gltf', scale: 6 },
  rock_a: { url: HEX + 'decoration/nature/rock_single_A.gltf', scale: 6 },
  rock_c: { url: HEX + 'decoration/nature/rock_single_C.gltf', scale: 8 },
  weaponrack: { url: HEX + 'decoration/props/weaponrack.gltf', scale: 9 },
  tent: { url: HEX + 'decoration/props/tent.gltf', scale: 9 },
  barrel: { url: HEX + 'decoration/props/barrel.gltf', scale: 6 },
  crate: { url: HEX + 'decoration/props/crate_A_big.gltf', scale: 6 },
  post_lantern: { url: HAL + 'post_lantern.gltf', scale: 1 },
  dead_tree: { url: HAL + 'tree_dead_large.gltf', scale: 1.5 },
  dead_tree_m: { url: HAL + 'tree_dead_medium.gltf', scale: 1.5 },
  fence: { url: HAL + 'fence.gltf', scale: 1 },
  bed: { url: FUR + 'bed_single_A.gltf', scale: 1 },
};


// 게임이 쓰는 애니메이션. tools/slim-anims.mjs가 캐릭터 GLB에서 이것만 남긴다(테스트가 코드와 맞는지 확인한다).
export const ANIMATIONS = [
  'Idle', 'Walking_A', 'Running_A', 'Dodge_Forward',
  '1H_Melee_Attack_Slice_Horizontal', '1H_Melee_Attack_Chop',
  'Hit_A', 'Death_A', 'Lie_Idle', 'Sit_Floor_Idle',
];
