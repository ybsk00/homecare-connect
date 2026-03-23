// 컨디션 체크 분석 + 이상징후 판단
// 컨디션 체크 데이터 + 최근 바이탈 + 식사 패턴 + 복약 이행률을 종합 분석
// 이상징후 발견 시 레드플래그 트리거
//
// Input: { patient_id, condition_check_id }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function analyzeWithGemini(prompt: string): Promise<{ risk_level: string; summary: string }> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY 미설정');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{
            text: `당신은 방문간호 전문 AI입니다. 환자의 컨디션 데이터를 분석하여 이상징후를 판단합니다.

반드시 아래 JSON 형식으로만 응답하세요:
{
  "risk_level": "normal" | "warning" | "critical",
  "summary": "간호사에게 전달할 임상적 요약 (한국어, 2~3문장)"
}

판단 기준:
- normal: 특이사항 없음
- warning: 주의 관찰 필요 (어지러움, 식욕부진, 수면장애 등)
- critical: 즉시 확인 필요 (심한 통증, 의식 변화, 낙상, 급격한 바이탈 변화)`,
          }],
        },
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
      }),
    },
  );

  if (!res.ok) throw new Error(`Gemini API 오류: ${res.status}`);
  const result = await res.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    return { risk_level: 'normal', summary: '분석 결과를 파싱할 수 없습니다.' };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { patient_id, condition_check_id } = await req.json();
    if (!patient_id) {
      return new Response(JSON.stringify({ error: 'patient_id 필요' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. 오늘 컨디션 체크 조회
    const today = new Date().toISOString().split('T')[0];
    let conditionData: Record<string, unknown> | null = null;

    if (condition_check_id) {
      const { data } = await supabase
        .from('condition_checks')
        .select('*')
        .eq('id', condition_check_id)
        .single();
      conditionData = data;
    } else {
      const { data } = await supabase
        .from('condition_checks')
        .select('*')
        .eq('patient_id', patient_id)
        .eq('check_date', today)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      conditionData = data;
    }

    // 2. 최근 바이탈 (최근 3일)
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const { data: recentVitals } = await supabase
      .from('visit_records')
      .select('vitals, created_at')
      .eq('patient_id', patient_id)
      .gte('created_at', threeDaysAgo)
      .order('created_at', { ascending: false })
      .limit(5);

    // 3. 최근 식사 패턴 (최근 3일)
    const { data: recentMeals } = await supabase
      .from('meal_logs')
      .select('meal_type, ai_nutrition, protein_sufficient, meal_date')
      .eq('patient_id', patient_id)
      .gte('meal_date', threeDaysAgo)
      .order('meal_date', { ascending: false });

    // 4. 복약 이행률 (최근 7일)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const { data: medSchedules } = await supabase
      .from('medication_schedules')
      .select('status')
      .eq('patient_id', patient_id)
      .gte('scheduled_date', sevenDaysAgo)
      .lte('scheduled_date', today);

    const totalMeds = medSchedules?.length ?? 0;
    const takenMeds = medSchedules?.filter((m) => m.status === 'taken').length ?? 0;
    const adherenceRate = totalMeds > 0 ? Math.round((takenMeds / totalMeds) * 100) : null;

    // 5. 환자 기본 정보
    const { data: patient } = await supabase
      .from('patients')
      .select('full_name, primary_diagnosis, care_grade')
      .eq('id', patient_id)
      .single();

    // 6. Gemini 분석
    const prompt = `환자 정보:
- 이름: ${patient?.full_name ?? '미상'}
- 주요 진단: ${patient?.primary_diagnosis ?? '없음'}
- 요양등급: ${patient?.care_grade ?? '미정'}

오늘 컨디션 체크:
${conditionData ? `
- 기분: ${conditionData.mood ?? '미응답'}
- 수면: ${conditionData.sleep_quality ?? '미응답'}
- 통증 수준: ${conditionData.pain_level ?? '미응답'}/10
- 통증 부위: ${conditionData.pain_location ?? '없음'}
- 증상: ${(conditionData.symptoms as string[])?.join(', ') ?? '없음'}
- 자유 발화: ${conditionData.free_text ?? '없음'}
` : '컨디션 체크 데이터 없음'}

최근 3일 바이탈:
${recentVitals?.map((v) => JSON.stringify(v.vitals)).join('\n') ?? '데이터 없음'}

최근 3일 식사 영양:
${recentMeals?.map((m) => `${m.meal_date} ${m.meal_type}: 단백질 ${(m.ai_nutrition as any)?.protein_g ?? '?'}g, 충분여부: ${m.protein_sufficient}`).join('\n') ?? '데이터 없음'}

복약 이행률 (7일): ${adherenceRate !== null ? `${adherenceRate}%` : '데이터 없음'}

위 데이터를 종합 분석하여 이상징후를 판단하세요.`;

    const analysis = await analyzeWithGemini(prompt);

    // 7. 컨디션 체크 업데이트
    if (conditionData?.id) {
      await supabase
        .from('condition_checks')
        .update({
          ai_summary: analysis.summary,
          ai_risk_level: analysis.risk_level,
        })
        .eq('id', conditionData.id);
    }

    // 8. WARNING/CRITICAL 시 레드플래그 생성
    if (analysis.risk_level !== 'normal') {
      const { data: plans } = await supabase
        .from('service_plans')
        .select('nurse_id, organization_id')
        .eq('patient_id', patient_id)
        .eq('status', 'active')
        .limit(1)
        .single();

      if (plans?.nurse_id) {
        const severityMap: Record<string, string> = {
          warning: 'orange',
          critical: 'red',
        };

        await supabase.from('red_flag_alerts').insert({
          patient_id,
          nurse_id: plans.nurse_id,
          org_id: plans.organization_id,
          severity: severityMap[analysis.risk_level] ?? 'yellow',
          category: 'condition_check',
          title: `컨디션 체크 이상징후: ${analysis.risk_level === 'critical' ? '긴급' : '주의'}`,
          description: analysis.summary,
          ai_analysis: JSON.stringify({
            source: 'agent_condition_check',
            condition: conditionData,
            adherence_rate: adherenceRate,
          }),
          status: 'active',
        });

        // 간호사에게 알림 (WARNING 이상만 푸시)
        const { data: staff } = await supabase
          .from('staff')
          .select('user_id')
          .eq('id', plans.nurse_id)
          .single();

        if (staff?.user_id) {
          await supabase.from('notifications').insert({
            user_id: staff.user_id,
            type: 'red_flag',
            title: analysis.risk_level === 'critical'
              ? `🔴 긴급: ${patient?.full_name} 이상징후`
              : `🟠 주의: ${patient?.full_name} 컨디션 변화`,
            body: analysis.summary,
            data: { patient_id, risk_level: analysis.risk_level },
            channels: analysis.risk_level === 'critical' ? ['push', 'in_app'] : ['in_app'],
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        risk_level: analysis.risk_level,
        summary: analysis.summary,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('컨디션 분석 오류:', err);
    return new Response(
      JSON.stringify({ error: '분석 중 오류 발생' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
