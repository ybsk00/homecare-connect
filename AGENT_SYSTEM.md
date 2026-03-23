# HomeCare Connect AI 에이전트 시스템 — Claude Code 작업지시서

> 주식회사 루미브리즈 | 홈케어커넥트 방문치료 매칭 & 운영 SaaS 플랫폼
> 작성일: 2026-03-23

---

## 1. 프로젝트 개요

홈케어커넥트 플랫폼에 **환자 AI 에이전트**와 **간호사 AI 에이전트** 2종을 추가 구현한다.
대상 사용자가 대부분 어르신(65세 이상)이므로 음성 기반(STT/TTS) 인터페이스가 핵심이다.

### 1.1 에이전트 정의

| 구분 | 환자 에이전트 | 간호사 에이전트 |
|------|-------------|---------------|
| 페르소나 | 돌봄 동반자 (다정한 동네 간호사) | 업무 브리핑 비서 (간결한 전문 어시스턴트) |
| 톤 | 존댓말, 쉬운 한국어, 감정 공감 | 간결, 전문적, 핵심 데이터 위주 |
| 진입점 | 앱 실행 시 proactive 인사 | 앱 실행 시 오늘 브리핑 카드 표시 |
| STT/TTS | 필수 (어르신 접근성) | 유용 (이동 중 브리핑) |
| 라우트 | `/patient/agent` | `/nurse/agent` |

---

## 2. 기존 코드베이스 컨텍스트

### 2.1 참고할 기존 파일 (반드시 먼저 읽을 것)

```
apps/web/                          # 통합 웹앱 (Next.js 15)
├── src/app/patient/              # 환자 라우트 그룹
│   ├── ai-consultation/          # 기존 AI상담(RAG) 페이지 → 에이전트로 확장
│   ├── dashboard/                # 대시보드 → 에이전트 위젯 추가 대상
│   ├── schedule/                 # 일정 페이지 → 에이전트가 조회할 데이터
│   └── records/                  # 방문기록 → 바이탈 데이터 소스
├── src/app/nurse/                # 간호사 라우트 그룹
│   ├── today/                    # 오늘일정 → 에이전트 브리핑 데이터
│   ├── patients/                 # 담당환자 → 환자 상세 데이터
│   ├── red-flag/                 # 레드플래그 → 에이전트 알림 연동
│   └── visit-perform/            # 방문수행(10단계) → 바이탈 수집 흐름
├── src/app/hospital/
│   └── doctor-visit/             # 의사방문(소견+AI변환) → 처방 데이터 소스
supabase/
├── functions/                    # 기존 Edge Functions (AI매칭, 레드플래그 등)
└── migrations/                   # DB 마이그레이션
packages/
├── shared-types/                 # 공유 타입 정의
├── shared-utils/                 # Zod 검증, 유틸
└── supabase-client/              # Supabase 쿼리 함수
```

### 2.2 기술 스택 (기존 유지)

- **AI**: Google Gemini 2.5 Flash (Function Calling + Vision)
- **DB**: Supabase PostgreSQL 17 + PostGIS + pgvector
- **웹**: Next.js 15 (App Router) + Tailwind CSS v4
- **상태**: Zustand (클라이언트) + TanStack Query v5 (서버)
- **모노레포**: Turborepo + pnpm
- **디자인**: "The Curated Sanctuary" (DESIGN.md 참고)

### 2.3 코드 규칙 (기존 CLAUDE.md 준수)

- 공유 타입은 `@homecare/shared-types`에서 import
- DB 쿼리는 `@homecare/supabase-client`의 쿼리 함수 사용
- 유효성 검증은 `@homecare/shared-utils`의 Zod 스키마 사용
- Tailwind CSS v4 @theme 커스텀 프로퍼티 사용 (하드코딩 hex 금지)
- 모든 UI 텍스트는 한국어
- API 키, 시크릿은 환경변수 사용 (하드코딩 절대 금지)
- 라우팅: `/patient/...`, `/nurse/...` (절대 `/dashboard/...` 사용 금지)

---

## 3. 환자 AI 에이전트

### 3.1 핵심 기능 목록

#### F-01: 오늘 일정 안내
- 앱 실행 시 당일 방문 스케줄 자동 조회
- "어머님, 오늘 오후 2시에 박지현 간호사님이 오세요~" 형태로 안내
- 예정 시간 1시간 전 리마인드 알림

#### F-02: 컨디션 체크 (Proactive)
- 매일 아침(설정 가능) 에이전트가 먼저 시작
- 대화형 체크: "오늘 기분은 어떠세요?" → "어디 불편한 곳은 없으세요?" → "잠은 잘 주무셨어요?"
- 응답을 구조화하여 DB 저장 (condition_checks 테이블)
- 음성(STT) 또는 미리 정의된 버튼 선택 가능 (어르신 UX)

