// 식사 사진 영양 분석 (Gemini Vision)
// 1. 사진에서 음식 인식
// 2. 영양소 추정 (칼로리, 단백질, 탄수화물, 지방)
// 3. 근감소증 예방 관점 단백질 섭취 피드백
// 4. meal_logs 테이블 저장
//
// Input: { patient_id, image_base64, meal_type }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MealAnalysis {
  food_items: Array<{ name: string; amount: string }>;
  nutrition: {
    calories: number;
    protein_g: number;
    carb_g: number;
    fat_g: number;
  };
  feedback: string;
  protein_sufficient: boolean;
}

async function analyzeWithGemini(imageBase64: string, mealType: string): Promise<MealAnalysis> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY 미설정');

  const mealTypeKor = {
    breakfast: '아침',
    lunch: '점심',
    dinner: '저녁',
    snack: '간식',
  }[mealType] ?? mealType;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{
            text: `당신은 영양사입니다. 식사 사진을 분석하여 JSON으로 응답합니다.
특히 65세 이상 어르신의 근감소증 예방을 위해 단백질 섭취를 중요하게 평가합니다.
한 끼 단백질 권장량은 20g 이상입니다.

반드시 아래 JSON 형식으로만 응답하세요 (마크다운 코드블록 없이 순수 JSON):
{
  "food_items": [{"name": "음식명", "amount": "대략적인 양"}],
  "nutrition": {"calories": 숫자, "protein_g": 숫자, "carb_g": 숫자, "fat_g": 숫자},
  "feedback": "어르신 눈높이의 한국어 피드백 (2~3문장)",
  "protein_sufficient": true/false
}`,
          }],
        },
        contents: [{
          parts: [
            { text: `이 ${mealTypeKor} 식사 사진을 분석해주세요.` },
            { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
          ],
        }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
      }),
    },
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini Vision API 오류: ${res.status} - ${errText}`);
  }

  const result = await res.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  // JSON 파싱 (마크다운 코드블록 제거)
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    return {
      food_items: [],
      nutrition: { calories: 0, protein_g: 0, carb_g: 0, fat_g: 0 },
      feedback: '사진을 분석하기 어려웠어요. 다시 찍어주시겠어요?',
      protein_sufficient: false,
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: '인증 필요' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { patient_id, image_base64, meal_type = 'lunch' } = await req.json();

    if (!patient_id || !image_base64) {
      return new Response(JSON.stringify({ error: 'patient_id, image_base64 필요' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Gemini Vision 분석
    const analysis = await analyzeWithGemini(image_base64, meal_type);

    const today = new Date().toISOString().split('T')[0];

    // meal_logs 저장
    const { data: mealLog, error: insertError } = await supabase
      .from('meal_logs')
      .insert({
        patient_id,
        meal_date: today,
        meal_type,
        ai_food_items: analysis.food_items,
        ai_nutrition: analysis.nutrition,
        ai_feedback: analysis.feedback,
        protein_sufficient: analysis.protein_sufficient,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('meal_logs 저장 실패:', insertError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        meal_log_id: mealLog?.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('식사 분석 오류:', err);
    return new Response(
      JSON.stringify({ error: '분석 중 오류가 발생했어요' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
