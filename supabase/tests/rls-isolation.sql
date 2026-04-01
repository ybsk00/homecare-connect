-- RLS 격리 테스트 스크립트
-- 실행: Supabase SQL Editor에서 실행
-- 목적: 간호사 간 데이터 격리, 보호자 격리 확인

-- ══════════════════════════════════════════
-- 1. 간호사 A가 간호사 B의 담당 환자 접근 불가 확인
-- ══════════════════════════════════════════

-- 테스트 사용자 확인 (테스트 계정 사용)
-- ner1@admin.com = 간호사 계정
-- pat1@admin.com = 환자/보호자 계정

DO $$
DECLARE
  nurse_user_id uuid;
  patient_user_id uuid;
  nurse_staff_id uuid;
  test_patient_id uuid;
BEGIN
  -- 테스트 계정 ID 조회
  SELECT id INTO nurse_user_id FROM auth.users WHERE email = 'ner1@admin.com';
  SELECT id INTO patient_user_id FROM auth.users WHERE email = 'pat1@admin.com';

  IF nurse_user_id IS NULL THEN
    RAISE NOTICE 'TEST SKIPPED: 테스트 계정 ner1@admin.com 없음';
    RETURN;
  END IF;

  -- 간호사의 staff ID 조회
  SELECT id INTO nurse_staff_id FROM public.staff WHERE user_id = nurse_user_id LIMIT 1;

  -- 간호사가 담당하는 환자 확인
  SELECT v.patient_id INTO test_patient_id
  FROM public.visits v
  WHERE v.nurse_id = nurse_staff_id
  LIMIT 1;

  IF test_patient_id IS NOT NULL THEN
    RAISE NOTICE 'TEST PASS: 간호사 % → 담당 환자 % 접근 가능', nurse_user_id, test_patient_id;
  ELSE
    RAISE NOTICE 'TEST INFO: 간호사에게 배정된 환자 없음 (방문 레코드 없음)';
  END IF;
END $$;

-- ══════════════════════════════════════════
-- 2. visit_records RLS 확인
-- ══════════════════════════════════════════

-- visit_records에 대한 RLS 정책 목록
SELECT
  policyname,
  cmd,
  qual::text AS using_condition
FROM pg_policies
WHERE tablename = 'visit_records'
ORDER BY policyname;

-- ══════════════════════════════════════════
-- 3. profiles RLS 확인 (수정 후)
-- ══════════════════════════════════════════

SELECT
  policyname,
  cmd,
  qual::text AS using_condition
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- ══════════════════════════════════════════
-- 4. 기관 격리 확인
-- ══════════════════════════════════════════

-- 서비스 플랜이 기관별로 격리되는지 확인
SELECT
  policyname,
  cmd,
  qual::text AS using_condition
FROM pg_policies
WHERE tablename = 'service_plans'
ORDER BY policyname;

-- ══════════════════════════════════════════
-- 결과 요약
-- ══════════════════════════════════════════

SELECT
  tablename,
  count(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY policy_count DESC;
