// 의사 소견서 쉬운 말 변환
// 의사가 작성한 전문 소견을 보호자가 이해하기 쉬운 한국어로 변환합니다.
// Input: { report_id: string, doctor_opinion: string }
//
// 처리 흐름:
// 1. Gemini API로 의학 용어를 쉬운 말로 변환
// 2. 면책 문구 추가
// 3. ai_reports.doctor_opinion_simple 업데이트

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 면책 문구
const DISCLAIMER = '이 내용은 참고용이며, 궁금한 점은 담당 의료진에게 문의하세요.';

// Gemini API 호출
async function simplifyWithGemini(doctorOpinion: string): Promise<string> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.');

  const systemPrompt = `당신은 의학 용어를 일반인이 이해할 수 있는 쉬운 한국어로 변환하는 전문 AI입니다.

핵심 지침:
1. 의학 전문 용어를 괄호 안에 원문을 유지하면서 쉬운 말로 바꿔주세요.
   예: "고혈압(Hypertension)" → "혈압이 높은 상태(고혈압)"
2. 약물명은 그대로 유지하되, 약의 목적을 간략히 설명해주세요.
   예: "Amlodipine 5mg 처방" → "혈압을 낮추는 약(Amlodipine) 5mg 처방"
3. 검사 수치는 정상 범위와 비교해 쉽게 설명해주세요.
   예: "HbA1c 7.2%" → "최근 3개월 평균 혈당 수치(HbA1c)가 7.2%로, 관리 목표(6.5% 이하)보다 높습니다."
4. 진단명은 쉬운 말로 풀어서 설명해주세요.
5. 원래 내용의 의미를 절대 변경하지 마세요.
6. 보호자가 걱정할 수 있는 내용은 불필요하게 공포감을 주지 않도록 조심하세요.
7. 결과물은 존댓말(~습니다 체)로 작성해주세요.
8. 의료적 판단이나 새로운 조언을 추가하지 마세요. 원문의 내용만 쉽게 풀어주세요.`;

  const userPrompt = `아래 의사 소견서를 보호자가 이해하기 쉬운 말로 바꿔주세요.

## 원문 소견서
${doctorOpinion}

## 변환 규칙
- 의학 용어 → 쉬운 표현 (괄호 안에 원래 용어 유지)
- 약물 → 약물명 + 간단한 목적 설명
- 수치 → 정상 범위와 비교 설명
- 진단 → 쉬운 말로 풀어쓰기
- 내용의 의미는 절대 변경하지 않기`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }],
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
  const simplifiedText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

  return simplifiedText;
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

    const { report_id, doctor_opinion } = await req.json();

    if (!report_id || !doctor_opinion) {
      return new Response(
        JSON.stringify({ code: 'BAD_REQUEST', message: 'report_id와 doctor_opinion은 필수입니다.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 리포트 존재 확인
    const { data: report, error: reportError } = await supabase
      .from('ai_reports')
      .select('id, patient_id, doctor_opinion')
      .eq('id', report_id)
      .single();

    if (reportError || !report) {
      return new Response(
        JSON.stringify({ code: 'NOT_FOUND', message: 'AI 리포트를 찾을 수 없습니다.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Gemini로 쉬운 말 변환
    const simplifiedText = await simplifyWithGemini(doctor_opinion);

    // 면책 문구 추가
    const finalText = `${simplifiedText}\n\n---\n${DISCLAIMER}`;

    // ai_reports 테이블 업데이트
    const { error: updateError } = await supabase
      .from('ai_reports')
      .update({
        doctor_opinion: doctor_opinion,
        doctor_opinion_simple: finalText,
      })
      .eq('id', report_id);

    if (updateError) {
      console.error('리포트 업데이트 실패:', updateError);
      return new Response(
        JSON.stringify({ code: 'UPDATE_FAILED', message: '리포트 업데이트에 실패했습니다.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 성공 응답
    return new Response(
      JSON.stringify({
        report_id,
        doctor_opinion_simple: finalText,
        disclaimer: DISCLAIMER,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('소견서 변환 중 예외:', err);
    return new Response(
      JSON.stringify({ code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