#### F-03: 식사 사진 영양 분석
- 에이전트가 식사 시간대(아침 7-9시, 점심 11-13시, 저녁 17-19시)에 촬영 유도
- "점심은 드셨어요? 뭐 드셨는지 사진 한 장 찍어주세요~"
- Gemini 2.5 Flash Vision으로 음식 인식 + 영양소 추정
- 근감소증 예방 관점으로 단백질 섭취 강조
- 부족 영양소에 대한 추가 섭취 권장: "단백질이 좀 부족해 보여요. 계란이나 두부를 좀 더 드시면 좋겠어요~"
- 분석 결과를 meal_logs 테이블에 저장

#### F-04: 복약지도 + 약 복용 알람 (완전 자동화)
- **처방 연동**: 병원에서 처방 입력 → prescriptions 테이블 → 복용 스케줄 자동 생성
- **복약지도**: 처방 입력 시 e약은요 API + DUR API 실시간 호출 → Gemini가 어르신 눈높이로 변환
  - "이 약은 밥 드시고 30분 뒤에 드세요"
  - "자몽이랑 같이 드시면 안 돼요"
- **알람 자동화 파이프라인**:
  1. 복용 시간 도달 → 푸시 알림 + 에이전트 음성 안내
  2. "어머님, 혈압약 드실 시간이에요~"
  3. 환자 복용 확인 응답 (음성 "먹었어" 또는 버튼)
  4. 미응답 30분 후 재알림
  5. 재알림에도 미응답 → 간호사에게 알림
- **처방 변경 자동 감지**: prescriptions 테이블 UPDATE 트리거 → 에이전트가 변경사항 안내
- **병용금기 체크**: 새 처방 입력 시 DUR API로 기존 처방약과 상호작용 자동 확인 → 위험 시 의사/간호사에게 알림

#### F-05: 이상징후 감지 → 레드플래그
- 컨디션 체크 응답 + 바이탈 데이터 + 식사 패턴 + 복약 이행률을 종합 분석
- Gemini가 이상징후 판단 시:
  1. 환자에게: "간호사 선생님한테 한번 여쭤볼게요~" (불안 최소화)
  2. 간호사에게: 구조화된 레드플래그 알림 (기존 red-flag 파이프라인 활용)
  3. 심각도 3단계: INFO(참고) / WARNING(주의) / CRITICAL(긴급)
- 오탐 방지: WARNING 이상만 간호사에게 푸시, INFO는 대시보드에만 표시

#### F-06: 음성 대화 (STT/TTS)
- STT: Web Speech API (기본) + Google Cloud STT (고정확도 옵션)
- TTS: Web Speech API speechSynthesis (기본) + Google Cloud TTS (자연스러운 음성 옵션)
- 한국어 지원 필수, 느린 발화 속도 대응
- 마이크 버튼 상시 노출 (어르신 접근성)
- TTS 재생 속도 조절 가능 (기본값: 0.85x — 어르신 대상 느린 속도)

### 3.2 환자 에이전트 프롬프트 설계

```
시스템 프롬프트 핵심 지침:
- 이름: "홈케어 도우미" (변경 가능)
- 페르소나: 다정하고 따뜻한 동네 간호사
- 호칭: "{환자이름} 어머님/아버님" (성별에 따라)
- 말투: 존댓말, 쉬운 한국어, 의학 용어 사용 금지
- 감정 공감: 불편 호소 시 공감 먼저, 정보 제공은 그 다음
- 답변 길이: 3문장 이내 (어르신 집중도 고려)
- 의료 판단 금지: "정확한 건 간호사 선생님한테 여쭤볼게요~" 패턴
- 복약 정보: 반드시 e약은요 API / DUR API 근거 기반, 없으면 "확인해볼게요"
```

---

## 4. 간호사 AI 에이전트

### 4.1 핵심 기능 목록

#### N-01: 오늘 일정 브리핑
- 앱 실행 시 당일 방문 스케줄 시간순 요약
- 이동 경로 순서 최적화 제안 (PostGIS 활용)
- 각 방문 예상 소요 시간 표시

#### N-02: 환자별 주의사항 요약
- 각 방문 환자의 최근 바이탈 트렌드 요약
  - "김영숙 어머님 — 혈압 3일 연속 140 초과, 저염식 확인 필요"
- 이전 방문 기록에서 미해결 이슈 표시
- 환자 에이전트가 수집한 오늘 아침 컨디션 체크 결과 반영
  - "오늘 아침 컨디션 체크에서 어지러움 호소"
