-- 00002_create_tables.sql
-- 전체 테이블 스키마 생성

-- =====================================================
-- 1. 사용자 프로필 (Supabase Auth 연동)
-- =====================================================
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL CHECK (role IN ('guardian', 'nurse', 'doctor', 'org_admin', 'platform_admin')),
  full_name     TEXT NOT NULL,
  phone         TEXT NOT NULL,
  phone_verified BOOLEAN DEFAULT FALSE,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Auth 회원가입 시 자동 프로필 생성 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'guardian'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 2. 환자 정보
-- =====================================================
CREATE TABLE public.patients (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  primary_guardian_id UUID NOT NULL REFERENCES public.profiles(id),
  full_name         TEXT NOT NULL,
  birth_date        DATE NOT NULL,
  gender            TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  phone             TEXT,
  address           TEXT NOT NULL,
  address_detail    TEXT,
  location          GEOGRAPHY(POINT, 4326) NOT NULL,
  care_grade        TEXT CHECK (care_grade IN ('1', '2', '3', '4', '5', 'cognitive')),
  mobility          TEXT CHECK (mobility IN ('bedridden', 'wheelchair', 'walker', 'independent')),
  primary_diagnosis TEXT,
  medical_history   JSONB DEFAULT '[]',
  current_medications JSONB DEFAULT '[]',
  allergies         JSONB DEFAULT '[]',
  needed_services   TEXT[] NOT NULL DEFAULT '{}',
  preferred_time    TEXT CHECK (preferred_time IN ('morning', 'afternoon', 'any')),
  special_notes     TEXT,
  status            TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'discharged')),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_patients_location ON public.patients USING GIST (location);

-- =====================================================
-- 3. 보호자-환자 연결 (복수 보호자 지원)
-- =====================================================
CREATE TABLE public.guardian_patient_links (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guardian_id   UUID NOT NULL REFERENCES public.profiles(id),
  patient_id    UUID NOT NULL REFERENCES public.patients(id),
  relationship  TEXT NOT NULL,
  is_primary    BOOLEAN DEFAULT FALSE,
  notification_mode TEXT DEFAULT 'all'
                CHECK (notification_mode IN ('all', 'summary', 'alert_only')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (guardian_id, patient_id)
);

-- =====================================================
-- 4. 의료기관
-- =====================================================
CREATE TABLE public.organizations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id        UUID NOT NULL REFERENCES public.profiles(id),
  name            TEXT NOT NULL,
  business_number TEXT NOT NULL UNIQUE,
  license_number  TEXT,
  org_type        TEXT NOT NULL
                  CHECK (org_type IN ('home_nursing', 'home_care', 'rehab_center', 'clinic', 'hospital')),
  address         TEXT NOT NULL,
  address_detail  TEXT,
  location        GEOGRAPHY(POINT, 4326) NOT NULL,
  services        TEXT[] NOT NULL DEFAULT '{}',
  operating_hours JSONB,
  service_area_km NUMERIC DEFAULT 10,
  phone           TEXT NOT NULL,
  email           TEXT,
  website         TEXT,
  description     TEXT,
  logo_url        TEXT,
  photos          TEXT[] DEFAULT '{}',
  rating_avg      NUMERIC(2,1) DEFAULT 0,
  review_count    INTEGER DEFAULT 0,
  punctuality_rate NUMERIC(3,1) DEFAULT 0,
  response_avg_hours NUMERIC(4,1) DEFAULT 0,
  active_patient_count INTEGER DEFAULT 0,
  verification_status TEXT DEFAULT 'pending'
                      CHECK (verification_status IN ('pending', 'verified', 'rejected', 'suspended')),
  verified_at     TIMESTAMPTZ,
  subscription_plan TEXT DEFAULT 'free'
                    CHECK (subscription_plan IN ('free', 'basic', 'pro', 'enterprise')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_organizations_location ON public.organizations USING GIST (location);
CREATE INDEX idx_organizations_services ON public.organizations USING GIN (services);

-- =====================================================
-- 5. 의료진 (간호사, 의사 등)
-- =====================================================
CREATE TABLE public.staff (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id),
  org_id          UUID NOT NULL REFERENCES public.organizations(id),
  staff_type      TEXT NOT NULL CHECK (staff_type IN ('nurse', 'doctor', 'physio', 'caregiver')),
  license_number  TEXT,
  specialties     TEXT[] DEFAULT '{}',
  max_patients    INTEGER DEFAULT 15,
  current_patient_count INTEGER DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE,
  joined_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, org_id)
);

