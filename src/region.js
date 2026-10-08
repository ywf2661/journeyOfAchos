// 지역 데이터 해석: 지금 날짜·플래그에 맞는 배우, 트리거, 충돌체, 조명 프리셋을 고른다.
import { has } from './story.js';
import { circlesAlong } from './geom.js';

export function matches(item, state) {
  if (item.day !== undefined && ![].concat(item.day).includes(state.day)) return false;
  return has(state, item.if);
}

export const lightFor = (region, state) =>
  typeof region.light === 'string' ? region.light : region.light[state.day];

export const actorsFor = (region, state) => region.actors.filter(a => matches(a, state));

export const triggersFor = (region, state) =>
  region.triggers.filter(t => matches(t, state) && !has(state, `done:${t.id}`));

export function obstaclesFor(region, state) {
  return [
    ...region.props.filter(p => p.r).map(({ x, z, r }) => ({ x, z, r })),
    ...actorsFor(region, state).map(({ x, z }) => ({ x, z, r: 0.7 })),
    ...region.walls.flatMap(([x1, z1, x2, z2]) => circlesAlong(x1, z1, x2, z2, 1.5)),
    ...(region.blockers ?? []).filter(b => matches(b, state)).map(({ x, z, r }) => ({ x, z, r })),
  ];
}