- 환자 에이전트의 식사 분석 결과 반영
  - "최근 3일간 단백질 섭취 부족 패턴"

#### N-03: 필요 검사 안내
- 오늘 방문 환자별 예정된 검사 항목 리스트업
- 정기 검사 스케줄 자동 추적 (혈당 측정, 욕창 사정 등)
- 누락된 정기 검사 알림

#### N-04: 처방약 챙기기
- 방문 환자별 현재 처방약 목록 + 변경 사항 하이라이트
- 새로 추가된 약 / 용량 변경 / 중단된 약 명확 표시
- DUR 병용금기 주의사항 자동 포함
- 의사 소견에서 특이 지시사항 추출

#### N-05: 이동 중 음성 브리핑
- "다음 환자 알려줘" → 다음 방문 환자 정보 음성 브리핑
- 핸즈프리 사용 가능 (운전 중)
- STT/TTS 동일 기술 스택, 톤만 다름

#### N-06: 환자 에이전트 데이터 연동
- 환자 에이전트가 수집한 데이터를 간호사 브리핑에 실시간 반영
- 레드플래그 알림 수신 + 상세 컨텍스트 제공
- 복약 미이행 환자 목록 표시

### 4.2 간호사 에이전트 프롬프트 설계

```
시스템 프롬프트 핵심 지침:
- 이름: "홈케어 어시스턴트" (변경 가능)
- 페르소나: 간결하고 유능한 업무 비서
- 호칭: "{간호사이름}님"
- 말투: 존댓말이되 간결, 전문 용어 사용 가능
- 답변 구조: 핵심 먼저 → 상세는 요청 시
- 데이터 기반: 수치와 트렌드 중심 보고
- 판단 보조: "~가 권장됩니다" 형태, 최종 판단은 간호사에게
- 긴급 상황: 레드플래그 CRITICAL은 브리핑 최상단 배치
```

---

## 5. 데이터 아키텍처

### 5.1 공공 API 연동 (실시간 Function Calling)

#### e약은요 API (복약지도 메인 소스)
- **URL**: `http://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList`
- **제공 데이터**: 효능, 사용법, 주의사항(경고), 주의사항, 상호작용, 부작용, 보관법
- **조회 키**: 품목명(itemName) 또는 품목기준코드(itemSeq)
- **용도**: 처방 입력 시 해당 약의 복약지도 정보 조회 → Gemini가 어르신 눈높이로 변환
- **환경변수**: `DATA_GO_KR_API_KEY`

#### DUR 품목정보 API (약물 안전성)
- **URL**: `http://apis.data.go.kr/1471000/DURPrdlstInfoService03/`
- **엔드포인트**:
  - `getUsjntTabooInfoList03` — 병용금기
  - `getOdSnAtntInfoList03` — 노인주의
  - `getSpcifyAgrdeTabooInfoList03` — 특정연령대금기
  - `getCpctyAtntInfoList03` — 용량주의
  - `getMdctnPdAtntInfoList03` — 투여기간주의
  - `getEfcyDplctInfoList03` — 효능군중복
- **용도**: 처방 입력/변경 시 자동 안전성 체크, 에이전트 복약지도 시 주의사항 제공
- **환경변수**: `DATA_GO_KR_API_KEY` (동일 키)

#### 의약품 낱알식별 API (약 사진 식별)
- **URL**: `http://apis.data.go.kr/1471000/MdcinGrnIdntfcInfoService01/getMdcinGrnIdntfcInfoList01`
- **용도**: 어르신이 약 사진 촬영 시 → Gemini Vision + 낱알식별 API로 약 식별
- **환경변수**: `DATA_GO_KR_API_KEY` (동일 키)

### 5.2 RAG 벡터 DB (Supabase pgvector)

#### 테이블 구조

