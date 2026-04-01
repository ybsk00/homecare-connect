// AI 매칭 엔진
// 환자에게 적합한 의료기관을 찾아 추천 이유와 함께 반환합니다.
// Input: { patient_id: string, radius_km?: number }

import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { authenticateRequest, isAuthError } from '../_shared/auth.ts';
import { parseAndValidate, isValidationError, type FieldSchema } from '../_shared/validate.ts';

// 서비스 유형 한국어 매핑
const serviceLabels: Record<string, string> = {
  nursing: '방문간호',
  physio: '방문재활',
  bath: '방문목욕',
  care: '방문요양',
  doctor_visit: '의사방문',
};

// 개별 매칭 결과에 대한 한국어 추천 이유 생성
function generateReasons(match: {
  org_name: string;
  distance_km: number;
  travel_minutes: number;
  service_match_score: number;
  capacity_score: number;
  reputation_score: number;
  response_score: number;
  total_score: number;
}): string[] {
  const reasons: string[] = [];

  // 거리 기반 이유
  if (match.distance_km <= 2) {
    reasons.push(`환자 자택에서 ${match.distance_km.toFixed(1)}km로 매우 가까운 거리에 위치해 있습니다.`);
  } else if (match.distance_km <= 5) {
    reasons.push(`환자 자택에서 ${match.distance_km.toFixed(1)}km (약 ${match.travel_minutes}분) 거리에 위치해 있습니다.`);
  }

  // 서비스 적합도 기반 이유
  if (match.service_match_score >= 80) {
    reasons.push('요청하신 서비스를 모두 제공할 수 있는 기관입니다.');
  } else if (match.service_match_score >= 50) {
    reasons.push('요청하신 주요 서비스를 제공할 수 있는 기관입니다.');
  }

  // 수용 능력 기반 이유
  if (match.capacity_score >= 70) {
    reasons.push('현재 신규 환자를 충분히 받을 수 있는 여력이 있습니다.');
  }

  // 평판 기반 이유
  if (match.reputation_score >= 80) {
    reasons.push('이용자 평점이 높고 좋은 평가를 받고 있는 기관입니다.');
  } else if (match.reputation_score >= 60) {
    reasons.push('안정적인 서비스 평가를 받고 있는 기관입니다.');
  }

  // 응답 속도 기반 이유
  if (match.response_score >= 80) {
    reasons.push('매칭 요청에 대한 응답이 매우 빠른 기관입니다.');
  }

  // 이유가 없으면 기본 이유 추가
  if (reasons.length === 0) {
    reasons.push('종합 매칭 점수를 기반으로 추천된 기관입니다.');
  }

  return reasons;
}

const inputSchema: FieldSchema[] = [
  { name: 'patient_id', type: 'string', required: true },
  { name: 'radius_km', type: 'number', required: false, min: 0.1, max: 100 },
];

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // 인증
    const authResult = await authenticateRequest(req);
    if (isAuthError(authResult)) return authResult;
    const { user, supabase } = authResult;

    // 입력 검증
    const body = await parseAndValidate<{ patient_id: string; radius_km?: number }>(req, inputSchema);
    if (isValidationError(body)) return body;
    const { patient_id, radius_km } = body;

    // 환자 정보 확인
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id, full_name, needed_services, preferred_time')
      .eq('id', patient_id)
      .single();

    if (patientError || !patient) {
      return errorResponse('NOT_FOUND', '환자 정보를 찾을 수 없습니다.', 404);
    }

    // DB 함수를 호출하여 매칭 실행
    const { data: matchResults, error: matchError } = await supabase
      .rpc('find_matching_organizations', {
        p_patient_id: patient_id,
        p_radius_km: radius_km ?? 10,
      });

    if (matchError) {
      console.error('매칭 RPC 호출 실패:', matchError);
      return errorResponse('MATCHING_FAILED', '매칭 처리 중 오류가 발생했습니다.', 500);
    }

    // 결과가 없는 경우
    if (!matchResults || matchResults.length === 0) {
      // 빈 결과로 서비스 요청 생성
      const { data: request, error: reqError } = await supabase
        .from('service_requests')
        .insert({
          patient_id,
          guardian_id: user.id,
          requested_services: patient.needed_services || [],
          preferred_time: patient.preferred_time,
          status: 'matching',
          matched_orgs: [],
          matched_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      return jsonResponse({
        request_id: request?.id || null,
        matches: [],
        message: '현재 반경 내 매칭 가능한 기관이 없습니다. 반경을 늘려서 다시 시도해주세요.',
      });
    }

    // 각 매칭 결과에 추천 이유 추가
    const formattedMatches = matchResults.map((match: {
      org_id: string;
      org_name: string;
      distance_km: number;
      travel_minutes: number;
      service_match_score: number;
      capacity_score: number;
      reputation_score: number;
      response_score: number;
      total_score: number;
    }) => ({
      org_id: match.org_id,
      org_name: match.org_name,
      distance_km: match.distance_km,
      total_score: match.total_score,
      scores: {
        distance: Math.round(100 - match.distance_km * 5),
        service_match: match.service_match_score,
        capacity: match.capacity_score,
        reputation: match.reputation_score,
        response: match.response_score,
      },
      reasons: generateReasons(match),
    }));

    // 서비스 요청 레코드 생성 (매칭 결과 포함)
    const { data: serviceRequest, error: reqError } = await supabase
      .from('service_requests')
      .insert({
        patient_id,
        guardian_id: user.id,
        requested_services: patient.needed_services || [],
        preferred_time: patient.preferred_time,
        status: 'waiting_selection',
        matched_orgs: formattedMatches,
        matched_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(), // 72시간 후 만료
      })
      .select('id')
      .single();

    if (reqError) {
      console.error('서비스 요청 생성 실패:', reqError);
      return errorResponse('REQUEST_FAILED', '서비스 요청 생성에 실패했습니다.', 500);
    }

    // 성공 응답 반환
    return jsonResponse({
      request_id: serviceRequest.id,
      matches: formattedMatches,
    });
  } catch (err) {
    console.error('AI 매칭 처리 중 예외:', err);
    return errorResponse('INTERNAL_ERROR', '서버 오류가 발생했습니다.', 500);
  }
});
