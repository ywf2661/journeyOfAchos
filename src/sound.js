// 소리: 짧은 효과음(겹쳐 틀 수 있게 복제해서)과 배경음악(바뀔 때 천천히 넘긴다).
// 음원은 assets/audio — 같은 사람이 만든 dungeon-crawler 프로젝트의 것을 골라 썼다.
const SFX = {
  slash: 'slash', holy: 'caliberxfinale', hit: 'hit', hurt: 'poisonhit', stun: 'statusapply', lose: 'gameover',
  push: 'guard', step: 'magicspell', wrong: 'fail', clock: 'clock', herb: 'potion', solved: 'levelup',
};
const SFX_VOL = 0.55, MUSIC_VOL = 0.32, FADE = 0.8;   // 배경음악을 넘기는 데 걸리는 시간(초)
const cache = {};

export function sfx(name) {
  const a = (cache[name] ??= new Audio(`assets/audio/sfx/${SFX[name]}.wav`)).cloneNode();
  a.volume = SFX_VOL;
  a.play().catch(() => {});   // 아직 사용자 입력 전이면 브라우저가 막는다 — 소리만 안 난다
}

let current = null, currentName = null;
function fade(a, to, done) {
  const from = a.volume, t0 = performance.now();
  const id = setInterval(() => {
    const k = Math.min(1, (performance.now() - t0) / (FADE * 1000));
    a.volume = from + (to - from) * k;
    if (k >= 1) { clearInterval(id); done?.(); }
  }, 50);
}

// 배경음악 이름(assets/audio/bgm/<이름>.mp3). 같은 곡이면 그대로, null이면 끈다.
export function music(name) {
  if (name === currentName) return;
  currentName = name;
  if (current) { const old = current; fade(old, 0, () => old.pause()); }
  current = null;
  if (!name) return;
  const a = Object.assign(new Audio(`assets/audio/bgm/${name}.mp3`), { loop: true, volume: 0 });
  a.play().catch(() => {});
  fade(a, MUSIC_VOL);
  current = a;
}

// 자동 재생이 막혀 있었으면 첫 입력에서 다시 튼다
for (const type of ['click', 'keydown', 'touchend']) addEventListener(type, () => { if (current?.paused) current.play().catch(() => {}); });