```sql
-- 환자 에이전트용 RAG: 질환 관리 가이드라인 (쉬운 한국어)
CREATE TABLE patient_agent_rag_diseases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,           -- 'hypertension', 'diabetes', 'dementia' 등
  question TEXT NOT NULL,           -- FAQ 질문
  answer TEXT NOT NULL,             -- FAQ 답변 (쉬운 한국어)
  source TEXT NOT NULL,             -- 출처 (PubMed ID, 학회 가이드라인명 등)
  source_type TEXT NOT NULL,        -- 'pubmed', 'guideline', 'manual'
  embedding vector(768),            -- Gemini text-embedding-004
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 환자 에이전트용 RAG: 응급상황/이상징후 대응
CREATE TABLE patient_agent_rag_emergency (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symptom TEXT NOT NULL,            -- 증상 키워드
  severity TEXT NOT NULL,           -- 'info', 'warning', 'critical'
  question TEXT NOT NULL,
  answer TEXT NOT NULL,             -- 어르신 대상 안내 (쉬운 한국어)
  nurse_instruction TEXT NOT NULL,  -- 간호사에게 전달할 임상 정보
  source TEXT NOT NULL,
  embedding vector(768),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 간호사 에이전트용 RAG: 임상 가이드라인 (전문 용어 포함)
CREATE TABLE nurse_agent_rag_clinical (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,             -- 임상 근거 + 수치 기준 포함
  source TEXT NOT NULL,
  source_type TEXT NOT NULL,
  embedding vector(768),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 간호사 에이전트용 RAG: 환자 사정(assessment) 기준
CREATE TABLE nurse_agent_rag_assessment (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_type TEXT NOT NULL,    -- 'vital_signs', 'wound', 'pain', 'nutrition' 등
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  criteria JSONB,                   -- 수치 기준 (예: {"systolic_high": 140})
  source TEXT NOT NULL,
  embedding vector(768),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### RAG 데이터 수집 우선순위

1단계 (MVP): 고혈압, 당뇨, 치매, 관절염, 낙상예방 — 어르신 다빈도 5대 질환
2단계: 심부전, 뇌졸중, COPD, 파킨슨, 우울증
3단계: 기타 만성질환 확장

#### RAG 데이터 파이프라인

```
[PubMed/가이드라인 PDF 수집]
  → [Gemini 2.5 Flash로 FAQ 변환 (환자용/간호사용 2벌)]
    → [Gemini text-embedding-004로 벡터화]
      → [Supabase pgvector INSERT]
```

- 환자용 FAQ 변환 프롬프트: "70대 어르신이 이해할 수 있는 쉬운 한국어로, 핵심만 3줄 이내로"
- 간호사용 FAQ 변환 프롬프트: "임상 근거와 수치 기준을 포함해서, 판단에 필요한 정보 중심으로"

### 5.3 추가 필요 DB 테이블

```sql
-- 처방 관리
CREATE TABLE prescriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES patients(id) NOT NULL,
  hospital_id UUID REFERENCES hospitals(id) NOT NULL,
  doctor_name TEXT,
  medication_name TEXT NOT NULL,         -- 약품명
  medication_code TEXT,                  -- 품목기준코드 (e약은요 API 키)
  dosage TEXT NOT NULL,                  -- 용량 (예: "1정")
  frequency TEXT NOT NULL,              -- 복용 빈도 (예: "1일 3회")
  timing TEXT NOT NULL,                 -- 복용 시점 (예: "식후 30분")
  duration_days INTEGER,                -- 처방 기간
  start_date DATE NOT NULL,
  end_date DATE,
  instructions TEXT,                    -- 의사 특이 지시사항
  dur_warnings JSONB DEFAULT '[]',      -- DUR API 조회 결과 저장
  easy_guide TEXT,                      -- e약은요 API → Gemini 변환 결과 (어르신용)
  status TEXT DEFAULT 'active',         -- 'active', 'completed', 'discontinued'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 복용 스케줄 (자동 생성)
CREATE TABLE medication_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prescription_id UUID REFERENCES prescriptions(id) NOT NULL,
  patient_id UUID REFERENCES patients(id) NOT NULL,
  scheduled_time TIME NOT NULL,         -- 복용 예정 시간
  scheduled_date DATE NOT NULL,
  status TEXT DEFAULT 'pending',        -- 'pending', 'taken', 'missed', 'skipped'
  taken_at TIMESTAMPTZ,                 -- 실제 복용 시간
  reminder_count INTEGER DEFAULT 0,     -- 알림 발송 횟수
  nurse_notified BOOLEAN DEFAULT false, -- 미복용 시 간호사 알림 여부
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 컨디션 체크 기록
CREATE TABLE condition_checks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES patients(id) NOT NULL,
  check_date DATE NOT NULL,
  mood TEXT,                            -- 'good', 'okay', 'bad'
  sleep_quality TEXT,                   -- 'good', 'okay', 'bad'
  pain_level INTEGER CHECK (pain_level BETWEEN 0 AND 10),
  pain_location TEXT,
  symptoms TEXT[],                      -- ['어지러움', '두통', '구역질']
  free_text TEXT,                       -- STT 원문 텍스트
  ai_summary TEXT,                      -- Gemini 요약
  ai_risk_level TEXT,                   -- 'normal', 'warning', 'critical'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 식사 기록 + 영양 분석
