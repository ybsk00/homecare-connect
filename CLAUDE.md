# HomeCare Connect (홈케어커넥트)

AI 기반 방문치료 매칭 & 운영 SaaS 플랫폼 — 주식회사 온케어

## 프로젝트 구조

Turborepo + pnpm 모노레포

```
apps/
  web/             # 통합 웹앱 (Next.js 15, port 3000) - 랜딩+환자+간호사+병원+관리자
  homecare-app/    # 통합 모바일 앱 (React Native + Expo 54) - 4개 역할 통합
  patient-app/     # [레거시] 환자 모바일 앱 → homecare-app으로 통합됨
  nurse-app/       # [레거시] 간호사 모바일 앱 → homecare-app으로 통합됨

packages/
  shared-types/    # TypeScript 타입 (DB 스키마, API, Enum)
  shared-utils/    # Zod 검증, 바이탈 범위, 포맷, 날짜 유틸
  supabase-client/ # Supabase 클라이언트 + 쿼리 함수

supabase/
  functions/       # 16개 Edge Functions (AI 매칭, 에이전트, 복약, RAG 등)
  migrations/      # DB 마이그레이션 SQL (7개)

scripts/
  rag_generator.py       # RAG FAQ 대량 생성기 (PubMed + Gemini)
  create_guide_pptx.py   # 이용자 설명서 PPT 생성
```

## 기술 스택

- **언어**: TypeScript (전체)
- **모바일**: React Native 0.81 + Expo SDK 54 + Expo Router v6
- **웹**: Next.js 15 (App Router) + Tailwind CSS v4
- **상태**: Zustand 5 (클라이언트) + TanStack Query v5 (서버)
- **백엔드/DB**: Supabase (PostgreSQL 17 + PostGIS + pgvector)
- **AI**: Google Gemini 2.5 Flash (Function Calling + Vision)
- **임베딩**: Gemini gemini-embedding-001 (1536차원)
- **호스팅**: Firebase App Hosting (Next.js SSR)
- **모노레포**: Turborepo + pnpm

## Supabase

- **프로젝트**: Homecare connect
- **URL**: https://hviqeyrnstgwumqiacwh.supabase.co
- **Ref**: hviqeyrnstgwumqiacwh
- **리전**: ap-northeast-1 (도쿄)
- **DB**: PostgreSQL 17, 29개 테이블, 45+ RLS 정책, 57+ 인덱스
- **확장**: PostGIS, pgvector, pg_trgm, uuid-ossp
- **Edge Functions**: 16개 (기존 9 + 에이전트 7)

### 에이전트 시스템 테이블 (9개 추가)
prescriptions, medication_schedules, condition_checks, meal_logs, agent_conversations,
patient_agent_rag_diseases, patient_agent_rag_emergency, nurse_agent_rag_clinical, nurse_agent_rag_assessment

### Edge Functions (16개)
기존: ai-matching, red-flag-detect, ai-report, rag-chat, route-optimize, send-notification, speech-to-text, toss-webhook, doctor-opinion-simplify
에이전트: agent-patient-chat, agent-nurse-chat, agent-medication-guide, agent-medication-alarm, agent-meal-analyze, agent-condition-check, rag-pipeline-ingest

## 디자인 시스템: "The Digital Sanctuary"

- **Primary**: #002045 (deep navy)
- **Secondary**: #006A63 (teal)
- **Tertiary**: #321B00 (warm brown, alerts)
- **Surface**: #F7FAFC (background)
- **Font**: Pretendard (웹), System (모바일)
- **규칙**: No borders (tonal layering), gradient buttons, 16px radius, editorial spacing, 56px 터치 타겟
- **참고**: 홈컨넥트_디자인/ 디렉토리의 DESIGN.md, screen.png, NEW/ (Stitch 디자인)

## 주요 커맨드

```bash
pnpm install          # 의존성 설치
pnpm dev              # 전체 dev 서버 실행
pnpm build            # 전체 빌드
pnpm type-check       # TypeScript 타입 체크
pnpm lint             # ESLint

# 모바일 앱
cd apps/homecare-app && npx expo start     # Expo Go 테스트
cd apps/homecare-app && npx expo start -w  # 웹 브라우저 테스트

# RAG FAQ 생성
python scripts/rag_generator.py --action status
python scripts/rag_generator.py --action generate --category hypertension --target patient --count 100
python scripts/rag_generator.py --action generate_all
```

## 환경변수

.env 파일은 절대 git에 커밋하지 않는다. .env.example 참고.
필요한 키: Supabase(anon/service_role), Gemini, Kakao, Naver(CLIENT_ID/SECRET), Toss, DATA_GO_KR_API_KEY, NCBI_API_KEY, GOOGLE_CLOUD_STT_API_KEY, NEXT_PUBLIC_APP_URL

## Firebase App Hosting

- **프로젝트**: homecare-connect-ce904
- **백엔드**: hospital-web (통합 웹앱, root: apps/web)
- **URL**: https://hospital-web--homecare-connect-ce904.asia-east1.hosted.app
- **리전**: asia-east1 (타이완)
- **배포**: GitHub main push → 자동 빌드/배포 (Cloud Run)
- **설정**: `apps/web/apphosting.yaml`

## 웹앱 라우팅 (통합)

