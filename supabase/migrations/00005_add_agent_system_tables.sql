-- 00005_add_agent_system_tables.sql
-- AI 에이전트 시스템 테이블 + RAG 테이블 + RLS 정책

-- =====================================================
-- AI 에이전트 시스템 테이블
-- =====================================================

-- 1. 처방 관리
CREATE TABLE public.prescriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.patients(id) NOT NULL,
  organization_id UUID REFERENCES public.organizations(id),
  doctor_name TEXT,
  medication_name TEXT NOT NULL,
  medication_code TEXT,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  timing TEXT NOT NULL,
  duration_days INTEGER,
  start_date DATE NOT NULL,
  end_date DATE,
  instructions TEXT,
  dur_warnings JSONB DEFAULT '[]',
  easy_guide TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'discontinued')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 복용 스케줄 (자동 생성)
CREATE TABLE public.medication_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES public.patients(id) NOT NULL,
  scheduled_time TIME NOT NULL,
  scheduled_date DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'taken', 'missed', 'skipped')),
  taken_at TIMESTAMPTZ,
  reminder_count INTEGER DEFAULT 0,
  nurse_notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 컨디션 체크 기록
CREATE TABLE public.condition_checks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.patients(id) NOT NULL,
  check_date DATE NOT NULL,
  mood TEXT CHECK (mood IN ('good', 'okay', 'bad')),
  sleep_quality TEXT CHECK (sleep_quality IN ('good', 'okay', 'bad')),
  pain_level INTEGER CHECK (pain_level BETWEEN 0 AND 10),
  pain_location TEXT,
  symptoms TEXT[],
  free_text TEXT,
  ai_summary TEXT,
  ai_risk_level TEXT CHECK (ai_risk_level IN ('normal', 'warning', 'critical')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 식사 기록 + 영양 분석
CREATE TABLE public.meal_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.patients(id) NOT NULL,
  meal_date DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  photo_url TEXT,
  ai_food_items JSONB DEFAULT '[]',
  ai_nutrition JSONB DEFAULT '{}',
  ai_feedback TEXT,
  protein_sufficient BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 에이전트 대화 로그
CREATE TABLE public.agent_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('patient_agent', 'nurse_agent')),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  input_method TEXT DEFAULT 'text' CHECK (input_method IN ('text', 'stt', 'button')),
  function_calls JSONB,
  rag_sources JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 환자 에이전트 RAG: 질환 관리 가이드라인
CREATE TABLE public.patient_agent_rag_diseases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  source TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('pubmed', 'guideline', 'manual')),
  embedding vector(768),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 환자 에이전트 RAG: 응급상황/이상징후 대응
