import type { SupabaseClient } from '../client';

/**
 * 여러 환자의 최신 바이탈 데이터를 조회합니다.
 * 각 환자의 가장 최근 visit_record에서 바이탈을 가져옵니다.
 * @param client Supabase 클라이언트
 * @param patientIds 환자 ID 배열
 */
export async function getLatestVitalsByPatients(
  client: SupabaseClient,
  patientIds: string[],
) {
  const { data, error } = await client
    .from('visit_records')
    .select(
      `
      patient_id,
      vitals,
      created_at
    `,
    )
    .in('patient_id', patientIds)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // 환자별 최신 레코드만 추출
  const latestByPatient = new Map<string, (typeof data)[number]>();
  for (const record of data) {
    if (!latestByPatient.has(record.patient_id)) {
      latestByPatient.set(record.patient_id, record);
    }
  }

  return Array.from(latestByPatient.values());
}

/**
 * 서비스 계획의 케어 항목을 조회합니다.
 * @param client Supabase 클라이언트
 * @param planId 서비스 계획 ID
 */
export async function getServicePlanCareItems(
  client: SupabaseClient,
  planId: string,
) {
  const { data, error } = await client
    .from('service_plans')
    .select('id, care_items, goals, precautions')
    .eq('id', planId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * 간호사의 월별 방문 통계를 조회합니다.
 * @param client Supabase 클라이언트
 * @param nurseId 간호사(staff) ID
 * @param year 연도
 * @param month 월 (1-12)
 */
export async function getNurseMonthlyVisits(
  client: SupabaseClient,
  nurseId: string,
  year: number,
  month: number,
) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate =
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, '0')}-01`;

  const { data, error } = await client
    .from('visits')
    .select('id, scheduled_date, status, actual_duration_min')
    .eq('nurse_id', nurseId)
    .gte('scheduled_date', startDate)
    .lt('scheduled_date', endDate)
    .order('scheduled_date', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * 간호사에게 배정된 환자 목록을 조회합니다.
 * 활성 서비스 계획을 통해 연결된 환자를 가져옵니다.
 * @param client Supabase 클라이언트
 * @param nurseId 간호사(staff) ID
 */
export async function getPatientsByNurse(
  client: SupabaseClient,
  nurseId: string,
) {
  const { data, error } = await client
    .from('service_plans')
    .select(
      `
      id,
      visit_frequency,
      start_date,
      patient:patients (
        id,
        full_name,
        birth_date,
        gender,
        care_grade,
        mobility,
        primary_diagnosis,
        address,
        status
      )
    `,
    )
    .eq('nurse_id', nurseId)
    .eq('status', 'active');

  if (error) throw error;
  return data;
}
