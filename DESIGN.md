# Design System — HomeCare Connect (홈케어커넥트)

## Product Context
- **What this is:** AI 기반 방문치료 매칭 & 운영 SaaS 플랫폼
- **Who it's for:** 환자/보호자 (고령자 가족), 방문간호사, 병원 관리자, 플랫폼 관리자
- **Space/industry:** 헬스케어 SaaS, 홈케어/재가요양
- **Project type:** 웹앱 (Next.js 15) + 모바일 앱 (React Native + Expo 54)

## Aesthetic Direction
- **Direction:** Editorial Sanctuary — 고급 웰니스 매거진 같은 에디토리얼 스타일
- **Decoration level:** Intentional — 글래스모피즘, tonal layering, 미미한 그라디언트
- **Mood:** 따뜻하지만 전문적. 고급 클리닉처럼 밝고, 넓고, 깊이 있는 느낌
- **Image rule:** AI 생성 사람 얼굴 절대 금지. 손, 도구, 공간, 정물만 사용

## Typography

### 웹 랜딩 페이지
- **Display/Hero:** Manrope 800 (font-headline) — Geometric Sans, 기술적 세련된 인상
- **Body:** Public Sans 400/500 (font-body) — 높은 가독성
- **UI/Labels:** Public Sans 600, uppercase tracking 0.1em
- **Korean fallback:** Pretendard Variable

### 웹 앱 내부 (환자/간호사/병원/관리자)
- **전체:** Pretendard Variable — 한글 최적화
- **규칙:** 기존 Tailwind 시스템 폰트 유지

### 모바일 앱
- **전체:** System 폰트 (iOS: SF Pro, Android: Roboto)
- **규칙:** constants/theme.ts의 FontSize 토큰 사용

### 타이포 스케일
- Display: 3rem+ (48px+) — Hero 제목
- Headline Large: 2.5rem (40px) — 섹션 제목
- Headline Medium: 1.5rem (24px) — 카드 제목
- Body Large: 1.125rem (18px) — 본문
- Body Medium: 0.875rem (14px) — 보조 텍스트
- Label: 0.75rem (12px) — 메타데이터
- **Line-height:** 한글 본문 최소 1.6x

## Color

### 팔레트
- **Primary:** #002045 (Deep Navy) — 권위, 헤더, 메인 CTA
- **Primary Container:** #1A365D — 그라디언트 CTA 끝점
- **Secondary:** #006A63 (Teal) — 건강 지표, 성공, 생명력
- **Secondary Container:** #79F7EA — 보조 버튼 배경
- **Tertiary:** #321B00 (Warm Brown) — 긴급 알림
- **Tertiary Container:** #FFE0B2
- **Error:** #BA1A1A — 레드플래그

### Surface 계층 (Tonal Layering)
- Surface: #F7FAFC (베이스 캔버스)
- Surface Container Low: #F1F4F6 (섹션 구분)
- Surface Container: #EBEEF0
- Surface Container High: #E5E9EB (입력 필드 배경)
- Surface Container Lowest: #FFFFFF (활성 카드)
- On Surface: #181C1E (주 텍스트, #000000 사용 금지)
- On Surface Variant: #42474E (보조 텍스트)
- Outline Variant: #C4C6CF (고스트 보더용, 15% opacity만)

### Primary/Secondary/Tertiary 스케일
globals.css의 @theme 블록에 50~900 스케일 정의됨. Tailwind v4 커스텀 프로퍼티 사용.

## Spacing
- **Base unit:** 8px
- **Density:** Comfortable — 고령 사용자 접근성을 위한 넉넉한 여백
- **Scale:** 2xs(2px) xs(4px) sm(8px) md(16px) lg(24px) xl(32px) 2xl(48px) 3xl(64px)
- **Section spacing:** py-20 (80px) ~ py-28 (112px)
- **Content max-width:** max-w-7xl (1280px), padding px-8 (32px)

## Layout
- **랜딩/환자/간호사:** Editorial — 12-column 그리드, 비대칭 레이아웃, 넓은 여백
- **병원/관리자:** Grid-disciplined — Sidebar + TopBar, 데이터 밀도
- **모바일:** 하단 탭바 + Stack 네비게이션

## Border Radius
- **랜딩 페이지:** rounded-lg (8px) — Stitch 디자인의 절제된 곡률
- **웹 앱 내부:** rounded-2xl (16px) — 부드러운 앱 스타일
- **모바일 앱:** Radius.xl (16px), Radius.lg (12px)
- **칩/뱃지:** rounded-full (9999px)

