// Canvas 2D 도트 그리기: 타일, 인물, 효과, 카메라, 조명. 게임 규칙은 모른다(main.js가 scene을 만들어 넘긴다).
import { SHEETS } from '../data/tiles.js';

const T = 16, VIEW = 12;   // 타일 크기(px), 화면 짧은 쪽에 보이는 칸 수
// 지역 분위기: 화면 전체에 덧씌우는 색과 진하기
const LIGHT = { night: ['#0a1030', 0.55], dusk: ['#4a2040', 0.3], day: null, dawn: ['#ff9a60', 0.15] };

// 그릴 크기(게임 화소 W×H)와 화면에 보일 CSS 크기. 게임 화소 하나를 기기 화소 k개(정수)로 키워 도트가 고르게 보인다.
// k는 짧은 쪽에 VIEW칸 가까이 들어가게 반올림한다(휴대폰 360px 폭 × 3배 화면이면 6 → 11.25칸).
export function viewSize(cssW, cssH, dpr = 1) {
  const k = Math.max(1, Math.round((Math.min(cssW, cssH) * dpr) / (VIEW * T)));
  const W = Math.ceil((cssW * dpr) / k), H = Math.ceil((cssH * dpr) / k);
  return { W, H, cssW: (W * k) / dpr, cssH: (H * k) / dpr };
}

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

  function resize() {
    const v = viewSize(innerWidth, innerHeight, devicePixelRatio || 1);
    W = v.W;
    H = v.H;
    canvas.width = shade.width = W;
    canvas.height = shade.height = H;
    canvas.style.width = `${v.cssW}px`;
    canvas.style.height = `${v.cssH}px`;
    ctx.imageSmoothingEnabled = false;
  }
  addEventListener('resize', resize);
  resize();

  // 시트의 칸 하나: [그림, x, y, 너비, 높이]. 칸 크기는 시트의 cell(없으면 16×16)
  const src = ([sheet, i]) => {
    const { cols, cell: [cw, ch] = [T, T] } = SHEETS[sheet];
    return [sheets[sheet], (i % cols) * cw, Math.floor(i / cols) * ch, cw, ch];
  };

  // 색을 덧칠한 스프라이트(왕의 금빛, 역병의 검정, 맞을 때의 흰빛)는 한 번 만들어 둔다
  function sprite(art, tint, strength = 0.65) {
    if (!tint) return src(art);
    const key = `${art}:${tint}:${strength}`;
    if (!tinted.has(key)) {
      const [img, sx, sy, w, h] = src(art);
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const g = c.getContext('2d');
      g.drawImage(img, sx, sy, w, h, 0, 0, w, h);
      g.globalCompositeOperation = 'source-atop';
      g.globalAlpha = strength;
      g.fillStyle = tint;
      g.fillRect(0, 0, w, h);
      tinted.set(key, [c, 0, 0, w, h]);
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
    const [sx0, sz0] = s.shake ?? [0, 0];   // 맞을 때 화면 흔들림(게임 화소)
    const left = Math.round(clamp((s.cam.x - map.minX + 0.5) * T - W / 2, map.w * T - W)) + sx0;
    const top = Math.round(clamp((s.cam.z - map.minZ + 0.5) * T - H / 2, map.h * T - H)) + sz0;
    const px = x => Math.round((x - map.minX) * T - left), py = z => Math.round((z - map.minZ) * T - top);

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    const c0 = Math.max(0, Math.floor(left / T)), c1 = Math.min(map.w - 1, Math.floor((left + W) / T));
    const r0 = Math.max(0, Math.floor(top / T)), r1 = Math.min(map.h - 1, Math.floor((top + H) / T));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const cell = map.cells[r * map.w + c];
        tile(cell.ground, c * T - left, r * T - top);
        // 물: 칸마다 정해진 자리에서 반짝임이 천천히 옮겨 다닌다
        if (cell.water && (c * 7 + r * 13 + Math.floor(s.t * 1.5)) % 11 === 0) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
          ctx.fillRect(c * T - left + 3 + (r * 5) % 9, r * T - top + 4 + (c * 3) % 8, 3, 1);
        }
        if (cell.shade) { ctx.fillStyle = 'rgba(20, 40, 20, 0.22)'; ctx.fillRect(c * T - left, r * T - top, T, 3); }   // 키 큰 것 아래 그림자
        if (cell.top) tile(cell.top, c * T - left, r * T - top);
      }
    }
    for (const b of s.blockers) tile(b.art, px(b.x), py(b.z));
    for (const h of s.herbs ?? []) tile(['farm', 80], px(h.x), py(h.z));   // 약초
    // 퍼즐 장치: 구덩이·발판·순서 돌·물살·낙엽·시계 돌·다시 놓기 돌·미는 돌(돌이 맨 위)
    const pz = s.puzzle;
    if (pz) {
      for (const pt of pz.pits) {
        const x = px(pt.x), y = py(pt.z);
        if (pt.filled) tile(['farm', 77], x, y);
        else {
          ctx.fillStyle = '#1b130f';
          ctx.fillRect(x + 1, y + 1, T - 2, T - 2);
          ctx.fillStyle = '#3b2a1f';
          ctx.fillRect(x + 1, y + 1, T - 2, 2);
        }
      }
      for (const pl of pz.plates) tile(['dungeon', pl.on ? 44 : 43], px(pl.x), py(pl.z));
      for (const st of pz.steps) {
        tile(['town', 43], px(st.x), py(st.z));
        if (st.lit) {
          ctx.fillStyle = 'rgba(255, 220, 120, 0.55)';
          ctx.fillRect(px(st.x) + 2, py(st.z) + 2, T - 4, T - 4);
        }
      }
      if (pz.flowing) {   // 시간이 흐르는 동안 개울 칸에 물살 줄이 지나간다
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        for (const c of pz.stream) ctx.fillRect(px(c.x) + Math.floor((s.t * 24) % T), py(c.z) + 7, 4, 1);
      }
      for (const r of pz.rafts) {   // 큰 낙엽: 주황 잎과 잎맥
        const cx = px(r.x) + T / 2, cy = py(r.z) + T / 2;
        ctx.fillStyle = '#d9782f';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 7, 5, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#8a4517';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - 5, cy + 2);
        ctx.lineTo(cx + 5, cy - 2);
        ctx.stroke();
      }
      if (pz.clock) {   // 시계 돌: 새긴 돌판 위에 시계 얼굴
        const x = px(pz.clock.x), y = py(pz.clock.z);
        tile(['dungeon', 65], x, y);
        ctx.strokeStyle = pz.flowing ? '#ffd76a' : '#e8e0d0';
        ctx.beginPath();
        ctx.arc(x + 8, y + 7, 3, 0, Math.PI * 2);
        ctx.moveTo(x + 8, y + 7);
        ctx.lineTo(x + 8, y + 5);
        ctx.moveTo(x + 8, y + 7);
        ctx.lineTo(x + 10, y + 7);
        ctx.stroke();
      }
      if (pz.reset) tile(['dungeon', 56], px(pz.reset.x), py(pz.reset.z));
      for (const b of pz.boulders) tile(['dungeon', 55], px(b.x), py(b.z));
    }
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
    // 인물·적: 아래(남쪽)에 있는 것을 나중에 그려 앞에 보이게 한다.
    // 그림의 발(foot, 없으면 16×16 칸의 아래 가운데)을 칸의 아래 가운데에 맞춘다 — 큰 스프라이트는 머리와 칼이 위 칸까지 올라온다.
    for (const o of [...s.things].sort((a, b) => a.z - b.z)) {
      const [img, sx, sy, w, h] = sprite(o.art, o.tint, o.tintA);
      const [fx, fy] = o.foot ?? [T / 2, T - 1];
      ctx.save();
      ctx.globalAlpha = o.alpha ?? 1;
      if (o.lie) {   // 누운 인물(작은 그림): 칸 가운데를 축으로 돌린다
        ctx.translate(px(o.x) + T / 2, py(o.z) + T / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.drawImage(img, sx, sy, w, h, -w / 2, -h / 2, w, h);
      } else {
        ctx.translate(px(o.x) + T / 2, py(o.z) + T - 1 - (o.bob ? 1 : 0));
        if (o.flip) ctx.scale(-1, 1);
        ctx.drawImage(img, sx, sy, w, h, -fx, -fy, w, h);
      }
      ctx.restore();
      // 기절: 머리 위를 도는 노란 별 셋
      if (o.stars) {
        ctx.fillStyle = '#ffe066';
        for (let k = 0; k < 3; k++) {
          const a = s.t * 6 + k * 2.1;
          ctx.fillRect(Math.round(px(o.x) + T / 2 + Math.cos(a) * 5) - 1, Math.round(py(o.z) - 1 + Math.sin(a) * 2), 2, 2);
        }
      }
    }
    // 투척꾼의 오물: 올리브색 덩어리에 어두운 테
    ctx.fillStyle = '#6b8f2a';
    ctx.strokeStyle = '#1a2410';
    ctx.lineWidth = 1;
    for (const o of s.shots ?? []) {
      ctx.beginPath();
      ctx.arc(px(o.x) + T / 2, py(o.z) + T / 2, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    // 위로 휘두를 때: 뒷모습 그림만으로는 칼이 오른쪽으로 가는 듯 보여서, 머리 위에 흰 반달을 덧그린다
    if (s.swing) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px(s.swing.x) + T / 2, py(s.swing.z) + T / 2, 18, -Math.PI / 2 - 1, -Math.PI / 2 + 1);
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
    // 저녁·밤: 화면 가장자리를 어둡게(가운데로 눈이 가게)
    if (s.light === 'night' || s.light === 'dusk') {
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.7);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, `rgba(0,0,0,${s.light === 'night' ? 0.55 : 0.35})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    // 불꽃·연기·흙먼지: 작은 네모(a: 남은 비율)
    for (const p of s.parts ?? []) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.a));
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(px(p.x) + T / 2) - 1, Math.round(py(p.z) + T / 2) - 1, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    // 성휘참: 금빛 초승달 칼날이 앞으로 4칸 뻗어 나가며 옅어진다(p: 0→1). 빛이라 어둠(조명) 위에 그린다.
    for (const w of s.waves ?? []) {
      const a = Math.PI / 2 - w.facing, reach = w.p * 4 * T;
      const cx = px(w.x) + T / 2 + Math.cos(a) * reach, cy = py(w.z) + T / 2 + Math.sin(a) * reach;
      ctx.globalAlpha = 1 - w.p * 0.7;
      for (const [width, color, span] of [[5, '#ffd76a', 1.2], [2, '#ffffff', 1.0]]) {
        ctx.lineWidth = width;
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.arc(cx, cy, 12, a - span, a + span);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    if (s.flash > 0) {
      ctx.fillStyle = `rgba(255, 250, 220, ${Math.min(0.6, s.flash * 5)})`;
      ctx.fillRect(0, 0, W, H);
    }
    // 말 걸 수 있을 때 머리 위의 작은 Z(아코스는 큰 그림이라 머리가 칸 위로 8px쯤 올라온다)
    for (const m of s.marks) {
      const x = px(m.x) + 4, y = py(m.z) - 20;
      ctx.fillStyle = '#e8e0d0';
      ctx.fillRect(x, y, 9, 9);
      ctx.fillStyle = '#1a1410';
      ctx.font = '8px monospace';
      ctx.fillText('Z', x + 2, y + 8);
    }
  }

  return { draw };
}