CREATE TABLE public.patient_agent_rag_emergency (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symptom TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  nurse_instruction TEXT NOT NULL,
  source TEXT NOT NULL,
  embedding vector(768),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. 간호사 에이전트 RAG: 임상 가이드라인
CREATE TABLE public.nurse_agent_rag_clinical (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  source TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('pubmed', 'guideline', 'manual')),
  embedding vector(768),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. 간호사 에이전트 RAG: 환자 사정 기준
CREATE TABLE public.nurse_agent_rag_assessment (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_type TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  criteria JSONB,
  source TEXT NOT NULL,
  embedding vector(768),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 인덱스
-- =====================================================

CREATE INDEX idx_prescriptions_patient ON public.prescriptions(patient_id, status);
CREATE INDEX idx_prescriptions_org ON public.prescriptions(organization_id);
CREATE INDEX idx_med_schedules_patient_date ON public.medication_schedules(patient_id, scheduled_date);
CREATE INDEX idx_med_schedules_status ON public.medication_schedules(status, scheduled_date);
CREATE INDEX idx_med_schedules_prescription ON public.medication_schedules(prescription_id);
CREATE INDEX idx_condition_checks_patient_date ON public.condition_checks(patient_id, check_date);
CREATE INDEX idx_meal_logs_patient_date ON public.meal_logs(patient_id, meal_date);
CREATE INDEX idx_agent_conversations_user ON public.agent_conversations(user_id, created_at DESC);
CREATE INDEX idx_agent_conversations_type ON public.agent_conversations(agent_type, user_id);

-- RAG 벡터 검색 인덱스
CREATE INDEX idx_patient_rag_diseases_embedding ON public.patient_agent_rag_diseases
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_patient_rag_emergency_embedding ON public.patient_agent_rag_emergency
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
CREATE INDEX idx_nurse_rag_clinical_embedding ON public.nurse_agent_rag_clinical
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_nurse_rag_assessment_embedding ON public.nurse_agent_rag_assessment
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

-- RAG 카테고리 조회
CREATE INDEX idx_patient_rag_diseases_category ON public.patient_agent_rag_diseases(category);
CREATE INDEX idx_patient_rag_emergency_severity ON public.patient_agent_rag_emergency(severity);
CREATE INDEX idx_nurse_rag_clinical_category ON public.nurse_agent_rag_clinical(category);
CREATE INDEX idx_nurse_rag_assessment_type ON public.nurse_agent_rag_assessment(assessment_type);

-- =====================================================
-- RLS 정책
-- =====================================================

ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condition_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_agent_rag_diseases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_agent_rag_emergency ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nurse_agent_rag_clinical ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nurse_agent_rag_assessment ENABLE ROW LEVEL SECURITY;

-- 처방
CREATE POLICY "prescriptions_select" ON public.prescriptions FOR SELECT USING (true);
CREATE POLICY "prescriptions_insert" ON public.prescriptions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.staff WHERE user_id = auth.uid() AND organization_id = prescriptions.organization_id)
);
CREATE POLICY "prescriptions_update" ON public.prescriptions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.staff WHERE user_id = auth.uid() AND organization_id = prescriptions.organization_id)
);

-- 복용 스케줄
CREATE POLICY "med_schedules_select" ON public.medication_schedules FOR SELECT USING (true);
CREATE POLICY "med_schedules_update" ON public.medication_schedules FOR UPDATE USING (true);

-- 컨디션 체크
CREATE POLICY "condition_checks_select" ON public.condition_checks FOR SELECT USING (true);
CREATE POLICY "condition_checks_insert" ON public.condition_checks FOR INSERT WITH CHECK (true);

-- 식사 기록
CREATE POLICY "meal_logs_select" ON public.meal_logs FOR SELECT USING (true);
CREATE POLICY "meal_logs_insert" ON public.meal_logs FOR INSERT WITH CHECK (true);

-- 대화 로그 (본인만)
CREATE POLICY "agent_conversations_select" ON public.agent_conversations FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "agent_conversations_insert" ON public.agent_conversations FOR INSERT WITH CHECK (user_id = auth.uid());

-- RAG (읽기: 전체, 쓰기: 관리자만)
CREATE POLICY "rag_diseases_select" ON public.patient_agent_rag_diseases FOR SELECT USING (true);
CREATE POLICY "rag_emergency_select" ON public.patient_agent_rag_emergency FOR SELECT USING (true);
CREATE POLICY "rag_clinical_select" ON public.nurse_agent_rag_clinical FOR SELECT USING (true);
CREATE POLICY "rag_assessment_select" ON public.nurse_agent_rag_assessment FOR SELECT USING (true);

CREATE POLICY "rag_diseases_insert" ON public.patient_agent_rag_diseases FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'platform_admin')
);
CREATE POLICY "rag_emergency_insert" ON public.patient_agent_rag_emergency FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'platform_admin')
);
CREATE POLICY "rag_clinical_insert" ON public.nurse_agent_rag_clinical FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'platform_admin')
);
CREATE POLICY "rag_assessment_insert" ON public.nurse_agent_rag_assessment FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'platform_admin')
);
