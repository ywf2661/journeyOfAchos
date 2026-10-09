"""힉스필드 참고 시트(인물이 줄·칸으로 놓인 도트풍 그림) → 게임용 스프라이트 시트. 개발용(파이썬 3 + Pillow).

1) 프레임 뽑기:  python tools/pixelize.py frames <시트.png> <머리색 red|silver> <몸 키 px> <출력 접두어>
   - 배경: 그림 가장자리에서 이어진 단색 회색(채우기)만 배경으로 본다. 인물 안의 밝은 회색(갑옷·은발)은 남는다.
   - 인물: 서로 이어진 덩어리(베기 궤적처럼 조금 떨어진 조각도 함께). 위 줄부터, 줄 안에서는 왼쪽부터 번호.
   - 축척: 시트 하나에 하나(몸 키 = 머리카락 꼭대기~발의 중앙값). 걷기 프레임마다 크기가 흔들리지 않게.
   - 칸마다 인물이 절반 넘으면 가장 많은 색, 아니면 투명. 색은 16가지로 줄인다.
   → <접두어>_<번호>.png, <접두어>.json(프레임마다 너비·높이·발 기준점)
2) 시트 모으기:  python tools/pixelize.py pack <출력.png> <접두어:번호> ...
   - 칸 40×32에 발 기준점을 (20, 31)로 맞춰 가로로 잇고(data/sprites.js의 foot), 떨어진 점을 지우고
     한 칸 구멍을 메운 뒤, Kenney 인물과 같은 색의 1px 외곽선을 두른다.

지금 그림(2026-10-09)을 만든 명령(저장소 루트에서, f/는 중간 산출물이라 끝나면 지운다) — 참고 시트(tools/sprite-refs/)는 힉스필드 나노 바나나 프로로 뽑았다:
  frames tools/sprite-refs/achos_ref.png red 20 f/ref       (서 있기 앞·옆·뒤 + 옆 베기)
  frames tools/sprite-refs/achos_walk_ref.png red 20 f/walk (걷기 3줄×3칸)
  frames tools/sprite-refs/achos_slash_ref.png red 20 f/slash (앞 들어 올리기·내려베기, 뒤 들어 올리기·베기)
  frames tools/sprite-refs/aion_ref.png silver 20 f/aion
  pack assets/sprites/achos.png f/ref:0 f/ref:1 f/ref:2 f/walk:0 f/walk:1 f/walk:2 f/walk:3 f/walk:4 f/walk:5
       f/walk:6 f/walk:7 f/walk:8 f/slash:0 f/slash:1 f/ref:1 f/ref:3 f/slash:2 f/slash:3
  pack assets/sprites/aion.png f/aion:0 f/aion:1 f/aion:2 f/aion:3
"""
import json
import sys
from collections import Counter, deque
from statistics import median

from PIL import Image

CW, CH, FOOT_X, FOOT_Y = 40, 32, 20, 31
OUTLINE = (63, 38, 49, 255)   # Kenney Tiny Dungeon 인물 외곽선 색


