// Canvas 2D 도트 그리기: 타일, 인물, 효과, 카메라, 조명. 게임 규칙은 모른다(main.js가 scene을 만들어 넘긴다).
import { SHEETS } from '../data/tiles.js';

const T = 16, VIEW = 12;   // 타일 크기(px), 화면 짧은 쪽에 보이는 칸 수
// 지역 분위기: 화면 전체에 덧씌우는 색과 진하기
const LIGHT = { night: ['#0a1030', 0.55], dusk: ['#4a2040', 0.3], day: null, dawn: ['#ff9a60', 0.15] };

export function loadSheets() {
  const out = {};
  return Promise.all(Object.entries(SHEETS).map(([k, s]) => new Promise((ok, bad) => {
    const img = new Image();
    img.onload = () => ok(out[k] = img);
    img.onerror = () => bad(new Error(`그림을 불러오지 못했습니다: ${s.url}`));
    img.src = s.url;
  }))).then(() => out);
}

export function createRenderer(canvas, sheets) {
  const ctx = canvas.getContext('2d');
  const shade = document.createElement('canvas'), sctx = shade.getContext('2d');
  const tinted = new Map();
  let W = 0, H = 0;

  // 정수 배율로 키운다: 짧은 쪽에 VIEW칸이 들어가는 가장 큰 배율. 남는 쪽은 조금 더 보인다.
  function resize() {
    const scale = Math.max(1, Math.floor(Math.min(innerWidth, innerHeight) / (VIEW * T)));
    W = Math.ceil(innerWidth / scale);
    H = Math.ceil(innerHeight / scale);
    canvas.width = shade.width = W;
    canvas.height = shade.height = H;
    canvas.style.width = `${W * scale}px`;
    canvas.style.height = `${H * scale}px`;
    ctx.imageSmoothingEnabled = false;
  }
  addEventListener('resize', resize);
  resize();

  const src = ([sheet, i]) => [sheets[sheet], (i % SHEETS[sheet].cols) * T, Math.floor(i / SHEETS[sheet].cols) * T];

  // 색을 덧칠한 스프라이트(왕의 금빛, 역병의 검정, 맞을 때의 흰빛)는 한 번 만들어 둔다
  function sprite(art, tint) {
    if (!tint) return src(art);
    const key = `${art}:${tint}`;
    if (!tinted.has(key)) {
      const c = document.createElement('canvas');
      c.width = c.height = T;
      const g = c.getContext('2d');
      const [img, sx, sy] = src(art);
      g.drawImage(img, sx, sy, T, T, 0, 0, T, T);
      g.globalCompositeOperation = 'source-atop';
      g.globalAlpha = 0.65;
      g.fillStyle = tint;
      g.fillRect(0, 0, T, T);
      tinted.set(key, [c, 0, 0]);
    }
    return tinted.get(key);
  }

  function tile(art, dx, dy) {
    const [img, sx, sy] = src(art);
    ctx.drawImage(img, sx, sy, T, T, dx, dy, T, T);
  }

  function draw(s) {
    const { map } = s;
    // 카메라: 따라갈 대상이 화면 가운데. 맵 가장자리에서는 멈추고, 맵이 화면보다 작으면 가운데에 둔다.
    const clamp = (v, hi) => (hi < 0 ? hi / 2 : Math.min(hi, Math.max(0, v)));
    const left = Math.round(clamp((s.cam.x - map.minX + 0.5) * T - W / 2, map.w * T - W));
    const top = Math.round(clamp((s.cam.z - map.minZ + 0.5) * T - H / 2, map.h * T - H));
    const px = x => Math.round((x - map.minX) * T - left), py = z => Math.round((z - map.minZ) * T - top);

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    const c0 = Math.max(0, Math.floor(left / T)), c1 = Math.min(map.w - 1, Math.floor((left + W) / T));
    const r0 = Math.max(0, Math.floor(top / T)), r1 = Math.min(map.h - 1, Math.floor((top + H) / T));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const cell = map.cells[r * map.w + c];
        tile(cell.ground, c * T - left, r * T - top);
        if (cell.top) tile(cell.top, c * T - left, r * T - top);
      }
    }
    for (const b of s.blockers) tile(b.art, px(b.x), py(b.z));
    // 모닥불: 깜빡이는 불씨 몇 개와 장작
    for (const f of map.lights) {
      if (!f.fire) continue;
      const x = px(f.x), y = py(f.z);
      ctx.fillStyle = '#6b4a2b';
      ctx.fillRect(x + 3, y + 12, 10, 2);
      for (let k = 0; k < 6; k++) {
        ctx.fillStyle = k % 2 ? '#ffd166' : '#ff7a2e';
        const up = Math.sin(s.t * 13 + k * 2.1) > 0 ? 1 : 0;
        ctx.fillRect(x + 5 + (k % 3) * 2, y + 5 + Math.floor(k / 3) * 3 - up, 2, 3);
      }
    }
    // 인물·적: 아래(남쪽)에 있는 것을 나중에 그려 앞에 보이게 한다
    for (const o of [...s.things].sort((a, b) => a.z - b.z)) {
      const [img, sx, sy] = sprite(o.art, o.tint);
      ctx.save();
      ctx.globalAlpha = o.alpha ?? 1;
      ctx.translate(px(o.x) + T / 2, py(o.z) + T / 2 - (o.bob ? 1 : 0));
      if (o.lie) ctx.rotate(-Math.PI / 2);
      if (o.flip) ctx.scale(-1, 1);
      ctx.drawImage(img, sx, sy, T, T, -T / 2, -T / 2, T, T);
      ctx.restore();
    }
    // 베기: 바라보는 쪽의 흰 반달. 방향각 θ의 앞(sin θ, cos θ)은 화면 각도 π/2 − θ다.
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    for (const sl of s.slashes) {
      const a = Math.PI / 2 - sl.facing;
      ctx.beginPath();
      ctx.arc(px(sl.x) + T / 2, py(sl.z) + T / 2, 14, a - 1, a + 1);
      ctx.stroke();
    }
    // 조명: 분위기 색을 덧씌우고, 밤에는 불빛 둘레를 둥글게 비워 밝게 남긴다
    const L = LIGHT[s.light];
    if (L) {
      sctx.globalCompositeOperation = 'source-over';
      sctx.clearRect(0, 0, W, H);
      sctx.globalAlpha = L[1];
      sctx.fillStyle = L[0];
      sctx.fillRect(0, 0, W, H);
      sctx.globalAlpha = 1;
      if (s.light === 'night') {
        sctx.globalCompositeOperation = 'destination-out';
        for (const f of map.lights) {
          const x = px(f.x) + T / 2, y = py(f.z) + T / 2, g = sctx.createRadialGradient(x, y, 4, x, y, 48);
          g.addColorStop(0, 'rgba(0,0,0,0.9)');
          g.addColorStop(1, 'rgba(0,0,0,0)');
          sctx.fillStyle = g;
          sctx.fillRect(x - 48, y - 48, 96, 96);
        }
      }
      ctx.drawImage(shade, 0, 0);
    }
    // 말 걸 수 있을 때 머리 위의 작은 Z
    for (const m of s.marks) {
      const x = px(m.x) + 4, y = py(m.z) - 10;
      ctx.fillStyle = '#e8e0d0';
      ctx.fillRect(x, y, 9, 9);
      ctx.fillStyle = '#1a1410';
      ctx.font = '8px monospace';
      ctx.fillText('Z', x + 2, y + 8);
    }
  }

  return { draw };
}