## Icons

### 웹 랜딩 페이지
- **시스템:** Material Symbols Outlined (Google Fonts CDN)
- **기본:** FILL 0, wght 400, GRAD 0, opsz 24
- **Filled:** FILL 1 — 활성 상태 (check_circle, favorite, star 등)

### 웹 앱 내부 / 모바일 앱
- **시스템:** Lucide React
- **규칙:** 기존 Lucide 아이콘 유지

## Motion
- **Approach:** Intentional
- **스크롤 진입:** IntersectionObserver + translate-y + opacity (staggered delay)
- **호버:** translateY(-2px) + shadow 강화 (300ms)
- **Easing:** enter(ease-out) exit(ease-in) move(ease-in-out)
- **Duration:** micro(50-100ms) short(150-250ms) medium(250-400ms) long(400-700ms)

## No-Line Rule
1px solid 보더로 콘텐츠를 구분하지 않는다. 경계는 배경색 전환(tonal layering)으로 정의.
- 보더 필요 시: outline-variant at 15% opacity ("Ghost Border")
- 금지: 100% 불투명 고대비 보더

## Glassmorphism
- **Navigation:** surface 80% opacity + backdrop-blur 20px
- **Floating cards:** white 80% opacity + backdrop-blur 12px + border white/20
- **Dark cards:** white 10% opacity + backdrop-blur 24px + border white/10

## Shadow
- **premium-shadow:** 0 4px 24px rgba(0, 32, 69, 0.06) — 기본 카드
- **ambient-shadow:** 0 10px 40px rgba(46, 71, 110, 0.06) — 앱 내부 카드
- **shadow-tinted:** 0 16px 48px rgba(46, 71, 110, 0.06) — 강조
- **shadow-tinted-lg:** 0 20px 60px rgba(46, 71, 110, 0.08) — 호버/활성
- 금지: 순수 회색 그림자, 무거운 drop shadow

## CSS Utilities (globals.css)
- `.glass` — 글래스모피즘 (white 80% + blur 20px)
- `.btn-gradient` — Primary 그라디언트 버튼
- `.premium-shadow` — 틴트 그림자
- `.font-headline` — Manrope 제목 폰트
- `.font-body` — Public Sans 본문 폰트
- `.vitality-chip` — 건강 상태 칩
- `.card` / `.card-elevated` — No-line 카드
- `.bento-card` — 벤토 그리드 카드
- `.ghost-border` — 고스트 보더 (inset shadow)

## 히어로 이미지
- **웹 히어로:** `/images/hero-care.jpg` — 손 클로즈업, 의료 도구, 얼굴 없음
- **WhyHomeCare:** `/images/hero-care.jpg` 공유
- **모바일 배너:** `assets/images/banner.jpg` — 홈케어 키트 정물, 얼굴 없음
- **금지:** AI 생성 사람 얼굴 이미지

## Do's and Don'ts

### Do
- 한글 본문 line-height 1.6x 이상
- Manrope 제목에 letter-spacing -0.02em ~ -0.03em
- Surface 토큰 계층으로 깊이감 표현
- 56px 최소 터치 타겟 (모바일)
- 이미지는 손/도구/공간/정물만

### Don't
- #000000 텍스트 → #181C1E 사용
- 1px 회색 구분선 → 여백 또는 tonal shift
- 모든 카드에 그림자 → "떠있는" 요소에만
- AI 생성 사람 얼굴 이미지 절대 금지
- 보라색 그라디언트, 장식용 블롭 사용 금지

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-25 | Stitch Digital Sanctuary 디자인 랜딩 페이지 적용 | 에디토리얼 프리미엄 느낌, No-Line Rule, tonal layering |
| 2026-03-25 | AI 얼굴 이미지 전면 금지 | 불쾌한 골짜기(Uncanny Valley) 문제 |
| 2026-03-25 | 랜딩: Material Symbols, 앱: Lucide 유지 | 랜딩은 Stitch 스타일, 앱은 기존 코드 호환성 유지 |
| 2026-03-25 | 랜딩: Manrope+Public Sans, 앱: Pretendard 유지 | 랜딩만 에디토리얼 타이포 적용, 앱은 한글 최적 유지 |
| 2026-03-25 | 랜딩: rounded-lg(8px), 앱: rounded-2xl(16px) | 랜딩은 Stitch 절제된 곡률, 앱은 부드러운 느낌 유지 |
