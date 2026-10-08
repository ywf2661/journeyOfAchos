// 개발용 스크린샷: 헤드리스 Chrome으로 게임을 열어 찍는다. 저장소 루트에서 정적 서버(npm run serve)를 먼저 띄운다.
//   node --experimental-websocket tools/shot.mjs <출력.png> <가로>x<세로> [저장.json]
// 저장.json을 주면 그 저장으로 이어하기한다(지역·날짜·플래그를 골라 찍을 때). 세로가 더 길면 터치 기기로 흉내 낸다.
// Chrome 위치가 다르면 환경 변수 CHROME으로 준다.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [out, size, saveFile] = process.argv.slice(2);
const [w, h] = size.split('x').map(Number);
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9333', '--hide-scrollbars',
  `--user-data-dir=${mkdtempSync(join(tmpdir(), 'shot-'))}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));

try {
  let ver;
  for (let i = 0; i < 50 && !ver; i++) {
    await sleep(200);
    ver = await fetch('http://127.0.0.1:9333/json/version').then(r => r.json()).catch(() => null);
  }
  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  let id = 0;
  const wait = new Map();
  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    if (m.id && wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') console.log('오류:', m.params.exceptionDetails.exception?.description);
  });
  const send = (method, params = {}, sessionId) => new Promise(r => {
    const i = ++id;
    wait.set(i, r);
    ws.send(JSON.stringify({ id: i, method, params, sessionId }));
  });
  const { result: { targetId } } = await send('Target.createTarget', { url: 'about:blank' });
  const { result: { sessionId } } = await send('Target.attachToTarget', { targetId, flatten: true });
  const evaluate = expression => send('Runtime.evaluate', { expression }, sessionId).then(r => r.result?.result?.value);
  await send('Runtime.enable', {}, sessionId);
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: h > w }, sessionId);
  if (h > w) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, sessionId);
  await send('Page.navigate', { url: 'http://127.0.0.1:8000/' }, sessionId);
  await sleep(1500);
  if (saveFile) {
    await evaluate(`localStorage.setItem('journeyOfAchos.save', ${JSON.stringify(readFileSync(saveFile, 'utf8'))}); location.reload()`);
    await sleep(1500);
  }
  await evaluate(`document.getElementById('${saveFile ? 'btn-continue' : 'btn-new'}').click()`);
  for (let i = 0; i < 50 && !['explore', 'dialogue', 'combat'].includes(await evaluate('document.body.dataset.mode')); i++) await sleep(200);
  await sleep(800);
  const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
  console.log(out, await evaluate('document.body.dataset.mode'));
  ws.close();
} finally {
  chrome.kill();
}