CREATE TABLE meal_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES patients(id) NOT NULL,
  meal_date DATE NOT NULL,
  meal_type TEXT NOT NULL,              -- 'breakfast', 'lunch', 'dinner', 'snack'
  photo_url TEXT,                       -- Supabase Storage URL
  ai_food_items JSONB DEFAULT '[]',     -- [{"name": "된장찌개", "amount": "1공기"}]
  ai_nutrition JSONB DEFAULT '{}',      -- {"calories": 450, "protein_g": 15, "carb_g": 60, "fat_g": 12}
  ai_feedback TEXT,                     -- Gemini 생성 피드백 (어르신용)
  protein_sufficient BOOLEAN,           -- 단백질 충분 여부
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 에이전트 대화 로그
CREATE TABLE agent_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,                -- 환자 또는 간호사
  agent_type TEXT NOT NULL,             -- 'patient_agent', 'nurse_agent'
  role TEXT NOT NULL,                   -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,
  input_method TEXT DEFAULT 'text',     -- 'text', 'stt', 'button'
  function_calls JSONB,                 -- Function Calling 로그
  rag_sources JSONB,                    -- 참조한 RAG 문서 ID 목록
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 5.4 인덱스

```sql
-- RAG 벡터 검색 인덱스
CREATE INDEX idx_patient_rag_diseases_embedding ON patient_agent_rag_diseases
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_patient_rag_emergency_embedding ON patient_agent_rag_emergency
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
CREATE INDEX idx_nurse_rag_clinical_embedding ON nurse_agent_rag_clinical
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_nurse_rag_assessment_embedding ON nurse_agent_rag_assessment
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

-- 복용 스케줄 조회 인덱스
CREATE INDEX idx_med_schedules_patient_date ON medication_schedules(patient_id, scheduled_date);
CREATE INDEX idx_med_schedules_status ON medication_schedules(status, scheduled_date);

-- 컨디션 체크 조회 인덱스
CREATE INDEX idx_condition_checks_patient_date ON condition_checks(patient_id, check_date);

-- 식사 기록 조회 인덱스
CREATE INDEX idx_meal_logs_patient_date ON meal_logs(patient_id, meal_date);

-- 대화 로그 인덱스
CREATE INDEX idx_agent_conversations_user ON agent_conversations(user_id, created_at DESC);
```

---

## 6. Supabase Edge Functions

### 6.1 새로 생성할 Edge Functions

```
supabase/functions/
├── agent-patient-chat/        # 환자 에이전트 대화 처리
├── agent-nurse-chat/          # 간호사 에이전트 대화 처리
├── agent-meal-analyze/        # 식사 사진 영양 분석
├── agent-medication-guide/    # 처방 입력 시 복약지도 생성
├── agent-medication-alarm/    # 복용 알람 트리거 (pg_cron 연동)
├── agent-condition-check/     # 컨디션 체크 분석 + 이상징후 판단
├── agent-nurse-briefing/      # 간호사 오늘 브리핑 생성
├── agent-dur-check/           # DUR 병용금기/노인주의 체크
├── rag-pipeline-ingest/       # RAG 데이터 수집 + FAQ 변환 + 임베딩
└── api-drug-info/             # 공공 API 프록시 (e약은요, DUR, 낱알식별)
```

### 6.2 핵심 Edge Function 상세

#### agent-patient-chat (환자 에이전트 메인)

```typescript
// 요청 구조
interface PatientAgentRequest {
  patient_id: string;
  message: string;              // 사용자 입력 (텍스트 또는 STT 변환 결과)
  input_method: 'text' | 'stt' | 'button';
  image_base64?: string;        // 식사/약 사진 (선택)
  context_type?: 'general' | 'condition_check' | 'meal' | 'medication';
}
```

**처리 흐름:**
1. 환자 정보 조회 (이름, 성별, 연령, 질환, 현재 처방약)
2. 최근 대화 이력 조회 (컨텍스트 유지, 최대 20턴)
3. context_type에 따라 Gemini Function Calling 도구 선택
4. RAG 검색 (질환 관련 질문인 경우)
5. Gemini 응답 생성 (시스템 프롬프트 + 환자 정보 + 대화 이력 + RAG 결과)
6. 이상징후 판단 (ai_risk_level 결정)
7. 대화 로그 저장
8. WARNING/CRITICAL 시 레드플래그 트리거

**Gemini Function Calling 도구 목록:**

