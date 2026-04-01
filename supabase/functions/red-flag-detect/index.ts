// 레드플래그 탐지 엔진
// 방문 기록 생성 후 트리거되어 환자의 활력징후 이상을 감지합니다.
// Input: { visit_record_id: string }
//
// 판정 기준:
// RED (긴급): 수축기 혈압 >= 180 또는 <= 90, 낙상, 의식 변화
// ORANGE (주의): 5회 연속 고혈압, 인지 변화, 2주 내 체중 +-3kg
// YELLOW (관찰): 3회 연속 혈압 상승, 2회 연속 투약 누락, 영양 불량

import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { authenticateRequest, isAuthError } from '../_shared/auth.ts';
import { parseAndValidate, isValidationError, type FieldSchema } from '../_shared/validate.ts';

// 활력징후 타입
interface Vitals {
  systolic_bp?: number;
  diastolic_bp?: number;
  heart_rate?: number;
  temperature?: number;
  blood_sugar?: number;
  spo2?: number;
  weight?: number;
  respiration_rate?: number;
}

// 수행 항목 타입
interface PerformedItem {
  item: string;
  done: boolean;
  note?: string;
}

// 방문 기록 타입
interface VisitRecord {
  id: string;
  visit_id: string;
  nurse_id: string;
  patient_id: string;
  vitals: Vitals;
  performed_items: PerformedItem[];
  general_condition: string | null;
  consciousness: string | null;
  nutrition_intake: string | null;
  created_at: string;
}

// 탐지된 알림 정보
interface DetectedAlert {
  severity: 'yellow' | 'orange' | 'red';
  category: string;
  title: string;
  description: string;
  related_vitals: Vitals | null;
  trend_data: unknown | null;
}

