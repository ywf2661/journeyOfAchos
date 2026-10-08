// DOM 오버레이(임시). Task 8에서 대화창·타이틀 등이 더해진다.
const $ = id => document.getElementById(id);

export function fade(on) {
  $('fade').classList.toggle('on', on);
  return new Promise(r => setTimeout(r, 650));
}

export function showError(msg) {
  const el = $('error');
  el.textContent = `문제가 생겼습니다.\n\n${msg}\n\n새로고침해서 다시 시도해 주세요.`;
  el.hidden = false;
}