```typescript
const patientAgentTools = [
  {
    name: "get_today_schedule",
    description: "오늘 방문 일정을 조회합니다",
    parameters: { patient_id: "string" }
  },
  {
    name: "get_medication_schedule",
    description: "오늘 복용할 약과 시간을 조회합니다",
    parameters: { patient_id: "string", date: "string" }
  },
  {
    name: "get_drug_info",
    description: "의약품의 효능, 사용법, 주의사항을 조회합니다 (e약은요 API)",
    parameters: { drug_name: "string" }
  },
  {
    name: "check_dur_interaction",
    description: "약물 병용금기 및 노인주의사항을 확인합니다 (DUR API)",
    parameters: { drug_codes: "string[]" }
  },
  {
    name: "record_condition_check",
    description: "컨디션 체크 결과를 기록합니다",
    parameters: { mood: "string", sleep: "string", pain_level: "number", symptoms: "string[]" }
  },
  {
    name: "analyze_meal_photo",
    description: "식사 사진을 분석하여 영양소를 추정합니다",
    parameters: { image_base64: "string", meal_type: "string" }
  },
  {
    name: "confirm_medication_taken",
    description: "약 복용 완료를 기록합니다",
    parameters: { schedule_id: "string" }
  },
  {
    name: "search_health_knowledge",
    description: "건강/질환 관련 지식을 RAG에서 검색합니다",
    parameters: { query: "string", category: "string" }
  },
  {
    name: "trigger_red_flag",
    description: "이상징후를 간호사에게 알립니다",
    parameters: { patient_id: "string", severity: "string", summary: "string", details: "object" }
  }
];
```

#### agent-nurse-chat (간호사 에이전트 메인)

```typescript
const nurseAgentTools = [
  {
    name: "get_today_briefing",
    description: "오늘 전체 방문 스케줄 + 환자별 요약을 생성합니다",
    parameters: { nurse_id: "string" }
  },
  {
    name: "get_patient_summary",
    description: "특정 환자의 최근 상태 요약 (바이탈 트렌드, 컨디션, 식사, 복약이행률)",
    parameters: { patient_id: "string", days: "number" }
  },
  {
    name: "get_patient_medications",
    description: "환자의 현재 처방약 목록 + 변경 이력",
    parameters: { patient_id: "string" }
  },
  {
    name: "get_pending_assessments",
    description: "오늘 방문 환자별 필요 검사/사정 항목",
    parameters: { nurse_id: "string", date: "string" }
  },
  {
    name: "get_red_flags",
    description: "담당 환자의 활성 레드플래그 목록",
    parameters: { nurse_id: "string" }
  },
  {
    name: "get_next_patient",
    description: "다음 방문 환자 정보 (이동 중 음성 브리핑용)",
    parameters: { nurse_id: "string" }
  },
  {
    name: "get_condition_check_results",
    description: "환자 에이전트가 수집한 오늘 컨디션 체크 결과",
    parameters: { patient_ids: "string[]" }
  },
  {
    name: "search_clinical_knowledge",
    description: "임상 가이드라인 RAG 검색",
    parameters: { query: "string", category: "string" }
  }
];
```

#### agent-medication-alarm (pg_cron 연동)

```sql
-- pg_cron 스케줄 (1분 간격 체크)
SELECT cron.schedule(
  'medication-alarm-check',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://hviqeyrnstgwumqiacwh.supabase.co/functions/v1/agent-medication-alarm',
    headers := '{"Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);
```

**알람 로직:**
1. 현재 시간 ± 5분 내 pending 상태 스케줄 조회
2. 해당 환자에게 푸시 알림 발송 (Expo Notifications)
3. reminder_count 증가
4. 30분 경과 후에도 pending이면 재알림
5. 60분 경과 후 pending이면 → status='missed', 간호사 알림

---

## 7. 프론트엔드 구현

### 7.1 환자 에이전트 UI

#### 파일 구조

```
apps/web/src/app/patient/agent/
├── page.tsx                      # 에이전트 메인 페이지
├── components/
│   ├── AgentChat.tsx             # 채팅 인터페이스 (기존 ai-consultation 확장)
│   ├── VoiceButton.tsx           # STT 마이크 버튼 (큰 사이즈, 어르신 접근성)
│   ├── TTSPlayer.tsx             # TTS 재생 컨트롤 (속도 조절)
│   ├── ConditionCheckCard.tsx    # 컨디션 체크 카드 (버튼 선택 + 음성)
│   ├── MealPhotoCapture.tsx      # 식사 사진 촬영 + 분석 결과
│   ├── MedicationReminder.tsx    # 복약 알림 카드 (복용 확인 버튼)
│   ├── ScheduleWidget.tsx        # 오늘 일정 위젯
│   └── QuickActions.tsx          # 빠른 액션 버튼 (어르신용 큰 버튼)
├── hooks/
│   ├── usePatientAgent.ts        # 에이전트 통신 훅
│   ├── useSpeechToText.ts        # STT 훅
│   ├── useTextToSpeech.ts        # TTS 훅
│   └── useMedicationAlarm.ts     # 복약 알람 상태 관리
└── stores/
    └── agentStore.ts             # Zustand 에이전트 상태
```

