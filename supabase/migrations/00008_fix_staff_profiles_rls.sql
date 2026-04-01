-- 기존 "Staff can view related profiles" 정책이 너무 넓음
-- 활성 스태프이면 모든 프로필을 조회할 수 있었음
-- 수정: 같은 기관 소속이거나, 담당 환자와 연결된 프로필만 조회 가능

DROP POLICY IF EXISTS "Staff can view related profiles" ON public.profiles;

CREATE POLICY "Staff can view related profiles"
  ON public.profiles FOR SELECT
  USING (
    -- 자기 자신의 프로필
    auth.uid() = id
    OR
    -- 같은 기관 소속 스태프의 프로필
    EXISTS (
      SELECT 1 FROM public.staff s1
      JOIN public.staff s2 ON s1.organization_id = s2.organization_id
      WHERE s1.user_id = auth.uid() AND s1.is_active = TRUE
        AND s2.user_id = profiles.id AND s2.is_active = TRUE
    )
    OR
    -- 담당 환자의 보호자 프로필
    EXISTS (
      SELECT 1 FROM public.staff s
      JOIN public.visits v ON v.nurse_id = s.id
      JOIN public.guardian_patient_links gpl ON gpl.patient_id = v.patient_id
      WHERE s.user_id = auth.uid() AND s.is_active = TRUE
        AND gpl.guardian_id = profiles.id
        AND v.status IN ('scheduled', 'in_progress', 'completed')
    )
    OR
    -- 플랫폼 관리자는 모든 프로필 조회 가능
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Rate limit 테이블 (에이전트 요청 제한용)
CREATE TABLE IF NOT EXISTS public.agent_rate_limits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  function_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 오래된 rate limit 레코드 자동 삭제 (5분 이상)
CREATE INDEX IF NOT EXISTS idx_agent_rate_limits_lookup
  ON public.agent_rate_limits (user_id, function_name, created_at DESC);

-- RLS 활성화
ALTER TABLE public.agent_rate_limits ENABLE ROW LEVEL SECURITY;

-- 서비스 롤만 접근 가능 (Edge Function에서 service_role_key 사용)
CREATE POLICY "Service role only"
  ON public.agent_rate_limits
  USING (false)
  WITH CHECK (false);
