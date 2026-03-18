-- 00003_create_rls_policies.sql
-- Row Level Security 정책

-- =====================================================
-- RLS 활성화
-- =====================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardian_patient_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.red_flag_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- profiles 정책
-- =====================================================
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 간호사/의사가 담당 환자의 보호자 프로필을 볼 수 있도록
CREATE POLICY "Staff can view related profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.user_id = auth.uid() AND s.is_active = TRUE
    )
  );

-- 플랫폼 관리자 전체 조회
CREATE POLICY "Platform admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'platform_admin'
    )
  );

-- =====================================================
-- patients 정책
-- =====================================================
CREATE POLICY "Guardians can view linked patients"
  ON public.patients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.guardian_patient_links
      WHERE patient_id = patients.id AND guardian_id = auth.uid()
    )
  );

CREATE POLICY "Guardians can insert patients"
  ON public.patients FOR INSERT
  WITH CHECK (primary_guardian_id = auth.uid());

CREATE POLICY "Guardians can update own patients"
  ON public.patients FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.guardian_patient_links
      WHERE patient_id = patients.id AND guardian_id = auth.uid() AND is_primary = TRUE
    )
  );

CREATE POLICY "Nurses can view assigned patients"
  ON public.patients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.visits v
      JOIN public.staff s ON s.id = v.nurse_id
      WHERE v.patient_id = patients.id
        AND s.user_id = auth.uid()
        AND v.status NOT IN ('cancelled')
    )
  );

CREATE POLICY "Org admins can view org patients"
  ON public.patients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.service_plans sp
      JOIN public.organizations o ON o.id = sp.org_id
      WHERE sp.patient_id = patients.id
        AND o.owner_id = auth.uid()
        AND sp.status = 'active'
    )
  );

CREATE POLICY "Platform admins can view all patients"
  ON public.patients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  );

-- =====================================================
-- guardian_patient_links 정책
-- =====================================================
CREATE POLICY "Guardians can view own links"
  ON public.guardian_patient_links FOR SELECT
  USING (guardian_id = auth.uid());

CREATE POLICY "Guardians can insert links"
  ON public.guardian_patient_links FOR INSERT
  WITH CHECK (guardian_id = auth.uid());

-- =====================================================
-- organizations 정책 (공개 조회 가능)
-- =====================================================
CREATE POLICY "Anyone can view verified organizations"
  ON public.organizations FOR SELECT
  USING (verification_status = 'verified');

CREATE POLICY "Org owners can view own org"
  ON public.organizations FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Org owners can update own org"
  ON public.organizations FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Platform admins can view all organizations"
  ON public.organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  );

CREATE POLICY "Platform admins can update all organizations"
  ON public.organizations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  );

-- =====================================================
-- staff 정책
-- =====================================================
CREATE POLICY "Staff can view own record"
  ON public.staff FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Org admins can manage staff"
  ON public.staff FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = staff.org_id AND o.owner_id = auth.uid()
    )
  );

-- =====================================================
-- service_requests 정책
-- =====================================================
CREATE POLICY "Guardians can view own requests"
  ON public.service_requests FOR SELECT
  USING (guardian_id = auth.uid());

CREATE POLICY "Guardians can insert requests"
  ON public.service_requests FOR INSERT
  WITH CHECK (guardian_id = auth.uid());

CREATE POLICY "Orgs can view sent requests"
  ON public.service_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = service_requests.selected_org_id AND o.owner_id = auth.uid()
    )
  );

-- =====================================================
-- visits 정책
-- =====================================================
CREATE POLICY "Nurses can view own visits"
  ON public.visits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.id = visits.nurse_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Nurses can update own visits"
  ON public.visits FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.id = visits.nurse_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Guardians can view patient visits"
  ON public.visits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.guardian_patient_links gpl
      WHERE gpl.patient_id = visits.patient_id AND gpl.guardian_id = auth.uid()
    )
  );

CREATE POLICY "Org admins can view org visits"
  ON public.visits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = visits.org_id AND o.owner_id = auth.uid()
    )
  );

-- =====================================================
-- visit_records 정책 (건강정보 — 가장 엄격)
-- =====================================================
CREATE POLICY "Nurses can insert own records"
  ON public.visit_records FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.id = visit_records.nurse_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Nurses can update own records"
  ON public.visit_records FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.id = visit_records.nurse_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Nurses can view own records"
  ON public.visit_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.id = visit_records.nurse_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Guardians can read patient records"
  ON public.visit_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.guardian_patient_links gpl
      WHERE gpl.patient_id = visit_records.patient_id
        AND gpl.guardian_id = auth.uid()
    )
  );

-- =====================================================
-- notifications 정책
-- =====================================================
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

-- =====================================================
-- messages 정책
-- =====================================================
CREATE POLICY "Users can view channel messages"
  ON public.messages FOR SELECT
  USING (sender_id = auth.uid() OR auth.uid() = ANY(read_by));

CREATE POLICY "Users can insert messages"
  ON public.messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- =====================================================
-- reviews 정책
-- =====================================================
CREATE POLICY "Anyone can view visible reviews"
  ON public.reviews FOR SELECT
  USING (is_visible = TRUE);

CREATE POLICY "Guardians can insert reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (guardian_id = auth.uid());

CREATE POLICY "Guardians can update own reviews"
  ON public.reviews FOR UPDATE
  USING (guardian_id = auth.uid());

-- =====================================================
-- push_tokens 정책
-- =====================================================
CREATE POLICY "Users can manage own push tokens"
  ON public.push_tokens FOR ALL
  USING (user_id = auth.uid());

-- =====================================================
-- audit_logs 정책
-- =====================================================
CREATE POLICY "Platform admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  );

CREATE POLICY "Users can view own audit logs"
  ON public.audit_logs FOR SELECT
  USING (user_id = auth.uid());