#### UI 원칙 (어르신 UX)

- **큰 터치 타겟**: 모든 버튼 최소 56px × 56px
- **큰 텍스트**: 본문 18px 이상, 중요 정보 22px 이상
- **높은 대비**: WCAG AAA 충족
- **마이크 버튼**: 화면 하단 우측에 항상 떠 있는 FAB (Floating Action Button), 64px
- **빠른 액션**: "오늘 일정", "약 먹을 시간", "몸이 안 좋아요" 3개 버튼 상시 노출
- **메시지 버블**: 에이전트 메시지에 스피커 아이콘 (누르면 TTS 재생)
- **디자인**: 기존 "The Curated Sanctuary" 디자인 시스템 준수
  - ContentNav 탭 레이아웃
  - glassmorphism 헤더
  - 큰 숫자 + Vitality Chip 패턴

### 7.2 간호사 에이전트 UI

#### 파일 구조

```
apps/web/src/app/nurse/agent/
├── page.tsx                      # 에이전트 메인 페이지
├── components/
│   ├── NurseBriefing.tsx         # 오늘 브리핑 카드
│   ├── PatientSummaryCard.tsx    # 환자별 요약 카드
│   ├── MedicationChecklist.tsx   # 처방약 체크리스트
│   ├── AssessmentChecklist.tsx   # 검사 항목 체크리스트
│   ├── RedFlagAlerts.tsx         # 레드플래그 알림 배너
│   ├── AgentChat.tsx             # 채팅 인터페이스
│   ├── VoiceButton.tsx           # STT 마이크 버튼
│   └── TTSPlayer.tsx             # TTS 재생
├── hooks/
│   ├── useNurseAgent.ts          # 에이전트 통신 훅
│   ├── useSpeechToText.ts        # STT 훅 (공유 가능)
│   └── useTextToSpeech.ts        # TTS 훅 (공유 가능)
└── stores/
    └── nurseAgentStore.ts        # Zustand 에이전트 상태
```

#### UI 원칙 (간호사 전문가 UX)

- **정보 밀도 높게**: 한 화면에 최대한 많은 정보
- **브리핑 모드**: 앱 실행 시 자동 오늘 브리핑 표시 (카드 스택)
- **음성 모드 토글**: 이동 중 음성 전용 모드 전환 가능
- **디자인**: ContentNav 탭 레이아웃 유지
- **레드플래그**: 상단 고정 배너 (CRITICAL은 빨간색 펄스 애니메이션)

### 7.3 공유 컴포넌트 (환자/간호사 공통)

```
apps/web/src/components/agent/
├── STTButton.tsx                 # Web Speech API STT 버튼
├── TTSEngine.tsx                 # TTS 엔진 (속도/음성 설정)
├── ChatBubble.tsx                # 채팅 버블 (에이전트/사용자)
├── FunctionCallIndicator.tsx     # API 호출 중 로딩 인디케이터
└── SourceCitation.tsx            # RAG 출처 표시 컴포넌트
```

---

## 8. 환경변수 추가

```env
# 공공데이터 포털 API 키 (data.go.kr)
DATA_GO_KR_API_KEY=

# Google Cloud STT (선택 - 고정확도)
GOOGLE_CLOUD_STT_API_KEY=

# Google Cloud TTS (선택 - 자연스러운 음성)
GOOGLE_CLOUD_TTS_API_KEY=

# 기존 환경변수 (유지)
# GEMINI_API_KEY=
# SUPABASE_URL=
# SUPABASE_ANON_KEY=
# SUPABASE_SERVICE_ROLE_KEY=
```

---

## 9. 구현 순서 (권장)

### Phase 1: 기반 구축 (1주차)
1. DB 마이그레이션 (새 테이블 6개 + 인덱스)
2. 공공 API 프록시 Edge Function (`api-drug-info`)
3. 공유 STT/TTS 컴포넌트
4. 에이전트 대화 로그 저장 구조

### Phase 2: 환자 에이전트 MVP (2주차)
1. `agent-patient-chat` Edge Function + Function Calling 도구
2. 환자 에이전트 UI (채팅 + 음성 + 빠른 액션)
3. 오늘 일정 안내 (F-01)
4. 컨디션 체크 (F-02)
5. STT/TTS 연동

### Phase 3: 복약 시스템 (3주차)
1. 처방 입력 UI (병원 페이지에 추가)
2. `agent-medication-guide` (e약은요 + DUR 연동)
3. `agent-medication-alarm` (pg_cron 알람)
4. 복약지도 + 알람 자동화 파이프라인 (F-04)

