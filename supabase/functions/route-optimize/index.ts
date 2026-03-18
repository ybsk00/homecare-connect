// 간호사 일일 방문 동선 최적화
// Nearest-Neighbor TSP 근사 알고리즘으로 최적 방문 순서를 계산합니다.
// Input: { nurse_id: string, date: string, start_location: { lat: number, lng: number } }
//
// 처리 흐름:
// 1. 간호사의 해당일 방문 일정 조회
// 2. 환자 위치 정보 조회
// 3. Nearest-Neighbor TSP로 방문 순서 최적화
// 4. (선택) Kakao Mobility API로 실제 이동시간 조회
// 5. visits 테이블의 visit_order 업데이트
// 6. 최적화된 순서와 ETA 반환

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 좌표 타입
interface Location {
  lat: number;
  lng: number;
}

// 방문 + 환자 위치 정보
interface VisitWithLocation {
  visit_id: string;
  patient_id: string;
  patient_name: string;
  location: Location;
  estimated_duration_min: number;
  scheduled_time: string | null;
}

// Haversine 공식으로 두 좌표 간 거리(km) 계산
function haversineDistance(a: Location, b: Location): number {
  const R = 6371; // 지구 반경 (km)
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const aVal =
    sinDLat * sinDLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
  return R * c;
}

// 거리 기반 이동시간 추정 (도시 내 평균 속도 25km/h 가정)
function estimateTravelMinutes(distanceKm: number): number {
  const avgSpeedKmH = 25;
  return Math.round((distanceKm / avgSpeedKmH) * 60);
}

// WKT POINT 문자열에서 좌표 추출: "POINT(lng lat)" -> { lat, lng }
function parsePointWKT(wkt: string): Location | null {
  const match = wkt.match(/POINT\(([^ ]+) ([^)]+)\)/);
  if (!match) return null;
  return { lng: parseFloat(match[1]), lat: parseFloat(match[2]) };
}

