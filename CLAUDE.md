# HomeCare Connect (홈케어커넥트)

AI 기반 방문치료 매칭 & 운영 SaaS 플랫폼 — 주식회사 루미브리즈

## 프로젝트 구조

Turborepo + pnpm 모노레포

```
apps/
  patient-app/     # 환자/보호자 모바일 앱 (React Native + Expo)
  nurse-app/       # 간호사 모바일 앱 (React Native + Expo)
  hospital-web/    # 병원 관리 콘솔 (Next.js 15, port 3000)
  admin-web/       # 플랫폼 백오피스 (Next.js 15, port 3001)

packages/
  shared-types/    # TypeScript 타입 (DB 스키마, API, Enum)
  shared-utils/    # Zod 검증, 바이탈 범위, 포맷, 날짜 유틸
  supabase-client/ # Supabase 클라이언트 + 쿼리 함수

supabase/
  functions/       # 9개 Edge Functions (AI 매칭, 레드플래그 등)
  migrations/      # DB 마이그레이션 SQL
```

## 기술 스택

- **언어**: TypeScript (전체)
- **모바일**: React Native + Expo SDK 52
- **웹**: Next.js 15 (App Router) + Tailwind CSS v4
- **상태**: Zustand (클라이언트) + TanStack Query v5 (서버)
- **백엔드/DB**: Supabase (PostgreSQL 17 + PostGIS + pgvector)
- **AI**: Google Gemini 2.5 Flash
- **모노레포**: Turborepo + pnpm

## Supabase

- **프로젝트**: Homecare connect
- **URL**: https://hviqeyrnstgwumqiacwh.supabase.co
- **Ref**: hviqeyrnstgwumqiacwh
- **리전**: ap-northeast-1 (도쿄)
- **DB**: PostgreSQL 17, 20개 테이블, 27 RLS 정책, 40 인덱스
- **확장**: PostGIS, pgvector, pg_trgm, uuid-ossp

## 디자인 시스템: "The Curated Sanctuary"

- **Primary**: #002045 (deep navy)
- **Secondary**: #006A63 (teal)
- **Tertiary**: #321B00 (warm brown, alerts)
- **Surface**: #F7FAFC (background)
- **Font**: Pretendard (웹), System (모바일)
- **규칙**: No borders (tonal layering), glassmorphism headers, gradient buttons, 16px radius, editorial spacing
- **참고**: 홈컨넥트_디자인/ 디렉토리의 DESIGN.md 및 screen.png

## 주요 커맨드

```bash
pnpm install          # 의존성 설치
pnpm dev              # 전체 dev 서버 실행
pnpm build            # 전체 빌드
pnpm type-check       # TypeScript 타입 체크
pnpm lint             # ESLint
```

## 환경변수

.env 파일은 절대 git에 커밋하지 않는다. .env.example 참고.
필요한 키: Supabase(anon/service_role), Gemini, Kakao, Toss

## GitHub

- **레포**: https://github.com/ybsk00/homecare-connect
- **브랜치**: main

## 코드 규칙

- 공유 타입은 반드시 @homecare/shared-types에서 import
- DB 쿼리는 @homecare/supabase-client의 쿼리 함수 사용
- 유효성 검증은 @homecare/shared-utils의 Zod 스키마 사용
- 웹 앱은 Tailwind CSS v4 @theme 커스텀 프로퍼티 사용
- 모바일 앱은 constants/theme.ts의 디자인 토큰 사용
- 모든 UI 텍스트는 한국어
- API 키, 시크릿 등 민감정보는 절대 코드에 하드코딩 금지
