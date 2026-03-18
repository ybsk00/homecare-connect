// AI 경과 리포트 생성
// 의사 월 1회 방문 시 활용할 수 있는 환자 경과 리포트를 Gemini로 생성합니다.
// Input: { patient_id, period_start, period_end, doctor_visit_date }
// Gemini 2.5 Flash 모델 사용 (비용 효율)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Gemini API 호출 헬퍼
async function callGemini(prompt: string, systemPrompt: string): Promise<string> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API 오류: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  return result.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// 활력징후 추이 계산
function calculateVitalsTrend(records: Array<{
  vitals: {
    systolic_bp?: number;
    diastolic_bp?: number;
    heart_rate?: number;
    temperature?: number;
    blood_sugar?: number;
    spo2?: number;
    weight?: number;
  };
  created_at: string;
}>) {
  const bpData: Array<{ date: string; systolic: number; diastolic: number }> = [];
  const hrData: Array<{ date: string; value: number }> = [];
  const weightData: Array<{ date: string; value: number }> = [];
  const bsData: Array<{ date: string; value: number }> = [];

  records.forEach((r) => {
    const date = r.created_at.split('T')[0];
    const v = r.vitals;

    if (v.systolic_bp && v.diastolic_bp) {
      bpData.push({ date, systolic: v.systolic_bp, diastolic: v.diastolic_bp });
    }
    if (v.heart_rate) hrData.push({ date, value: v.heart_rate });
    if (v.weight) weightData.push({ date, value: v.weight });
    if (v.blood_sugar) bsData.push({ date, value: v.blood_sugar });
  });

  // 평균 계산 함수
  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  return {
    blood_pressure: {
      data: bpData,
      avg_systolic: Math.round(avg(bpData.map((d) => d.systolic))),
      avg_diastolic: Math.round(avg(bpData.map((d) => d.diastolic))),
      max_systolic: bpData.length > 0 ? Math.max(...bpData.map((d) => d.systolic)) : 0,
      min_systolic: bpData.length > 0 ? Math.min(...bpData.map((d) => d.systolic)) : 0,
    },
    heart_rate: {
      data: hrData,
      avg: Math.round(avg(hrData.map((d) => d.value))),
    },
    weight: {
      data: weightData,
      change: weightData.length >= 2 ? weightData[weightData.length - 1].value - weightData[0].value : 0,
    },
    blood_sugar: {
      data: bsData,
      avg: Math.round(avg(bsData.map((d) => d.value))),
    },
  };
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

    const { patient_id, period_start, period_end, doctor_visit_date } = await req.json();

    if (!patient_id || !period_start || !period_end) {
      return new Response(
        JSON.stringify({ code: 'BAD_REQUEST', message: 'patient_id, period_start, period_end는 필수입니다.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 환자 정보 조회
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patient_id)
      .single();

    if (patientError || !patient) {
      return new Response(
        JSON.stringify({ code: 'NOT_FOUND', message: '환자 정보를 찾을 수 없습니다.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 기관/의사 정보 조회
    const { data: activePlan } = await supabase
      .from('service_plans')
      .select('org_id, nurse_id')
      .eq('patient_id', patient_id)
      .eq('status', 'active')
      .single();

    const orgId = activePlan?.org_id || '';

    // ai_reports에 생성 시작 레코드 삽입
    const { data: report, error: reportInsertError } = await supabase
      .from('ai_reports')
      .insert({
        patient_id,
        org_id: orgId,
        period_start,
        period_end,
        doctor_visit_date: doctor_visit_date || null,
        status: 'generating',
      })
      .select('id')
      .single();

    if (reportInsertError) {
      console.error('리포트 레코드 생성 실패:', reportInsertError);
      return new Response(
        JSON.stringify({ code: 'INSERT_FAILED', message: '리포트 생성을 시작할 수 없습니다.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    try {
      // 1. 기간 내 방문 기록 조회
      const { data: visitRecords } = await supabase
        .from('visit_records')
        .select('*')
        .eq('patient_id', patient_id)
        .gte('created_at', period_start)
        .lte('created_at', period_end)
        .order('created_at', { ascending: true });

      const records = visitRecords || [];

      // 2. 활력징후 추이 계산
      const vitalsTrend = calculateVitalsTrend(records);

      // 3. 레드플래그 이력 조회
      const { data: redFlags } = await supabase
        .from('red_flag_alerts')
        .select('*')
        .eq('patient_id', patient_id)
        .gte('created_at', period_start)
        .lte('created_at', period_end)
        .order('severity', { ascending: true });

      // 4. 주요 이벤트 추출
      const keyEvents = (redFlags || []).map((rf: {
        created_at: string;
        severity: string;
        title: string;
        description: string;
      }) => ({
        date: rf.created_at.split('T')[0],
        severity: rf.severity,
        title: rf.title,
        description: rf.description,
      }));

      // 5. 간호 수행 요약
      const allPerformedItems: Record<string, { total: number; done: number }> = {};
      records.forEach((r: { performed_items?: Array<{ item: string; done: boolean }> }) => {
        (r.performed_items || []).forEach((item) => {
          if (!allPerformedItems[item.item]) {
            allPerformedItems[item.item] = { total: 0, done: 0 };
          }
          allPerformedItems[item.item].total++;
          if (item.done) allPerformedItems[item.item].done++;
        });
      });

      const nursingSummary = Object.entries(allPerformedItems).map(([item, counts]) => ({
        item,
        completion_rate: Math.round((counts.done / counts.total) * 100),
        total_visits: counts.total,
      }));

      // 6. 투약 순응도 계산
      const medItems = Object.entries(allPerformedItems).filter(([item]) =>
        item.includes('투약') || item.includes('약물'),
      );
      const medicationAdherence = medItems.length > 0
        ? {
            items: medItems.map(([item, counts]) => ({
              medication: item,
              adherence_rate: Math.round((counts.done / counts.total) * 100),
            })),
            overall_rate: Math.round(
              medItems.reduce((sum, [, c]) => sum + (c.done / c.total) * 100, 0) / medItems.length,
            ),
          }
        : { items: [], overall_rate: 100 };

      // 7. Gemini로 AI 요약 생성
      const systemPrompt = `당신은 방문간호 환자 경과를 요약하는 전문 AI입니다.
의사가 월 1회 방문 시 활용할 수 있도록 환자의 건강 상태 변화를 간결하고 체계적으로 요약해야 합니다.
의학 용어를 적절히 사용하되, 핵심 정보를 놓치지 않도록 합니다.
반드시 한국어로 작성합니다.`;

      const prompt = `아래 데이터를 바탕으로 환자 경과 요약 리포트를 작성해주세요.

## 환자 정보
- 이름: ${patient.full_name}
- 생년월일: ${patient.birth_date}
- 성별: ${patient.gender === 'male' ? '남' : '여'}
- 장기요양등급: ${patient.care_grade || '미정'}
- 이동능력: ${patient.mobility || '미정'}
- 주진단명: ${patient.primary_diagnosis || '미상'}
- 현재 약물: ${JSON.stringify(patient.current_medications || [])}

## 리포트 기간
${period_start} ~ ${period_end} (방문 ${records.length}회)

## 활력징후 요약
- 혈압 평균: ${vitalsTrend.blood_pressure.avg_systolic}/${vitalsTrend.blood_pressure.avg_diastolic}mmHg (최고 ${vitalsTrend.blood_pressure.max_systolic}, 최저 ${vitalsTrend.blood_pressure.min_systolic})
- 심박수 평균: ${vitalsTrend.heart_rate.avg}bpm
- 체중 변화: ${vitalsTrend.weight.change > 0 ? '+' : ''}${vitalsTrend.weight.change.toFixed(1)}kg
- 혈당 평균: ${vitalsTrend.blood_sugar.avg}mg/dL

## 주요 이벤트 (레드플래그)
${keyEvents.length > 0 ? keyEvents.map((e) => `- [${e.severity.toUpperCase()}] ${e.date}: ${e.title} - ${e.description}`).join('\n') : '- 특이 이벤트 없음'}

## 간호 수행 현황
${nursingSummary.map((n) => `- ${n.item}: 수행률 ${n.completion_rate}% (${n.total_visits}회 중)`).join('\n')}

## 투약 순응도
- 전체 순응도: ${medicationAdherence.overall_rate}%
${medicationAdherence.items.map((m) => `- ${m.medication}: ${m.adherence_rate}%`).join('\n')}

위 데이터를 바탕으로 다음 형식으로 경과 요약을 작성해주세요:
1. 전반적 건강 상태 요약 (2-3문장)
2. 활력징후 분석 (추세, 주의사항)
3. 주요 변화/사건
4. 간호 중재 효과 평가
5. 의사에게 전달할 주의사항 및 권장 사항`;

      const aiSummary = await callGemini(prompt, systemPrompt);

      // 8. 리포트 업데이트
      const { error: updateError } = await supabase
        .from('ai_reports')
        .update({
          patient_summary: `${patient.full_name} (${patient.birth_date}, ${patient.gender === 'male' ? '남' : '여'}) - ${patient.primary_diagnosis || ''}`,
          vitals_analysis: vitalsTrend,
          vitals_chart_data: {
            bp: vitalsTrend.blood_pressure.data,
            hr: vitalsTrend.heart_rate.data,
            weight: vitalsTrend.weight.data,
            bs: vitalsTrend.blood_sugar.data,
          },
          key_events: keyEvents,
          nursing_summary: nursingSummary,
          medication_adherence: medicationAdherence,
          red_flag_history: redFlags || [],
          ai_summary: aiSummary,
          status: 'generated',
        })
        .eq('id', report.id);

      if (updateError) {
        throw new Error(`리포트 업데이트 실패: ${updateError.message}`);
      }

      return new Response(
        JSON.stringify({
          report_id: report.id,
          status: 'generated',
          visit_count: records.length,
          alerts_count: keyEvents.length,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    } catch (genError) {
      // 생성 실패 시 상태를 error로 업데이트
      console.error('리포트 생성 실패:', genError);
      await supabase
        .from('ai_reports')
        .update({ status: 'error' })
        .eq('id', report.id);

      return new Response(
        JSON.stringify({
          code: 'GENERATION_FAILED',
          message: '리포트 생성 중 오류가 발생했습니다.',
          report_id: report.id,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
  } catch (err) {
    console.error('AI 리포트 처리 중 예외:', err);
    return new Response(
      JSON.stringify({ code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
