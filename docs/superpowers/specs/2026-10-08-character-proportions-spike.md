# 캐릭터 등신 늘리기 — 조사 결과와 다음 단계

> 상태: **조사(spike) 진행 중**. 아직 코드는 바꾸지 않았다.
> 회사 네트워크에서 itch.io가 차단돼 에셋을 받지 못해 멈췄고, 집에서 이어서 한다.
> 이 문서를 시작점으로 삼는다(새 세션이라면 이 문서와 아래 "현재 구조"부터 읽는다).

- 작성일: 2026-10-08

## 1. 목표

- 지금 캐릭터(KayKit Adventurers, 약 2~2.5등신 SD)를 **젤다 브레스 오브 더 와일드 정도의 비율(약 6.5~7등신, 살짝 만화풍)**로 바꾼다.
- 그림체도 BotW 쪽으로: **셀 셰이딩(명암 2~3단계) + 외곽선**을 시험해 본다(Three.js 기본 기능으로 가능).

## 2. 후보 에셋 — Quaternius "Universal" 시리즈 (모두 CC0, 무료 표준판 있음)

| 팩 | 내용 | 무료 표준판 |
|---|---|---|
| [Universal Base Characters](https://quaternius.itch.io/universal-base-characters) | 사람 몸 6종(남녀 × 슈퍼히어로·보통·청소년 비율), 머리 모양 20종, 평균 약 13k 삼각형, 휴머노이드 뼈대 | zip 약 122MB, glTF 포함 |
| [Modular Character Outfits – Fantasy](https://quaternius.itch.io/modular-character-outfits-fantasy) | 판타지 의상 12벌(부품 62개), 의상마다 색 3종. v2.0(2026-01-29): 부품 겹침 감소, Base Characters 머리만 붙이면 됨 | zip 약 280MB |
| [Universal Animation Library](https://quaternius.itch.io/universal-animation-library) (+ 2편) | 같은 뼈대용 애니메이션 120~130개 이상(전투 포함) | 무료판 있음 |

- 공식 소개: [quaternius.com — Base Characters](https://quaternius.com/packs/universalbasecharacters.html), [quaternius.com — Outfits Fantasy](https://quaternius.com/packs/modularcharacteroutfitsfantasy.html)
- 의상 목록은 공식 페이지에 없다. 제3자 자료([Vizboom/tome-of-heroes PR #4](https://github.com/Vizboom/tome-of-heroes/pull/4))로 보면 **기사(Knight)·귀족(Noble)·마법사(Wizard)·레인저(Ranger)·농민(Peasant)** 계열이 있는 것으로 보인다 — **받은 뒤 파일 이름으로 확인할 것.**

### 배역 대응(안)
| 배역 | 후보 |
|---|---|
| 아코스 | 기사 의상 + 보통 비율 남성 |
| 아이온 | 마법사 의상 + 보통 비율 여성 (베일 없음, 보라·바랜 금동 색 — 색 변형 3종 중 고르거나 tint) |
| 왕 | 귀족 의상(+ 금빛 tint) |
| 왕자 | 청소년 비율 |
| 병사·성문 경비병 | 농민·기사 변형 |
| 여행자 | 레인저 |
| 역병 적 | (미정) 기본 몸을 검게 칠하고 눈만 황록빛 — "짐승이었을까, 사람이었을까" 대사와 어울림 |

## 3. 에셋 받기 (회사망 밖에서)

1. 위 itch.io 페이지 세 곳에서 **Download Now → "No thanks, just take me to the downloads"** → **Standard**(무료) zip을 받는다.
2. 받은 zip을 PC의 한 폴더에 모은다(예: `Downloads/quaternius/`). 압축을 풀 필요는 없다.
3. **저장소에는 zip을 그대로 커밋하지 않는다**(수백 MB). 시험 제작에서 실제로 쓸 모델·애니메이션만 골라 `assets/quaternius/` 아래에 넣는다.

## 4. 시험 제작(spike) 범위 — 확인용, 결과물은 버릴 수 있다

1. 받은 파일에서 기사·마법사 의상과 머리, 애니메이션 파일의 이름·구조를 확인한다(glTF 노드·뼈대 이름, 애니메이션 클립 이름).
2. 아코스(기사)와 아이온(마법사)을 지역 1(왕도)에 세운다.
3. 애니메이션 라이브러리의 걷기·달리기·베기가 Three.js에서 이 몸에 그대로 붙는지 확인한다(뼈대 이름이 같으면 클립을 그대로 재생, 다르면 리타기팅 필요).
4. **셀 셰이딩 없음 / 있음** 비교 스크린샷을 만든다(가로 PC 화면 + 휴대폰 세로).
5. 결과를 보고 정식 교체 여부를 결정한다 → 정식 교체는 따로 설계(스펙 → 계획)한다.

## 5. 확인할 것·위험

- **애니메이션 호환**: 의상·몸·애니메이션이 한 뼈대 규격이라고 소개되지만 Three.js에서 바로 맞는지는 미확인.
- **용량**: 몸 약 13k 삼각형 + 의상·텍스처. 지금 첫 다운로드는 4.9MB(KayKit 캐릭터를 줄인 뒤). 캐릭터 6~7종을 넣으면 얼마나 늘어나는지 재고, 휴대폰 성능도 본다. 필요하면 `tools/slim-anims.mjs`처럼 안 쓰는 애니메이션·부품을 걷어 낸다.
- **배경과의 조화**: 건물·소품(KayKit Medieval Hexagon 등)은 뭉툭한 장난감풍이고 캐릭터 키(약 2.5)에 맞춰 키워 놓았다(`data/models.js`의 scale). 사람 비율 캐릭터에 맞게 배율을 다시 잡아야 하고, 그림체가 어울리는지 본다.
- **적 캐릭터**: 지금 해골(SD)도 바꿔야 톤이 맞는다.
- **영향받는 코드**: `data/models.js`(모델 목록·배율·`ANIMATIONS`), 애니메이션 이름을 쓰는 곳(`src/main.js`, `src/player.js`, `src/world.js`, `data/regions.js`의 `anim`), `plagueLook`(메시 이름 'Eyes'), `tests/assets.test.js`(애니메이션 이름·용량 11MB 기준), `CREDITS.md`.

## 6. 현재 구조 (이어서 할 때 참고)

- 설계: `docs/superpowers/specs/2026-10-08-journey-of-achos-design.md`, `docs/superpowers/specs/2026-10-08-mobile-controls-design.md`
- 실행: 저장소 루트에서 `npm run serve` → `http://localhost:8000` / 테스트 `npm test`(78개)
- 모델 목록·배율: `data/models.js` / 모델 로드·애니메이션: `src/world.js`(`spawn`, `animate`) / 조작: `src/player.js`
- 현재 캐릭터: KayKit Adventurers(Knight·Mage·Barbarian·Rogue·Rogue_Hooded) + Skeleton_Minion, 애니메이션은 `ANIMATIONS` 10개만 남겨 둠
