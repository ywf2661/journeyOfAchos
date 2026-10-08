// 순수 게임 규칙: 상태, 대화 진행, 효과 적용, 저장. DOM·Three.js에 의존하지 않는다.

export function createState() {
  return { v: 1, region: 1, day: 1, flags: [], memories: [], pendingFight: null, ended: false };
}

export function has(state, expr) {
  if (!expr) return true;
  if (expr.startsWith('!')) return !has(state, expr.slice(1));
  return state.flags.includes(expr) || state.memories.includes(expr);
}

function addFlag(state, flag) {
  if (!state.flags.includes(flag)) state.flags.push(flag);
}

export const speakerName = (who, state) =>
  who === '@aion' ? (has(state, 'knows_name') ? '아이온' : '마술사') : who;

// 노드 형식은 스펙 5-2 참고. set·memory는 노드에 들어설 때 바로 적용하고,
// do는 모아 뒀다가 대화가 끝난 뒤 takeEffects()로 꺼낸다.
export function createDialogue(script, state) {
  let node = null;
  const effects = [];

  function go(id) {
    for (let guard = 0; id; guard++) {
      if (guard > 1000) throw new Error(`대화가 끝없이 돈다: ${id}`);
      const n = script[id];
      if (!n) throw new Error(`없는 노드: ${id}`);
      if (!has(state, n.if)) { id = n.next; continue; }
      if (n.set) addFlag(state, n.set);
      if (n.memory && !state.memories.includes(n.memory)) state.memories.push(n.memory);
      if (n.do) effects.push(n.do);
      if (n.text || n.choices) { node = n; return view(); }
      id = n.next;
    }
    node = null;
    return null;
  }

  const visible = () => node.choices.filter(c => has(state, c.if));

  function view() {
    return {
      who: node.who ?? '',
      text: node.text ?? '',
      choices: node.choices ? visible().map(c => c.text) : null,
      memory: node.memory ?? null,
    };
  }

  return {
    start: go,
    next() {
      if (!node) return null;
      if (node.choices) return view();
      return go(node.next);
    },
    choose(i) {
      if (!node) return null;
      if (!node.choices) return view();
      const c = visible()[i];
      if (!c) return view();
      if (c.set) addFlag(state, c.set);
      return go(c.next);
    },
    takeEffects: () => effects.splice(0),
  };
}

export function markDone(state, trigger) {
  addFlag(state, `done:${trigger.id}`);
}

// 대화가 끝난 뒤 do 효과를 상태에 반영하고, 화면 쪽에서 할 일을 돌려준다.
export function applyEffect(state, fx) {
  const [kind, arg] = fx.split(':');
  switch (kind) {
    case 'nextDay': state.day += 1; return { type: 'reload' };
    case 'region': state.region = Number(arg); state.day = 1; return { type: 'reload' };
    case 'combat': state.pendingFight = arg; return { type: 'combat', id: arg };
    case 'ending': state.ended = true; return { type: 'ending' };
    default: throw new Error(`모르는 효과: ${fx}`);
  }
}

export function winFight(state, fights) {
  const id = state.pendingFight;
  state.pendingFight = null;
  addFlag(state, `won:${id}`);
  return fights[id].then;
}

export const SAVE_KEY = 'journeyOfAchos.save';

export function saveGame(storage, state) {
  try { storage.setItem(SAVE_KEY, JSON.stringify(state)); return true; } catch { return false; }
}

const isStrings = a => Array.isArray(a) && a.every(x => typeof x === 'string');

function isValidSave(s) {
  return s?.v === 1 && [1, 2, 3].includes(s.region) && [1, 2, 3].includes(s.day)
    && isStrings(s.flags) && isStrings(s.memories)
    && (s.pendingFight === null || typeof s.pendingFight === 'string')
    && s.ended === false;
}

export function loadGame(storage) {
  try {
    const s = JSON.parse(storage.getItem(SAVE_KEY));
    return isValidSave(s) ? s : null;
  } catch {
    return null;
  }
}

export function clearSave(storage) {
  try { storage.removeItem(SAVE_KEY); } catch { /* 저장소가 막혀 있으면 지울 것도 없다 */ }
}