// Nearest-Neighbor TSP 알고리즘
function nearestNeighborTSP(
  start: Location,
  visits: VisitWithLocation[],
): VisitWithLocation[] {
  if (visits.length <= 1) return [...visits];

  const unvisited = [...visits];
  const ordered: VisitWithLocation[] = [];
  let current = start;

  while (unvisited.length > 0) {
    // 현재 위치에서 가장 가까운 미방문 환자 찾기
    let nearestIdx = 0;
    let nearestDist = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const dist = haversineDistance(current, unvisited[i].location);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }

    const nearest = unvisited.splice(nearestIdx, 1)[0];
    ordered.push(nearest);
    current = nearest.location;
  }

  return ordered;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 인증 확인
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ code: 'UNAUTHORIZED', message: '인증 토큰이 필요합니다.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 요청자 인증
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ code: 'UNAUTHORIZED', message: '유효하지 않은 인증 토큰입니다.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { nurse_id, date, start_location } = await req.json();

    if (!nurse_id || !date || !start_location) {
      return new Response(
        JSON.stringify({
          code: 'BAD_REQUEST',
          message: 'nurse_id, date, start_location은 필수입니다.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 1. 간호사의 해당일 방문 일정 조회
    const { data: visits, error: visitError } = await supabase
      .from('visits')
      .select(`
        id,
        patient_id,
        estimated_duration_min,
        scheduled_time,
        visit_order,
        patient:patients (
          full_name,
          location
        )
      `)
      .eq('nurse_id', nurse_id)
      .eq('scheduled_date', date)
      .in('status', ['scheduled', 'en_route'])
      .order('scheduled_time', { ascending: true });

    if (visitError) {
      console.error('방문 일정 조회 실패:', visitError);
      return new Response(
        JSON.stringify({ code: 'QUERY_FAILED', message: '방문 일정 조회에 실패했습니다.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!visits || visits.length === 0) {
      return new Response(
        JSON.stringify({
          optimized_order: [],
          total_travel_min: 0,
          saved_min: 0,
          message: '해당 날짜에 예정된 방문이 없습니다.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 2. 방문 데이터를 위치 정보와 결합
    const visitsWithLocation: VisitWithLocation[] = [];

    for (const visit of visits) {
      const patient = visit.patient as unknown as { full_name: string; location: string };
      if (!patient?.location) continue;

      const loc = parsePointWKT(patient.location);
      if (!loc) continue;

      visitsWithLocation.push({
        visit_id: visit.id,
        patient_id: visit.patient_id,
        patient_name: patient.full_name,
        location: loc,
        estimated_duration_min: visit.estimated_duration_min,
        scheduled_time: visit.scheduled_time,
      });
    }

    if (visitsWithLocation.length === 0) {
      return new Response(
        JSON.stringify({
          optimized_order: [],
          total_travel_min: 0,
          saved_min: 0,
          message: '위치 정보가 있는 방문이 없습니다.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 3. 최적화 전 총 이동시간 계산 (현재 순서 기반)
    let originalTotalTravel = 0;
    let prevLoc = start_location as Location;
    for (const v of visitsWithLocation) {
      originalTotalTravel += estimateTravelMinutes(haversineDistance(prevLoc, v.location));
      prevLoc = v.location;
    }

    // 4. Nearest-Neighbor TSP로 최적화
    const optimizedVisits = nearestNeighborTSP(start_location, visitsWithLocation);

    // 5. 최적화 후 이동시간 및 ETA 계산
    let optimizedTotalTravel = 0;
    let currentTime = new Date(`${date}T09:00:00+09:00`); // 기본 시작 시간: 오전 9시
    prevLoc = start_location as Location;

    const optimizedOrder = optimizedVisits.map((visit, idx) => {
      const travelMin = estimateTravelMinutes(haversineDistance(prevLoc, visit.location));
      optimizedTotalTravel += travelMin;

      // ETA 계산
      currentTime = new Date(currentTime.getTime() + travelMin * 60 * 1000);
      const eta = currentTime.toISOString();

      // 방문 시간 추가
      currentTime = new Date(currentTime.getTime() + visit.estimated_duration_min * 60 * 1000);

      prevLoc = visit.location;

      return {
        visit_id: visit.visit_id,
        patient_name: visit.patient_name,
        order: idx + 1,
        eta,
        travel_min: travelMin,
      };
    });

    const savedMin = originalTotalTravel - optimizedTotalTravel;

    // 6. visits 테이블의 visit_order 업데이트
    const updatePromises = optimizedOrder.map((item) =>
      supabase
        .from('visits')
        .update({ visit_order: item.order })
        .eq('id', item.visit_id),
    );

    await Promise.all(updatePromises);

    // 7. Kakao Mobility API로 실제 이동시간 보정 (선택)
    const kakaoApiKey = Deno.env.get('KAKAO_REST_API_KEY');
    if (kakaoApiKey && optimizedVisits.length >= 2) {
      try {
        // Kakao 길찾기 API 호출 (첫 번째 구간만 샘플)
        const origin = start_location as Location;
        const dest = optimizedVisits[0].location;

        const kakaoResponse = await fetch(
          `https://apis-navi.kakaomobility.com/v1/directions?origin=${origin.lng},${origin.lat}&destination=${dest.lng},${dest.lat}`,
          {
            headers: { Authorization: `KakaoAK ${kakaoApiKey}` },
          },
        );

        if (kakaoResponse.ok) {
          const kakaoData = await kakaoResponse.json();
          const realDuration = kakaoData.routes?.[0]?.summary?.duration;
          if (realDuration) {
            // 실제 이동시간으로 첫 구간 보정
            optimizedOrder[0].travel_min = Math.round(realDuration / 60);
          }
        }
      } catch (kakaoErr) {
        // Kakao API 실패는 비치명적 — 추정값 유지
        console.error('Kakao Mobility API 호출 실패 (비치명적):', kakaoErr);
      }
    }

    // 응답 반환
    return new Response(
      JSON.stringify({
        optimized_order: optimizedOrder,
        total_travel_min: optimizedTotalTravel,
        saved_min: Math.max(0, savedMin),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('동선 최적화 처리 중 예외:', err);
    return new Response(
      JSON.stringify({ code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