- `/` — 히어로 랜딩 (비로그인)
- `/login` — 통합 로그인 (이메일 + 구글 + 카카오 + 네이버) → 역할별 자동 분기
- `/auth/callback` — OAuth 콜백 (구글/카카오)
- `/api/auth/naver/*` — 네이버 OAuth API Route (커스텀)
- `/patient/*` — 환자/보호자 (ContentNav 탭 레이아웃, 콘텐츠 중심 UI)
- `/nurse/*` — 간호사 (ContentNav 탭 레이아웃, 콘텐츠 중심 UI)
- `/hospital/*` — 병원 관리자 (Sidebar + TopBar, 관리자 UI)
- `/admin/*` — 플랫폼 관리자 (Sidebar + TopBar, 관리자 UI)

### 환자 페이지 (12개)
대시보드, 매칭(지역선택), 일정(주간/월간), 방문기록(바이탈차트), AI리포트, 환자관리, 리뷰, 설정, AI상담(RAG), AI도우미(에이전트), 알림

### 간호사 페이지 (10개)
오늘일정(벤토+LIVE카드), 담당환자, 환자상세(바이탈차트), 레드플래그, 방문수행(10단계 스텝), 월간통계, 알림, 설정, AI어시스턴트(에이전트)

### 병원 페이지 (10개)
대시보드, 환자관리, 직원관리, 일정, 서비스요청, 의사방문(소견입력+AI변환), 통계, 수납, 건보청구자료, 설정

### 관리자 페이지 (7개)
KPI대시보드(전환율), 기관심사, 구독관리, 광고관리, 민원처리, RAG관리(대화로그), AI모니터링

### 랜딩 페이지 섹션 (10개)
Navigation, Hero, WhyHomeCare(방문요양 중요성), PlatformValue(Before/After 비교), AgentShowcase(4개 멀티 에이전트), FeatureCards(AI 채팅 미리보기+특징3카드), HowItWorks(3단계 이용방법), Stats(카운트업 통계), Testimonials(이용자 후기), Footer

### 소셜 로그인
- **구글**: Supabase 공식 Provider (signInWithOAuth)
- **카카오**: Supabase 공식 Provider (signInWithOAuth)
- **네이버**: Next.js API Route 커스텀 (/api/auth/naver/*) — 현재 주석 처리, 도메인 승인 후 활성화

### 테스트 계정
- pat1@admin.com / admin1234 (환자/보호자)
- ner1@admin.com / admin1234 (간호사)
- hot1@admin.com / admin1234 (병원관리자)
- sys1@admin.com / admin1234 (시스템관리자)

## 모바일 앱 (homecare-app) 라우팅

로그인 → profile.role 확인 → 역할별 탭 자동 분기
- `/(patient)/*` — 환자 5탭: 홈, 매칭, 일정, 기록, 마이
- `/(nurse)/*` — 간호사 4탭: 오늘, 환자, 알림, 마이
- `/(hospital)/*` — 병원 5탭: 대시보드, 환자, 일정, 통계, 더보기
- `/(admin)/*` — 관리자 4탭: KPI, 기관, 운영, 더보기
- `/patient/*`, `/nurse/*`, `/hospital/*`, `/admin/*` — 스택 상세 화면

총 70개 화면 (탭 27 + 스택 43)
- 번들ID: kr.homecareconnect.app

## GitHub

- **레포**: https://github.com/ybsk00/homecare-connect
- **브랜치**: main

## UI 레이아웃 패턴

### 웹
- **환자/간호사**: `ContentNav.tsx` (상단 탭) + `ContentLayout.tsx` → 콘텐츠 중심 앱 스타일
- **병원/관리자**: `Sidebar.tsx` + `TopBar.tsx` → 관리자 대시보드 스타일

### 모바일
- **전역**: 하단 탭바 (불투명 흰색 배경) + Stack 네비게이션
- **환자/간호사**: 히어로 카드, AI 에이전트 카드, 바이탈 바차트, 케어 타임라인
- **병원/관리자**: StatCard, 리스트, 필터칩, 액션 버튼
- **아바타**: assets/images/ (nurse.jpg, patient_man.jpg, patient_women.jpg)

## AI 에이전트 시스템

- **환자 에이전트**: 돌봄 동반자 페르소나, 음성(STT/TTS), 컨디션체크, 복약관리, 식사분석, 이상징후감지
- **간호사 에이전트**: 업무 브리핑 비서, 오늘 브리핑, 환자 요약, 처방약 조회, 레드플래그
- **Gemini Function Calling**: 환자 9개 도구, 간호사 8개 도구
- **RAG**: 4개 벡터 테이블 (1536차원), 현재 ~2,723개 FAQ 적재
- **복약 시스템**: 처방→e약은요/DUR 조회→Gemini 변환→자동 알람→미이행 시 간호사 알림
- **상세**: AGENT_SYSTEM.md 참조

## 코드 규칙

- 공유 타입은 반드시 @homecare/shared-types에서 import
- DB 쿼리는 @homecare/supabase-client의 쿼리 함수 사용
- 유효성 검증은 @homecare/shared-utils의 Zod 스키마 사용
- 웹 앱은 Tailwind CSS v4 @theme 커스텀 프로퍼티 사용 (하드코딩 hex 금지)
- 모바일 앱은 constants/theme.ts의 디자인 토큰 사용 (Colors, Spacing, Radius, FontSize, Shadows)
- 모든 UI 텍스트는 한국어
- API 키, 시크릿 등 민감정보는 절대 코드에 하드코딩 금지
- 환자/간호사 라우팅: `/patient/...`, `/nurse/...` (절대 `/dashboard/...` 사용 금지)
- 모바일 필터칩: height 40px 고정, borderRadius 20, 그림자 없음
- 모바일 탭바: 불투명 흰색 배경 (글래스모피즘 사용 금지)
