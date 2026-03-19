import type { SupabaseClient } from '../client';
import type { TablesInsert, TablesUpdate } from '@homecare/shared-types';

/**
 * 서비스 계획 상세를 조회합니다.
 * @param client Supabase 클라이언트
 * @param planId 서비스 계획 ID
 */
export async function getServicePlan(client: SupabaseClient, planId: string) {
  const { data, error } = await client
    .from('service_plans')
    .select(
      `
      *,
      patient:patients (
        id,
        full_name,
        birth_date,
        gender,
        care_grade,
        primary_diagnosis,
        address
      ),
      nurse:staff!service_plans_nurse_id_fkey (
        id,
        staff_type,
        user:profiles (full_name, phone, avatar_url)
      ),
      organization:organizations!service_plans_org_id_fkey (
        id,
        name,
        phone
      )
    `,
    )
    .eq('id', planId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * 환자의 서비스 계획 목록을 조회합니다.
 * @param client Supabase 클라이언트
 * @param patientId 환자 ID
 */
export async function getServicePlansByPatient(
  client: SupabaseClient,
  patientId: string,
) {
  const { data, error } = await client
    .from('service_plans')
    .select(
      `
      *,
      nurse:staff!service_plans_nurse_id_fkey (
        id,
        user:profiles (full_name, avatar_url)
      ),
      organization:organizations!service_plans_org_id_fkey (
        id,
        name
      )
    `,
    )
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * 서비스 계획을 생성합니다.
 * @param client Supabase 클라이언트
 * @param plan 서비스 계획 데이터
 */
export async function createServicePlan(
  client: SupabaseClient,
  plan: TablesInsert<'service_plans'>,
) {
  const { data, error } = await client
    .from('service_plans')
    .insert(plan)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * 서비스 계획을 업데이트합니다.
 * @param client Supabase 클라이언트
 * @param planId 서비스 계획 ID
 * @param updates 업데이트할 필드
 */
export async function updateServicePlan(
  client: SupabaseClient,
  planId: string,
  updates: TablesUpdate<'service_plans'>,
) {
  const { data, error } = await client
    .from('service_plans')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', planId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * 보호자가 서비스 계획에 동의합니다.
 * @param client Supabase 클라이언트
 * @param planId 서비스 계획 ID
 * @param signatureUrl 서명 이미지 URL (선택)
 */
export async function consentServicePlan(
  client: SupabaseClient,
  planId: string,
  signatureUrl?: string,
) {
  const now = new Date().toISOString();
  const { data, error } = await client
    .from('service_plans')
    .update({
      guardian_consent: true,
      consented_at: now,
      consent_signature_url: signatureUrl ?? null,
      status: 'active',
      updated_at: now,
    })
    .eq('id', planId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
