# Journey of Achos — 아코스의 여정

역병이 도는 왕국의 기사 아코스가 병을 고칠 방법을 찾아 떠났다가, 시간을 멈추는 마술사 아이온을 만나는
30분 분량의 3D 웹 RPG입니다. 「어둠의 회랑」의 세계관을 빌린 독립작입니다.

## 실행

빌드가 없습니다. 저장소 루트에서 정적 서버를 띄우고 브라우저로 엽니다.

    npm run serve        # = python -m http.server 8000
    # http://localhost:8000

최신 Chrome·Edge를 권장합니다. 인터넷 연결이 필요합니다(Three.js·글꼴을 CDN에서 받습니다).

휴대폰·태블릿에서는 GitHub Pages 주소(https://ywf2661.github.io/journeyOfAchos/)로 접속합니다. 가로·세로 모두 됩니다.

## 조작

| 키 | 동작 |
|---|---|
| WASD / 방향키 | 걷기 |
| Shift | 달리기 |
| 마우스 끌기 | 시야 돌리기 |
| E | 말 걸기·살펴보기 |
| 클릭 / Space / E / Enter | 대사 넘기기 |
| 숫자 1–3 | 선택지 고르기 |
| 클릭 (전투) | 베기 |
| Space (전투) | 피하기 |

휴대폰·태블릿:

| 조작 | 동작 |
|---|---|
| 왼쪽 화면 끌기 | 걷기 (끝까지 밀면 달리기) |
| 오른쪽 화면 끌기 | 시야 돌리기 |
| 아래에 뜨는 안내 누르기 | 말 걸기·살펴보기 |
| 대화창 누르기 | 대사 넘기기 |
| [베기]·[피하기] (전투) | 베기·피하기 (화면 탭도 베기) |

진행은 자동 저장됩니다(지역에 들어갈 때, 대화가 끝날 때).

## 개발

    npm test             # node --test, Node 20 이상
    npm run fetch-assets # data/models.js 목록대로 KayKit 에셋을 다시 받기(캐릭터는 받은 직후 줄인다)
    npm run slim-assets  # 캐릭터 GLB에서 게임이 쓰는 애니메이션(ANIMATIONS)만 남기기

- 대사: `data/script.js` · 지역 배치와 전투: `data/regions.js` · 모델 목록: `data/models.js`
- 게임 규칙(대화·저장·전투·충돌)은 `src/story.js`, `src/combat.js`, `src/geom.js`, `src/region.js`에 있고 테스트가 있습니다.
- 설계: `docs/superpowers/specs/2026-10-08-journey-of-achos-design.md`

## 배포

GitHub 저장소 Settings → Pages → Branch: `main`, 폴더: `/ (root)`. 모든 경로가 상대 경로라 그대로 동작합니다.

## 출처

`CREDITS.md`를 보세요. 3D 에셋은 모두 KayKit(Kay Lousberg)의 CC0입니다.
