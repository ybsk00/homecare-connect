import type { SupabaseClient } from '../client';
import type { TablesUpdate } from '@homecare/shared-types';

/**
 * AI 경과 리포트 상세를 조회합니다.
 * @param client Supabase 클라이언트
 * @param reportId 리포트 ID
 */
export async function getAIReport(client: SupabaseClient, reportId: string) {
  const { data, error } = await client
    .from('ai_reports')
    .select(
      `
      *,
      patient:patients!ai_reports_patient_id_fkey (
        id,
        full_name,
        birth_date,
        gender,
        care_grade,
        primary_diagnosis
      ),
      doctor:staff!ai_reports_doctor_id_fkey (
        id,
        user:profiles (full_name)
      ),
      organization:organizations!ai_reports_org_id_fkey (
        id,
        name
      )
    `,
    )
    .eq('id', reportId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * 환자의 AI 리포트 목록을 조회합니다.
 * @param client Supabase 클라이언트
 * @param patientId 환자 ID
 * @param limit 최대 조회 건수 (기본 10)
 */
export async function getAIReportsByPatient(
  client: SupabaseClient,
  patientId: string,
  limit = 10,
) {
  const { data, error } = await client
    .from('ai_reports')
    .select(
      `
      id,
      period_start,
      period_end,
      status,
      ai_summary,
      doctor_confirmed,
      sent_to_guardian,
      created_at
    `,
    )
    .eq('patient_id', patientId)
    .order('period_end', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

/**
 * 기관의 AI 리포트 목록을 조회합니다 (의사 검토 대기 포함).
 * @param client Supabase 클라이언트
 * @param orgId 기관 ID
 * @param status 상태 필터 (선택)
 */
export async function getAIReportsByOrg(
  client: SupabaseClient,
  orgId: string,
  status?: 'generating' | 'generated' | 'doctor_reviewed' | 'sent' | 'error',
) {
  let query = client
    .from('ai_reports')
    .select(
      `
      id,
      period_start,
      period_end,
      status,
      ai_summary,
      doctor_confirmed,
      sent_to_guardian,
      created_at,
      patient:patients!ai_reports_patient_id_fkey (
        id,
        full_name,
        care_grade
      )
    `,
    )
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

/**
 * 의사가 AI 리포트에 소견을 추가합니다.
 * @param client Supabase 클라이언트
 * @param reportId 리포트 ID
 * @param opinion 의사 소견 (상세)
 * @param opinionSimple 보호자용 쉬운 소견
 */
export async function addDoctorOpinion(
  client: SupabaseClient,
  reportId: string,
  opinion: string,
  opinionSimple: string,
) {
  const now = new Date().toISOString();
  const { data, error } = await client
    .from('ai_reports')
    .update({
      doctor_opinion: opinion,
      doctor_opinion_simple: opinionSimple,
      doctor_confirmed: true,
      doctor_confirmed_at: now,
      status: 'doctor_reviewed',
      updated_at: now,
    } satisfies TablesUpdate<'ai_reports'>)
    .eq('id', reportId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * 리포트를 보호자에게 발송 처리합니다.
 * @param client Supabase 클라이언트
 * @param reportId 리포트 ID
 */
export async function sendReportToGuardian(
  client: SupabaseClient,
  reportId: string,
) {
  const now = new Date().toISOString();
  const { data, error } = await client
    .from('ai_reports')
    .update({
      sent_to_guardian: true,
      sent_at: now,
      status: 'sent',
      updated_at: now,
    })
    .eq('id', reportId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