-- =====================================================
-- 6. 서비스 매칭 요청
-- =====================================================
CREATE TABLE public.service_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      UUID NOT NULL REFERENCES public.patients(id),
  guardian_id     UUID NOT NULL REFERENCES public.profiles(id),
  requested_services TEXT[] NOT NULL,
  preferred_time  TEXT,
  urgency         TEXT DEFAULT 'normal' CHECK (urgency IN ('normal', 'urgent')),
  notes           TEXT,
  matched_orgs    JSONB DEFAULT '[]',
  status          TEXT DEFAULT 'matching'
                  CHECK (status IN (
                    'matching', 'waiting_selection', 'sent_to_org',
                    'org_accepted', 'org_rejected', 'assessment_scheduled',
                    'service_started', 'cancelled', 'expired'
                  )),
  selected_org_id UUID REFERENCES public.organizations(id),
  assigned_nurse_id UUID REFERENCES public.staff(id),
  matched_at      TIMESTAMPTZ,
  selected_at     TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,
  responded_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 7. 서비스 계획서
-- =====================================================
CREATE TABLE public.service_plans (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id      UUID NOT NULL REFERENCES public.service_requests(id),
  patient_id      UUID NOT NULL REFERENCES public.patients(id),
  org_id          UUID NOT NULL REFERENCES public.organizations(id),
  nurse_id        UUID NOT NULL REFERENCES public.staff(id),
  visit_frequency TEXT NOT NULL,
  visit_day_of_week INTEGER[] DEFAULT '{}'::INTEGER[],
  visit_time_slot TEXT,
  care_items      JSONB NOT NULL,
  goals           TEXT,
  precautions     TEXT,
  guardian_consent BOOLEAN DEFAULT FALSE,
  consented_at    TIMESTAMPTZ,
  consent_signature_url TEXT,
  status          TEXT DEFAULT 'draft'
                  CHECK (status IN ('draft', 'pending_consent', 'active', 'modified', 'terminated')),
  start_date      DATE,
  end_date        DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 8. 방문 스케줄
-- =====================================================
CREATE TABLE public.visits (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id         UUID NOT NULL REFERENCES public.service_plans(id),
  patient_id      UUID NOT NULL REFERENCES public.patients(id),
  org_id          UUID NOT NULL REFERENCES public.organizations(id),
  nurse_id        UUID NOT NULL REFERENCES public.staff(id),
  scheduled_date  DATE NOT NULL,
  scheduled_time  TIME,
  visit_order     INTEGER,
  estimated_duration_min INTEGER DEFAULT 60,
  status          TEXT DEFAULT 'scheduled'
                  CHECK (status IN (
                    'scheduled', 'en_route', 'checked_in', 'in_progress',
                    'checked_out', 'completed', 'cancelled', 'no_show'
                  )),
  checkin_at      TIMESTAMPTZ,
  checkin_location GEOGRAPHY(POINT, 4326),
  checkout_at     TIMESTAMPTZ,
  checkout_location GEOGRAPHY(POINT, 4326),
  actual_duration_min INTEGER,
  cancel_reason   TEXT,
  reschedule_from UUID REFERENCES public.visits(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_visits_nurse_date ON public.visits (nurse_id, scheduled_date);
CREATE INDEX idx_visits_patient_date ON public.visits (patient_id, scheduled_date);
CREATE INDEX idx_visits_org_date ON public.visits (org_id, scheduled_date);

-- =====================================================
-- 9. 방문 기록 (간호사가 입력)
-- =====================================================
CREATE TABLE public.visit_records (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visit_id        UUID NOT NULL UNIQUE REFERENCES public.visits(id),
  nurse_id        UUID NOT NULL REFERENCES public.staff(id),
  patient_id      UUID NOT NULL REFERENCES public.patients(id),
  vitals          JSONB NOT NULL DEFAULT '{}',
  performed_items JSONB NOT NULL DEFAULT '[]',
  general_condition TEXT,
  consciousness     TEXT,
  skin_condition    TEXT,
  nutrition_intake  TEXT,
  pain_score        INTEGER CHECK (pain_score BETWEEN 0 AND 10),
  mood              TEXT,
  nurse_note        TEXT,
  voice_memo_url    TEXT,
  voice_memo_text   TEXT,
  photos            TEXT[] DEFAULT '{}',
  message_to_guardian TEXT,
  recorded_offline  BOOLEAN DEFAULT FALSE,
  synced_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 10. 레드플래그 알림
-- =====================================================
CREATE TABLE public.red_flag_alerts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visit_record_id UUID NOT NULL REFERENCES public.visit_records(id),
  patient_id      UUID NOT NULL REFERENCES public.patients(id),
  nurse_id        UUID REFERENCES public.staff(id),
  org_id          UUID NOT NULL REFERENCES public.organizations(id),
  severity        TEXT NOT NULL CHECK (severity IN ('yellow', 'orange', 'red')),
  category        TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  ai_analysis     TEXT,
  related_vitals  JSONB,
  trend_data      JSONB,
  status          TEXT DEFAULT 'active'
                  CHECK (status IN ('active', 'acknowledged', 'resolved', 'false_positive')),
  acknowledged_by UUID REFERENCES public.profiles(id),
  acknowledged_at TIMESTAMPTZ,
  resolution_note TEXT,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_red_flags_patient ON public.red_flag_alerts (patient_id, created_at DESC);
CREATE INDEX idx_red_flags_severity ON public.red_flag_alerts (severity, status);

-- =====================================================
-- 11. AI 경과 리포트
-- =====================================================
CREATE TABLE public.ai_reports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      UUID NOT NULL REFERENCES public.patients(id),
  org_id          UUID NOT NULL REFERENCES public.organizations(id),
  doctor_id       UUID REFERENCES public.staff(id),
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  patient_summary TEXT,
  vitals_analysis JSONB,
  vitals_chart_data JSONB,
  key_events      JSONB DEFAULT '[]',
  nursing_summary JSONB,
  medication_adherence JSONB,
  red_flag_history JSONB DEFAULT '[]',
  ai_summary      TEXT,
  doctor_opinion  TEXT,
  doctor_opinion_simple TEXT,
  doctor_confirmed BOOLEAN DEFAULT FALSE,
  doctor_confirmed_at TIMESTAMPTZ,
  sent_to_guardian BOOLEAN DEFAULT FALSE,
  sent_at         TIMESTAMPTZ,
  status          TEXT DEFAULT 'generated'
                  CHECK (status IN ('generating', 'generated', 'doctor_reviewed', 'sent', 'error')),
  doctor_visit_date DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 12. 알림
-- =====================================================
CREATE TABLE public.notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id),
  type            TEXT NOT NULL,
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  data            JSONB DEFAULT '{}',
  channels        TEXT[] DEFAULT '{in_app}',
  read            BOOLEAN DEFAULT FALSE,
  read_at         TIMESTAMPTZ,
  push_sent       BOOLEAN DEFAULT FALSE,
  kakao_sent      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON public.notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications (user_id) WHERE read = FALSE;

-- =====================================================
-- 13. 인앱 메시지 (보호자 <-> 기관)
-- =====================================================
CREATE TABLE public.messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id      UUID NOT NULL,
  sender_id       UUID NOT NULL REFERENCES public.profiles(id),
  sender_role     TEXT NOT NULL,
  content         TEXT NOT NULL,
  attachments     TEXT[] DEFAULT '{}',
  read_by         UUID[] DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_channel ON public.messages (channel_id, created_at DESC);

-- =====================================================
-- 14. 리뷰/평점
-- =====================================================
CREATE TABLE public.reviews (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES public.organizations(id),
  guardian_id     UUID NOT NULL REFERENCES public.profiles(id),
  patient_id      UUID NOT NULL REFERENCES public.patients(id),
  rating          INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  content         TEXT,
  rating_quality  INTEGER CHECK (rating_quality BETWEEN 1 AND 5),
  rating_punctuality INTEGER CHECK (rating_punctuality BETWEEN 1 AND 5),
  rating_communication INTEGER CHECK (rating_communication BETWEEN 1 AND 5),
  rating_kindness INTEGER CHECK (rating_kindness BETWEEN 1 AND 5),
  is_visible      BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (guardian_id, patient_id, org_id)
);

-- =====================================================
-- 15. SaaS 구독
-- =====================================================
CREATE TABLE public.subscriptions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES public.organizations(id),
  plan            TEXT NOT NULL CHECK (plan IN ('free', 'basic', 'pro', 'enterprise')),
  status          TEXT DEFAULT 'active'
                  CHECK (status IN ('active', 'past_due', 'cancelled', 'trial')),
  toss_billing_key TEXT,
  toss_customer_key TEXT,
  billing_cycle   TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  amount          INTEGER NOT NULL DEFAULT 0,
  next_billing_date DATE,
  trial_ends_at   TIMESTAMPTZ,
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 16. 결제 이력
-- =====================================================
CREATE TABLE public.payment_history (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id),
  org_id          UUID NOT NULL REFERENCES public.organizations(id),
  amount          INTEGER NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('paid', 'failed', 'refunded')),
  toss_payment_key TEXT,
  toss_order_id   TEXT,
  paid_at         TIMESTAMPTZ,
  receipt_url     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 17. 광고
-- =====================================================
CREATE TABLE public.advertisements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES public.organizations(id),
  ad_type         TEXT NOT NULL CHECK (ad_type IN ('search_top', 'profile_boost', 'area_exclusive')),
  target_area     TEXT,
  content         JSONB,
  review_status   TEXT DEFAULT 'pending'
                  CHECK (review_status IN ('pending', 'approved', 'rejected')),
  reviewed_at     TIMESTAMPTZ,
  start_date      DATE,
  end_date        DATE,
  monthly_fee     INTEGER,
  is_active       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 18. RAG 문서 임베딩 (챗봇용)
-- =====================================================
CREATE TABLE public.rag_documents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT NOT NULL,
  source          TEXT NOT NULL,
  content         TEXT NOT NULL,
  chunk_index     INTEGER DEFAULT 0,
  embedding       vector(1536),
  metadata        JSONB DEFAULT '{}',
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rag_embedding ON public.rag_documents
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- =====================================================
-- 19. 푸시 토큰 관리
-- =====================================================
CREATE TABLE public.push_tokens (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id),
  expo_push_token TEXT NOT NULL,
  device_type     TEXT CHECK (device_type IN ('ios', 'android')),
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, expo_push_token)
);

-- =====================================================
-- 20. 감사 로그 (개인정보보호법 준수)
-- =====================================================
CREATE TABLE public.audit_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id),
  action          TEXT NOT NULL,
  resource_type   TEXT NOT NULL,
  resource_id     UUID,
  ip_address      INET,
  user_agent      TEXT,
  details         JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON public.audit_logs (user_id, created_at DESC);
CREATE INDEX idx_audit_resource ON public.audit_logs (resource_type, resource_id);
