// DOM 오버레이: 대화창, 프롬프트, 토스트, HUD, 페이드, 타이틀/엔딩 화면, 오류, 시계 소리.
const $ = id => document.getElementById(id);
let typing = null;
let sel = 0;   // 방향키로 고른 선택지
function markChoice() {
  [...$('choices').children].forEach((b, i) => b.classList.toggle('sel', i === sel));
}
export function moveChoice(d) {
  const n = $('choices').children.length;
  if (!n) return;
  sel = (sel + d + n) % n;
  markChoice();
}
export const selectedChoice = () => sel;

export function showPrompt(text) {
  $('prompt').textContent = text ?? '';
  $('prompt').hidden = !text;
}

// 대화창 얼굴 칸: 말하는 사람(대본의 who)별 스프라이트 시트와 얼굴이 있는 16×16 자리(정면 서 있기 프레임)
const FACES = { '아코스': ['assets/sprites/achos.png', 11, 7], '@aion': ['assets/sprites/aion.png', 12, 9] };
const faceImg = {};
function showFace(who) {
  const f = FACES[who], el = $('face');
  el.hidden = !f;
  if (!f) return;
  const [url, sx, sy] = f, img = (faceImg[url] ??= Object.assign(new Image(), { src: url }));
  const paint = () => { const g = el.getContext('2d'); g.clearRect(0, 0, 16, 16); g.drawImage(img, sx, sy, 16, 16, 0, 0, 16, 16); };
  if (img.complete) paint(); else img.onload = paint;
}

// 지역에 들어설 때 위쪽에 이름을 잠깐 띄운다
let bannerTimer;
export function showBanner(text) {
  const el = $('banner');
  el.textContent = text;
  el.classList.add('on');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => el.classList.remove('on'), 2400);
}

// 글자를 한 자씩 보여 주고, 다 나오면 선택지 버튼을 붙인다.
export function showLine(view, speaker, onChoose) {
  const textEl = $('text'), choicesEl = $('choices');
  $('dialog').hidden = false;
  showFace(view.who);
  $('who').textContent = speaker;
  $('who').hidden = !speaker;
  textEl.classList.toggle('narration', !speaker);
  textEl.textContent = '';
  choicesEl.replaceChildren();
  if (typing) clearInterval(typing.id);
  const chars = [...view.text];
  let i = 0;
  function finish() {
    clearInterval(typing.id);
    typing = null;
    textEl.textContent = view.text;
    (view.choices ?? []).forEach((c, idx) => {
      const b = document.createElement('button');
      b.textContent = `${idx + 1}. ${c}`;
      b.onclick = e => { e.stopPropagation(); onChoose(idx); };
      choicesEl.append(b);
    });
    sel = 0;
    markChoice();
  }
  typing = { id: setInterval(() => { textEl.textContent += chars[i++] ?? ''; if (i >= chars.length) finish(); }, 28), finish };
  if (!chars.length) finish();
}

export function completeTyping() {
  if (!typing) return false;
  typing.finish();
  return true;
}

export function hideDialog() {
  if (typing) clearInterval(typing.id);
  typing = null;
  $('dialog').hidden = true;
}

export function onDialogClick(cb) {
  $('dialog').addEventListener('click', e => { if (!e.target.closest('button')) cb(); });
}

export function onPromptClick(cb) {
  $('prompt').addEventListener('click', cb);
}

let toastTimer;
export function toast(text) {
  const el = $('toast');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3200);
}

export function showHud(hp, max, timeLeft, gauge = 0, gaugeMax = 0) {
  const h = Math.max(0, hp);
  $('hud').hidden = false;
  $('hearts').textContent = '♥'.repeat(h) + '♡'.repeat(max - h);
  $('gauge').textContent = '✦'.repeat(gauge) + '✧'.repeat(gaugeMax - gauge);   // 성휘 게이지
  $('timer').textContent = timeLeft == null ? '' : `멈춘 시간 ${Math.max(0, Math.ceil(timeLeft))}초`;
}

export function hideHud() { $('hud').hidden = true; }

export function setFrozenLook(on) {
  $('game').style.filter = on ? 'grayscale(0.85) sepia(0.25) hue-rotate(220deg) brightness(0.9)' : '';
}

export function fade(on) {
  $('fade').classList.toggle('on', on);
  return new Promise(r => setTimeout(r, 650));
}

export function showTitle(canContinue) {
  $('title').hidden = false;
  $('btn-continue').hidden = !canContinue;
  (canContinue ? $('btn-continue') : $('btn-new')).focus();
  return new Promise(resolve => {
    const pick = choice => () => { $('title').hidden = true; resolve(choice); };
    $('btn-continue').onclick = pick('continue');
    $('btn-new').onclick = pick('new');
  });
}

export function showEnd(found, total) {
  $('end-memories').textContent = `모은 기억 조각 ${found} / ${total}`;
  $('end').hidden = false;
  return new Promise(resolve => { $('btn-restart').onclick = resolve; });
}

export function showError(msg) {
  const el = $('error');
  el.textContent = `문제가 생겼습니다.\n\n${msg}\n\n새로고침해서 다시 시도해 주세요.`;
  el.hidden = false;
}

let audio;
// 아이폰은 사용자 동작(탭·클릭·키) 안에서 소리 장치를 깨워야 소리가 난다. 이미 깨어 있으면 아무것도 안 한다.
function wakeAudio() {
  try {
    audio ??= new AudioContext();
    if (audio.state !== 'running') audio.resume().catch(() => {});
  } catch { /* 소리 없이 진행한다 */ }
}
for (const type of ['click', 'touchend', 'keydown']) addEventListener(type, wakeAudio);

// 시계 째깍 소리: 짧은 사각파 두 번을 합성한다. 브라우저가 소리를 막으면 조용히 넘어간다.
export function tick() {
  try {
    audio ??= new AudioContext();
    const t = audio.currentTime;
    for (const [dt, freq] of [[0, 1800], [0.09, 1400]]) {
      const osc = audio.createOscillator(), gain = audio.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.05, t + dt);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.04);
      osc.connect(gain).connect(audio.destination);
      osc.start(t + dt);
      osc.stop(t + dt + 0.05);
    }
  } catch { /* 소리 없이 진행한다 */ }
}