def frames(src, hairkind, body_px, prefix):
    im = Image.open(src).convert('RGBA')
    W, H = im.size
    px = im.load()
    bg = Counter(px[x, y][:3] for x in range(0, W, 7) for y in (2, H - 3)).most_common(1)[0][0]

    isbg = [[False] * W for _ in range(H)]
    q = deque([(x, y) for x in range(W) for y in (0, H - 1)] + [(x, y) for y in range(H) for x in (0, W - 1)])
    while q:
        x, y = q.popleft()
        if isbg[y][x] or sum(abs(a - b) for a, b in zip(px[x, y][:3], bg)) > 36:
            continue
        isbg[y][x] = True
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < W and 0 <= ny < H and not isbg[ny][nx]:
                q.append((nx, ny))
    fg = lambda x, y: not isbg[y][x]

    def is_hair(c):
        r, g, b = c[:3]
        if hairkind == 'red':
            return r > 140 and g < 90 and b < 90
        return r > 190 and g > 190 and b > 200 and abs(r - b) < 40

    # 인물 찾기: 4×4로 거칠게 줄인 전경에서 이어진 덩어리(2칸 틈까지 잇는다)
    B = 4
    cw, ch = (W + B - 1) // B, (H + B - 1) // B
    coarse = [[any(fg(x, y) for y in range(j * B, min(H, j * B + B)) for x in range(i * B, min(W, i * B + B)))
               for i in range(cw)] for j in range(ch)]
    seen = [[False] * cw for _ in range(ch)]
    figs = []
    for j in range(ch):
        for i in range(cw):
            if not coarse[j][i] or seen[j][i]:
                continue
            comp, dq = [], deque([(i, j)])
            seen[j][i] = True
            while dq:
                a, b = dq.popleft()
                comp.append((a, b))
                for da in (-2, -1, 0, 1, 2):
                    for db in (-2, -1, 0, 1, 2):
                        na, nb = a + da, b + db
                        if 0 <= na < cw and 0 <= nb < ch and coarse[nb][na] and not seen[nb][na]:
                            seen[nb][na] = True
                            dq.append((na, nb))
            x0, x1 = min(a for a, _ in comp) * B, min(W - 1, max(a for a, _ in comp) * B + B - 1)
            y0, y1 = min(b for _, b in comp) * B, min(H - 1, max(b for _, b in comp) * B + B - 1)
            if x1 - x0 < 40 or y1 - y0 < 60:
                continue
            hair = [(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1) if fg(x, y) and is_hair(px[x, y])]
            top = min(y for _, y in hair) if hair else y0
            hx = sorted(x for x, _ in hair)[len(hair) // 2] if hair else (x0 + x1) // 2
            figs.append({'box': (x0, y0, x1, y1), 'top': top, 'cx': hx})
    figs.sort(key=lambda f: (f['box'][1] + f['box'][3]) / 2)
    rows = []
    for f in figs:
        last = rows[-1][0]['box'] if rows else None
        if last and f['box'][1] < last[3] - (last[3] - last[1]) / 2:
            rows[-1].append(f)
        else:
            rows.append([f])
    figs = [f for r in rows for f in sorted(r, key=lambda f: f['box'][0])]

    s = median(f['box'][3] - f['top'] + 1 for f in figs) / body_px   # 원본 몇 픽셀이 게임 한 픽셀인가
    meta = []
    for n, f in enumerate(figs):
        x0, y0, x1, y1 = f['box']
        ow, oh = max(1, round((x1 - x0 + 1) / s)), max(1, round((y1 - y0 + 1) / s))
        out = Image.new('RGBA', (ow, oh), (0, 0, 0, 0))
        o = out.load()
        for j in range(oh):
            for i in range(ow):
                xa, xb = x0 + int((i + 0.2) * s), x0 + int((i + 0.8) * s)
                ya, yb = y0 + int((j + 0.2) * s), y0 + int((j + 0.8) * s)
                votes, bgn, total = Counter(), 0, 0
                for yy in range(ya, max(ya + 1, yb)):
                    for xx in range(xa, max(xa + 1, xb)):
                        if xx >= W or yy >= H:
                            continue
                        total += 1
                        if not fg(xx, yy):
                            bgn += 1
                            continue
                        c = px[xx, yy]
                        votes[(c[0] // 12 * 12 + 6, c[1] // 12 * 12 + 6, c[2] // 12 * 12 + 6)] += 1
                if votes and bgn * 2 < total:
                    o[i, j] = (*votes.most_common(1)[0][0], 255)
        alpha = out.getchannel('A')
        qz = out.convert('RGB').quantize(colors=16, method=Image.Quantize.MEDIANCUT).convert('RGBA')
        qz.putalpha(alpha)
        qz.save(f'{prefix}_{n}.png')
        meta.append({'w': ow, 'h': oh, 'ax': round((f['cx'] - x0) / s), 'ay': oh - 1})
    json.dump(meta, open(f'{prefix}.json', 'w'))
    print(prefix, len(figs), '프레임, 축척', round(s, 2))


def pack(out_path, refs):
    sheet = Image.new('RGBA', (CW * len(refs), CH), (0, 0, 0, 0))
    for k, ref in enumerate(refs):
        prefix, n = ref.rsplit(':', 1)
        m = json.load(open(f'{prefix}.json'))[int(n)]
        dx, dy = FOOT_X - m['ax'], FOOT_Y - m['ay']
        assert dx >= 0 and dy >= 0 and dx + m['w'] <= CW and dy + m['h'] <= CH, f'{ref}: 칸을 벗어난다'
        sheet.alpha_composite(Image.open(f'{prefix}_{n}.png'), (k * CW + dx, dy))

    w, h = sheet.size
    p = sheet.load()
    opaque = lambda x, y: 0 <= x < w and 0 <= y < h and p[x, y][3] > 0
    near = lambda x, y: ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1))
    clean = sheet.copy()
    c = clean.load()
    for y in range(h):
        for x in range(w):
            n4 = sum(opaque(nx, ny) for nx, ny in near(x, y))
            if opaque(x, y) and n4 <= 1:                       # 떨어진 점
                c[x, y] = (0, 0, 0, 0)
            elif not opaque(x, y) and n4 >= 3:                 # 한 칸 구멍: 이웃의 가장 많은 색
                c[x, y] = Counter(p[nx, ny] for nx, ny in near(x, y) if opaque(nx, ny)).most_common(1)[0][0]
    final = clean.copy()
    f = final.load()
    for y in range(h):
        for x in range(w):
            if c[x, y][3] == 0 and any(0 <= nx < w and 0 <= ny < h and nx // CW == x // CW and c[nx, ny][3] > 0
                                       for nx, ny in near(x, y)):
                f[x, y] = OUTLINE
    # 칸 가장자리(왼·오른쪽·위)에 닿은 점은 바깥에 외곽선을 둘 수 없으니 그 점을 외곽선 색으로(칼끝이 잘려 보이지 않게)
    for y in range(h):
        for x in range(w):
            if f[x, y][3] > 0 and (x % CW in (0, CW - 1) or y == 0):
                f[x, y] = OUTLINE
    final.save(out_path)
    print(out_path, final.size)


if __name__ == '__main__':
    if sys.argv[1] == 'frames':
        frames(sys.argv[2], sys.argv[3], int(sys.argv[4]), sys.argv[5])
    elif sys.argv[1] == 'pack':
        pack(sys.argv[2], sys.argv[3:])
    else:
        sys.exit(__doc__)
