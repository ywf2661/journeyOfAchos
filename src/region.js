// 지역 데이터 해석: 지금 날짜·플래그에 맞는 배우, 트리거, 충돌체, 조명 프리셋을 고른다.
import { has } from './story.js';
import { isSolid } from './map.js';

export function matches(item, state) {
  if (item.day !== undefined && ![].concat(item.day).includes(state.day)) return false;
  return has(state, item.if);
}

export const lightFor = (region, state) =>
  typeof region.light === 'string' ? region.light : region.light[state.day];

export const actorsFor = (region, state) => region.actors.filter(a => matches(a, state));

export const triggersFor = (region, state) =>
  region.triggers.filter(t => matches(t, state) && !has(state, `done:${t.id}`));

// 이 지역에서 아직 이기지 않았고 조건(if·day)이 맞는 필드 전투: [[id, def], ...]
export const fieldFightsFor = (fights, regionId, state) =>
  Object.entries(fights).filter(([id, f]) => f.field && f.region === regionId && !has(state, `won:${id}`) && matches(f, state));

// 아직 먹지 않은 약초
export const herbsFor = (region, state) => (region.herbs ?? []).filter(h => !has(state, `done:${h.id}`));

// 칸이 막혔는가: 맵(벽·나무·물·건물), 지금 보이는 인물, 조건이 맞아 닫혀 있는 칸(성문)
export function blockedFor(region, map, state) {
  const closed = [...actorsFor(region, state), ...(region.blockers ?? []).filter(b => matches(b, state))];
  const taken = new Set(closed.map(({ x, z }) => `${x},${z}`));
  return (x, z) => isSolid(map, x, z) || taken.has(`${x},${z}`);
}