### Phase 4: 영양 분석 + 레드플래그 (4주차)
1. `agent-meal-analyze` (Gemini Vision)
2. 식사 사진 촬영 UI + 영양 분석 결과 표시 (F-03)
3. `agent-condition-check` (이상징후 판단)
4. 레드플래그 연동 (F-05)

### Phase 5: 간호사 에이전트 (5주차)
1. `agent-nurse-chat` Edge Function + Function Calling 도구
2. `agent-nurse-briefing` (오늘 브리핑)
3. 간호사 에이전트 UI (브리핑 + 채팅 + 음성)
4. 환자 에이전트 ↔ 간호사 에이전트 데이터 연동

### Phase 6: RAG 구축 (6주차)
1. `rag-pipeline-ingest` Edge Function
2. PubMed 논문 수집 + FAQ 변환 (5대 질환 우선)
3. 가이드라인 PDF 수집 + FAQ 변환
4. 벡터 DB 적재 + 검색 테스트

---

## 10. 테스트 시나리오

### 환자 에이전트 테스트

```
시나리오 1: 아침 컨디션 체크
1. 앱 열기 → "어머님 안녕하세요, 오늘 기분은 어떠세요?"
2. 음성: "오늘 좀 어지러워" → STT 인식 확인
3. "어디가 어지러우세요? 일어날 때요, 아니면 가만히 있어도요?"
4. 응답 분석 → ai_risk_level 판단 → 필요 시 레드플래그

시나리오 2: 복약 알림
1. 08:00 → "어머님, 혈압약 드실 시간이에요~"
2. 30분 미응답 → 재알림
3. 60분 미응답 → 간호사에게 알림

시나리오 3: 식사 분석
1. 12:00 → "점심은 드셨어요? 사진 한 장 찍어주세요~"
2. 사진 업로드 → Gemini Vision 분석
3. "된장찌개에 밥이네요~ 단백질이 좀 부족해 보여요. 계란이나 두부를 추가로 드시면 좋겠어요~"

시나리오 4: 병용금기 체크
1. 의사가 새 처방 입력
2. DUR API → 기존 약과 병용금기 발견
3. 의사에게 알림: "아스피린과 병용금기입니다"
4. 환자에게: 변경된 처방 안내
```

### 간호사 에이전트 테스트

```
시나리오 1: 아침 브리핑
1. 앱 열기 → 오늘 브리핑 자동 표시
2. "오늘 5명 방문 예정. 김영숙 어머님 혈압 주의, 박철수 어르신 욕창 재사정 필요"
3. 각 환자 카드 탭 → 상세 정보

시나리오 2: 이동 중 음성 브리핑
1. "다음 환자 알려줘"
2. TTS: "다음은 3시에 이순자 어머님입니다. 당뇨 관리 중이시고, 오늘 아침 혈당이 180으로 좀 높았어요. 인슐린 용량 확인 필요합니다."

시나리오 3: 레드플래그 수신
1. 환자 에이전트가 CRITICAL 레드플래그 전송
2. 간호사 앱 상단 빨간 배너: "김영숙 어머님 — 심한 어지러움 + 혈압 급등"
3. 탭 → 상세 컨텍스트 + 권장 조치
```

---

## 11. 주의사항

### 의료 면책
- 모든 에이전트 응답에 "정확한 의료 판단은 담당 의사/간호사의 지시를 따르세요" 면책 문구 포함
- 진단, 처방 변경 등 의료 행위에 해당하는 응답 생성 금지
- 복약지도는 반드시 e약은요 / DUR API 근거 기반, 근거 없으면 "확인이 필요합니다"

### 개인정보 보호
- 환자 의료 데이터는 RLS로 본인 + 담당 간호사 + 담당 병원만 접근 가능
- 에이전트 대화 로그는 본인 + 관리자만 조회
- 식사 사진은 Supabase Storage에 저장, 환자별 폴더 격리

### 성능
- Gemini API 호출은 Edge Function에서만 (클라이언트 직접 호출 금지)
- RAG 검색은 top_k=5, similarity_threshold=0.75
- 공공 API 응답은 24시간 캐싱 (약 정보는 자주 변하지 않음)
- 대화 이력은 최근 20턴만 컨텍스트에 포함

### 접근성 (어르신 대상)
- 모든 인터랙션은 음성 OR 큰 버튼으로 가능해야 함
- 텍스트 입력은 선택사항, 음성이 기본
- 에러 메시지도 쉬운 한국어로 ("잠시 문제가 생겼어요. 다시 말씀해주세요~")
- 네트워크 오류 시 오프라인 안내 ("인터넷이 잠깐 안 되네요. 잠시 후 다시 해볼게요~")
