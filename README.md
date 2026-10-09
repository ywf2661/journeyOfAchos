# Journey of Achos — 아코스의 여정

역병이 도는 왕국의 기사 아코스가 병을 고칠 방법을 찾아 떠났다가, 시간을 멈추는 마술사 아이온을 만나는
30분 분량의 2D 도트 웹 RPG입니다. 「어둠의 회랑」의 세계관을 빌린 독립작입니다.

## 실행

빌드가 없습니다. 저장소 루트에서 정적 서버를 띄우고 브라우저로 엽니다.

    npm run serve        # = python -m http.server 8000
    # http://localhost:8000

최신 Chrome·Edge를 권장합니다.

휴대폰·태블릿에서는 GitHub Pages 주소(https://ywf2661.github.io/journeyOfAchos/)로 접속합니다. 가로·세로 모두 됩니다.

## 조작

| 키 | 탐험·대화 | 전투 |
|---|---|---|
| 방향키 | 한 칸씩 걷기(짧게 누르면 방향만 바꿈), 선택지 고르기 | 걷기 |
| Z | 말 걸기·살펴보기, 대사 넘기기, 선택지 결정 | 베기 |
| X | 누르고 있으면 달리기, 대사 빨리 넘기기 | 피하기 |
| Z 길게 눌렀다 떼기 | | 성휘참(적을 맞혀 ✦ 세 개가 찼을 때, 앞 4칸·폭 3칸에 큰 피해) |
| 숫자 1–3 | 선택지 바로 고르기 | |

전투: 맵에 서 있는 검은 무리에게 다가가면 그 자리에서 싸움이 시작됩니다. 투척꾼은 오물을 던지고, 돌진꾼은 같은 줄에 서면 붉게 깜빡인 뒤 돌진합니다(X로 피하기). 체력은 전투 사이에 이어지고 지역에 들어가면 가득 찹니다. 다친 채로 약초를 밟으면 ♥가 하나 찹니다.

퍼즐: 돌은 그쪽으로 걸어 들어가면 밀립니다. 시계 돌·다시 놓기 돌은 바라보고 Z. 풀다 꼬이면 다시 놓기 돌로 처음 상태가 됩니다.

휴대폰·태블릿: 왼쪽 아래 조이스틱으로 걷고, 오른쪽 아래 Z·X 버튼은 위 표와 같습니다.

진행은 자동 저장됩니다(지역에 들어갈 때, 대화가 끝날 때, 퍼즐을 풀 때).

## 개발

    npm test             # node --test, Node 20 이상
    npm run shot -- <출력.png> 1280x720 [저장.json]   # 헤드리스 Chrome 스크린샷(서버를 먼저 띄운다)

- 대사: `data/script.js` · 지역 맵과 전투: `data/regions.js` · 맵 기호와 타일: `data/tiles.js` · 인물 그림: `data/sprites.js`
- 아코스·아이온 도트는 힉스필드 참고 시트(`tools/sprite-refs/`)를 `tools/pixelize.py`(파이썬 + Pillow)로 줄여 만든다. 만든 명령은 그 파일 맨 위에 있다.
- 게임 규칙(대화·저장·전투·칸 이동·맵·퍼즐·큰 인물 프레임)은 `src/story.js`, `src/combat.js`, `src/player.js`, `src/map.js`, `src/region.js`, `src/puzzle.js`, `src/anim.js`에 있고 테스트가 있습니다.
- 설계: `docs/superpowers/specs/2026-10-08-2d-topdown-design.md`, 퍼즐 `docs/superpowers/specs/2026-10-09-puzzles-design.md`, 2단계 전투 `docs/superpowers/specs/2026-10-09-combat-phase2-design.md`

## 배포

GitHub 저장소 Settings → Pages → Branch: `main`, 폴더: `/ (root)`. 모든 경로가 상대 경로라 그대로 동작합니다.

## 출처

`CREDITS.md`를 보세요. 타일과 작은 인물 그림은 Kenney의 CC0이고, 아코스·아이온은 힉스필드로 만든 그림입니다.