const inputSchema: FieldSchema[] = [
  { name: 'visit_record_id', type: 'string', required: true },
];

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // 인증 확인
    const authResult = await authenticateRequest(req);
    if (isAuthError(authResult)) return authResult;
    const { supabase } = authResult;

    // 입력 검증
    const input = await parseAndValidate<{ visit_record_id: string }>(req, inputSchema);
    if (isValidationError(input)) return input;
    const { visit_record_id } = input;

    // 1. 현재 방문 기록 조회
    const { data: currentRecord, error: recordError } = await supabase
      .from('visit_records')
      .select('*')
      .eq('id', visit_record_id)
      .single();

    if (recordError || !currentRecord) {
      return errorResponse('NOT_FOUND', '방문 기록을 찾을 수 없습니다.', 404);
    }

    const record = currentRecord as VisitRecord;

    // 2. 해당 환자의 최근 10개 방문 기록 조회 (현재 기록 제외, 시간순)
    const { data: recentRecords } = await supabase
      .from('visit_records')
      .select('*')
      .eq('patient_id', record.patient_id)
      .neq('id', visit_record_id)
      .order('created_at', { ascending: false })
      .limit(10);

    const history = (recentRecords as VisitRecord[]) || [];

    // 3. 환자의 기관 ID 조회 (알림 저장용)
    const { data: visitData } = await supabase
      .from('visits')
      .select('org_id')
      .eq('id', record.visit_id)
      .single();

    const orgId = visitData?.org_id || '';

    // 4. 규칙 기반 레드플래그 검사
    const detectedAlerts: DetectedAlert[] = [];
    const vitals = record.vitals || {};

    // ===== RED (긴급) 판정 =====

    // 수축기 혈압 >= 180 (고혈압 위기)
    if (vitals.systolic_bp && vitals.systolic_bp >= 180) {
      detectedAlerts.push({
        severity: 'red',
        category: 'hypertensive_crisis',
        title: '고혈압 위기 감지',
        description: `수축기 혈압 ${vitals.systolic_bp}mmHg로 매우 높습니다. 즉시 의료진 확인이 필요합니다.`,
        related_vitals: vitals,
        trend_data: null,
      });
    }

    // 수축기 혈압 <= 90 (저혈압 위험)
    if (vitals.systolic_bp && vitals.systolic_bp <= 90) {
      detectedAlerts.push({
        severity: 'red',
        category: 'hypotension',
        title: '저혈압 위험 감지',
        description: `수축기 혈압 ${vitals.systolic_bp}mmHg로 위험 수준입니다. 즉시 의료진 확인이 필요합니다.`,
        related_vitals: vitals,
        trend_data: null,
      });
    }

    // 낙상 감지 (수행 항목에서 낙상 관련 기록 확인)
    const fallDetected = record.performed_items?.some(
      (item) => item.item.includes('낙상') && item.done,
    );
    if (fallDetected) {
      detectedAlerts.push({
        severity: 'red',
        category: 'fall',
        title: '낙상 발생',
        description: '환자에게 낙상이 발생했습니다. 즉시 신체 상태 확인 및 의료 조치가 필요합니다.',
        related_vitals: null,
        trend_data: null,
      });
    }

    // 의식 변화 감지
    if (record.consciousness) {
      const dangerousStates = ['혼미', '반혼수', '혼수', 'stupor', 'semicoma', 'coma'];
      const isConsciousnessAltered = dangerousStates.some(
        (state) => record.consciousness!.toLowerCase().includes(state),
      );
      if (isConsciousnessAltered) {
        detectedAlerts.push({
          severity: 'red',
          category: 'consciousness_change',
          title: '의식 상태 변화 감지',
          description: `환자의 의식 상태가 "${record.consciousness}"(으)로 확인되었습니다. 즉시 의료진 확인이 필요합니다.`,
          related_vitals: vitals,
          trend_data: null,
        });
      }
    }

    // ===== ORANGE (주의) 판정 =====

    // 5회 연속 고혈압 (수축기 >= 140)
    if (history.length >= 4 && vitals.systolic_bp && vitals.systolic_bp >= 140) {
      const lastFourHighBP = history.slice(0, 4).every(
        (r) => r.vitals?.systolic_bp && r.vitals.systolic_bp >= 140,
      );
      if (lastFourHighBP) {
        const bpTrend = [vitals.systolic_bp, ...history.slice(0, 4).map((r) => r.vitals?.systolic_bp)];
        detectedAlerts.push({
          severity: 'orange',
          category: 'sustained_hypertension',
          title: '지속적 고혈압 감지',
          description: `최근 5회 방문 연속으로 수축기 혈압이 140mmHg 이상입니다. 주치의 상담을 권장합니다.`,
          related_vitals: vitals,
          trend_data: { bp_trend: bpTrend },
        });
      }
    }

    // 인지 변화 감지 (일반 상태에서 인지 관련 키워드)
    if (record.general_condition) {
      const cognitiveKeywords = ['인지 저하', '혼란', '지남력 저하', '기억력 감퇴', '착란'];
      const hasCognitiveChange = cognitiveKeywords.some(
        (keyword) => record.general_condition!.includes(keyword),
      );
      if (hasCognitiveChange) {
        detectedAlerts.push({
          severity: 'orange',
          category: 'cognitive_change',
          title: '인지 기능 변화 감지',
          description: `환자의 일반 상태에서 인지 기능 변화가 보고되었습니다: "${record.general_condition}"`,
          related_vitals: null,
          trend_data: null,
        });
      }
    }

    // 2주 내 체중 +- 3kg 변화
    if (vitals.weight && history.length > 0) {
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const recentWithWeight = history.filter(
        (r) => r.vitals?.weight && r.created_at >= twoWeeksAgo,
      );
      if (recentWithWeight.length > 0) {
        const earliestWeight = recentWithWeight[recentWithWeight.length - 1].vitals.weight!;
        const weightDiff = Math.abs(vitals.weight - earliestWeight);
        if (weightDiff >= 3) {
          detectedAlerts.push({
            severity: 'orange',
            category: 'weight_change',
            title: '급격한 체중 변화 감지',
            description: `2주 내 체중이 ${weightDiff.toFixed(1)}kg ${vitals.weight > earliestWeight ? '증가' : '감소'}했습니다 (${earliestWeight}kg → ${vitals.weight}kg).`,
            related_vitals: vitals,
            trend_data: {
              weight_trend: [vitals.weight, ...recentWithWeight.map((r) => r.vitals.weight)],
            },
          });
        }
      }
    }

    // ===== YELLOW (관찰) 판정 =====

    // 3회 연속 혈압 상승
    if (history.length >= 2 && vitals.systolic_bp) {
      const prev1 = history[0]?.vitals?.systolic_bp;
      const prev2 = history[1]?.vitals?.systolic_bp;
      if (prev1 && prev2 && vitals.systolic_bp > prev1 && prev1 > prev2) {
        detectedAlerts.push({
          severity: 'yellow',
          category: 'bp_rising_trend',
          title: '혈압 상승 추세 감지',
          description: `3회 연속 혈압이 상승하고 있습니다 (${prev2} → ${prev1} → ${vitals.systolic_bp}mmHg). 추이 관찰이 필요합니다.`,
          related_vitals: vitals,
          trend_data: { bp_trend: [prev2, prev1, vitals.systolic_bp] },
        });
      }
    }

    // 2회 연속 투약 누락
    if (history.length >= 1) {
      const currentMedMissed = record.performed_items?.some(
        (item) => item.item.includes('투약') && !item.done,
      );
      const prevMedMissed = history[0]?.performed_items?.some(
        (item: PerformedItem) => item.item.includes('투약') && !item.done,
      );
      if (currentMedMissed && prevMedMissed) {
        detectedAlerts.push({
          severity: 'yellow',
          category: 'medication_miss',
          title: '연속 투약 누락 감지',
          description: '2회 연속 투약이 수행되지 않았습니다. 투약 관리 상태를 확인해주세요.',
          related_vitals: null,
          trend_data: null,
        });
      }
    }

    // 영양 불량 감지
    if (record.nutrition_intake) {
      const poorNutritionKeywords = ['거의 못 먹음', '식사 거부', '구토', '식욕 없음', '매우 적음'];
      const hasNutritionIssue = poorNutritionKeywords.some(
        (keyword) => record.nutrition_intake!.includes(keyword),
      );
      if (hasNutritionIssue) {
        detectedAlerts.push({
          severity: 'yellow',
          category: 'poor_nutrition',
          title: '영양 섭취 불량 감지',
          description: `환자의 영양 섭취 상태가 불량합니다: "${record.nutrition_intake}". 영양 관리 상태를 확인해주세요.`,
          related_vitals: null,
          trend_data: null,
        });
      }
    }

    // 5. 탐지된 알림을 red_flag_alerts 테이블에 삽입
    if (detectedAlerts.length > 0) {
      const alertRecords = detectedAlerts.map((alert) => ({
        visit_record_id: visit_record_id,
        patient_id: record.patient_id,
        nurse_id: record.nurse_id,
        org_id: orgId,
        severity: alert.severity,
        category: alert.category,
        title: alert.title,
        description: alert.description,
        related_vitals: alert.related_vitals,
        trend_data: alert.trend_data,
        status: 'active',
      }));

      const { error: insertError } = await supabase
        .from('red_flag_alerts')
        .insert(alertRecords)
        .select('id, severity');

      if (insertError) {
        console.error('레드플래그 알림 저장 실패:', insertError);
      }

      // 6. RED 등급 알림이 있으면 즉시 알림 발송 트리거
      const redAlerts = detectedAlerts.filter((a) => a.severity === 'red');
      if (redAlerts.length > 0) {
        // send-notification 함수 호출
        try {
          const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
          const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

          // 보호자 ID 조회
          const { data: guardianLinks } = await supabase
            .from('guardian_patient_links')
            .select('guardian_id')
            .eq('patient_id', record.patient_id);

          const guardianIds = (guardianLinks || []).map((l: { guardian_id: string }) => l.guardian_id);

          // 간호사, 기관 관리자에게도 알림
          const notificationUserIds = [record.nurse_id, ...guardianIds];

          if (notificationUserIds.length > 0) {
            await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                user_ids: notificationUserIds,
                type: 'red_flag_alert',
                title: `[긴급] ${redAlerts[0].title}`,
                body: redAlerts[0].description,
                data: {
                  patient_id: record.patient_id,
                  visit_record_id: visit_record_id,
                  severity: 'red',
                },
                channels: ['in_app', 'push', 'kakao_alimtalk'],
              }),
            });
          }
        } catch (notifErr) {
          console.error('알림 발송 실패 (비치명적 오류):', notifErr);
        }
      }
    }

    // 응답 반환
    return jsonResponse({
      visit_record_id,
      patient_id: record.patient_id,
      alerts_detected: detectedAlerts.length,
      alerts: detectedAlerts.map((a) => ({
        severity: a.severity,
        category: a.category,
        title: a.title,
      })),
    });
  } catch (err) {
    console.error('레드플래그 탐지 중 예외:', err);
    return errorResponse('INTERNAL_ERROR', '서버 오류가 발생했습니다.', 500);
  }
});
