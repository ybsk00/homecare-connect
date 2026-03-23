// 환자 AI 에이전트 - Gemini Function Calling 기반
// 어르신 대상 돌봄 동반자 페르소나
//
// 기능: 일정안내, 컨디션체크, 식사분석, 복약관리, 이상징후감지, RAG 건강상담
// Input: { patient_id, message, input_method, image_base64?, context_type? }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Gemini API 헬퍼 ──

async function callGemini(
  systemPrompt: string,
  contents: unknown[],
  tools?: unknown[],
): Promise<{ text?: string; functionCall?: { name: string; args: Record<string, unknown> } }> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY 미설정');

  const body: Record<string, unknown> = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: { temperature: 0.6, maxOutputTokens: 2048 },
  };
  if (tools && tools.length > 0) {
    body.tools = [{ function_declarations: tools }];
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API 오류: ${res.status} - ${errText}`);
  }

  const result = await res.json();
  const candidate = result.candidates?.[0]?.content?.parts?.[0];
  if (candidate?.functionCall) {
    return { functionCall: { name: candidate.functionCall.name, args: candidate.functionCall.args ?? {} } };
  }
  return { text: candidate?.text ?? '' };
}

async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY 미설정');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: { parts: [{ text }] }, taskType: 'RETRIEVAL_QUERY' }),
    },
  );
  if (!res.ok) throw new Error('임베딩 API 오류');
  const result = await res.json();
  return result.embedding?.values ?? [];
}

// ── Function Calling 도구 정의 ──

const TOOLS = [
  {
    name: 'get_today_schedule',
    description: '오늘 방문 일정을 조회합니다',
    parameters: { type: 'object', properties: { patient_id: { type: 'string' } }, required: ['patient_id'] },
  },
  {
    name: 'get_medication_schedule',
    description: '오늘 복용할 약과 시간을 조회합니다',
    parameters: {
      type: 'object',
      properties: { patient_id: { type: 'string' }, date: { type: 'string' } },
      required: ['patient_id'],
    },
  },
  {
    name: 'record_condition_check',
    description: '컨디션 체크 결과를 기록합니다',
    parameters: {
      type: 'object',
      properties: {
        patient_id: { type: 'string' },
        mood: { type: 'string', enum: ['good', 'okay', 'bad'] },
        sleep_quality: { type: 'string', enum: ['good', 'okay', 'bad'] },
        pain_level: { type: 'number' },
        symptoms: { type: 'array', items: { type: 'string' } },
      },
      required: ['patient_id'],
    },
  },
  {
    name: 'confirm_medication_taken',
    description: '약 복용 완료를 기록합니다',
    parameters: {
      type: 'object',
      properties: { schedule_id: { type: 'string' } },
      required: ['schedule_id'],
    },
  },
  {
    name: 'search_health_knowledge',
    description: '건강/질환 관련 지식을 RAG에서 검색합니다',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string' }, category: { type: 'string' } },
      required: ['query'],
    },
  },
  {
    name: 'trigger_red_flag',
    description: '이상징후를 간호사에게 알립니다. 환자에게 불안을 주지 않도록 부드럽게 안내합니다',
    parameters: {
      type: 'object',
      properties: {
        patient_id: { type: 'string' },
        severity: { type: 'string', enum: ['info', 'warning', 'critical'] },
        summary: { type: 'string' },
      },
      required: ['patient_id', 'severity', 'summary'],
    },
  },
];

// ── Function 실행기 ──

async function executeFunctionCall(
  supabase: ReturnType<typeof createClient>,
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  const today = new Date().toISOString().split('T')[0];

  switch (name) {
    case 'get_today_schedule': {
      const { data } = await supabase
        .from('visits')
        .select('scheduled_time, status, nurse:staff(user:profiles(full_name)), service_type:service_plans(care_items)')
        .eq('patient_id', args.patient_id)
        .eq('scheduled_date', today)
        .neq('status', 'cancelled')
        .order('scheduled_time', { ascending: true });
      if (!data || data.length === 0) return '오늘은 예정된 방문이 없습니다.';
      return data
        .map((v: Record<string, unknown>) => {
          const time = (v.scheduled_time as string)?.slice(0, 5) ?? '시간미정';
          const nurse = (v.nurse as any)?.user?.full_name ?? '미배정';
          return `${time} - ${nurse} 간호사님`;
        })
        .join('\n');
    }

    case 'get_medication_schedule': {
      const date = (args.date as string) ?? today;
      const { data } = await supabase
        .from('medication_schedules')
        .select('id, scheduled_time, status, prescription:prescriptions(medication_name, dosage, timing)')
        .eq('patient_id', args.patient_id)
        .eq('scheduled_date', date)
        .order('scheduled_time', { ascending: true });
      if (!data || data.length === 0) return '오늘 복용할 약이 없습니다.';
      return data
        .map((s: Record<string, unknown>) => {
          const rx = s.prescription as any;
          const time = (s.scheduled_time as string)?.slice(0, 5) ?? '';
          const statusLabel = s.status === 'taken' ? '✅ 복용 완료' : s.status === 'missed' ? '❌ 미복용' : '⏰ 대기';
          return `${time} - ${rx?.medication_name} ${rx?.dosage} (${rx?.timing}) [${statusLabel}]`;
        })
        .join('\n');
    }

    case 'record_condition_check': {
      const { error } = await supabase.from('condition_checks').insert({
        patient_id: args.patient_id,
        check_date: today,
        mood: args.mood ?? null,
        sleep_quality: args.sleep_quality ?? null,
        pain_level: args.pain_level ?? null,
        symptoms: args.symptoms ?? [],
        free_text: args.free_text ?? null,
      });
      if (error) return '컨디션 기록에 실패했습니다.';
      return '컨디션 체크가 기록되었습니다.';
    }

    case 'confirm_medication_taken': {
      const { error } = await supabase
        .from('medication_schedules')
        .update({ status: 'taken', taken_at: new Date().toISOString() })
        .eq('id', args.schedule_id);
      if (error) return '복용 기록에 실패했습니다.';
      return '복용 완료로 기록되었습니다.';
    }

    case 'search_health_knowledge': {
      try {
        const embedding = await getEmbedding(args.query as string);
        const { data } = await supabase.rpc('match_patient_rag', {
          query_embedding: embedding,
          match_threshold: 0.7,
          match_count: 3,
        });
        if (!data || data.length === 0) return '관련 건강 정보를 찾지 못했습니다.';
        return data
          .map((d: { question: string; answer: string }) => `Q: ${d.question}\nA: ${d.answer}`)
          .join('\n---\n');
      } catch {
        return '건강 정보 검색 중 오류가 발생했습니다.';
      }
    }

    case 'trigger_red_flag': {
      // 간호사에게 알림
      const { data: plans } = await supabase
        .from('service_plans')
        .select('nurse_id, org_id:organization_id')
        .eq('patient_id', args.patient_id)
        .eq('status', 'active')
        .limit(1)
        .single();

      if (plans?.nurse_id) {
        await supabase.from('red_flag_alerts').insert({
          patient_id: args.patient_id,
          nurse_id: plans.nurse_id,
          org_id: plans.org_id,
          severity: args.severity === 'critical' ? 'red' : args.severity === 'warning' ? 'orange' : 'yellow',
          category: 'agent_detected',
          title: args.summary,
          description: `환자 에이전트 AI 분석 결과: ${args.summary}`,
          ai_analysis: JSON.stringify({ source: 'patient_agent', severity: args.severity }),
          status: 'active',
        });

        // 간호사에게 푸시 알림
        const { data: staff } = await supabase.from('staff').select('user_id').eq('id', plans.nurse_id).single();
        if (staff?.user_id) {
          await supabase.from('notifications').insert({
            user_id: staff.user_id,
            type: 'red_flag',
            title: `⚠️ 환자 이상징후 감지`,
            body: args.summary,
            data: { patient_id: args.patient_id, severity: args.severity },
            channels: ['push', 'in_app'],
          });
        }
      }
      return '간호사 선생님한테 알려드렸어요.';
    }

    default:
      return '알 수 없는 기능입니다.';
  }
}

// ── 시스템 프롬프트 ──

function buildSystemPrompt(patientName: string, gender: string): string {
  const honorific = gender === 'male' ? '아버님' : '어머님';
  return `당신은 "홈케어 도우미"입니다. 다정하고 따뜻한 동네 간호사 페르소나입니다.

## 핵심 지침
- 호칭: "${patientName} ${honorific}" (항상 존댓말)
- 쉬운 한국어 사용, 의학 용어 사용 금지
- 감정 공감 먼저, 정보 제공은 그 다음
- 답변 길이: 3문장 이내 (어르신 집중도 고려)
- 의료 판단 절대 금지: "정확한 건 간호사 선생님한테 여쭤볼게요~" 패턴
- 복약 정보는 반드시 조회 기반, 추측 금지
- 이상징후 감지 시: 환자에게 불안 주지 않고 부드럽게 안내 후 trigger_red_flag 호출

## 기능
- 오늘 방문 일정 안내 (get_today_schedule)
- 복약 조회/복용 확인 (get_medication_schedule, confirm_medication_taken)
- 컨디션 체크 기록 (record_condition_check)
- 건강 정보 검색 (search_health_knowledge)
- 이상징후 알림 (trigger_red_flag)

## 대화 스타일 예시
- "어머님, 오늘 오후 2시에 박지현 간호사님이 오세요~"
- "잠은 잘 주무셨어요? 몸이 좀 불편하시면 말씀해주세요~"
- "간호사 선생님한테 한번 여쭤볼게요~" (불안 최소화)`;
}

// ── 메인 핸들러 ──

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: '인증 필요' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: '인증 실패' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { patient_id, message, input_method = 'text', context_type } = await req.json();

    if (!patient_id || !message) {
      return new Response(JSON.stringify({ error: 'patient_id와 message가 필요합니다' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 환자 정보 조회
    const { data: patient } = await supabase
      .from('patients')
      .select('full_name, gender, care_grade, primary_diagnosis')
      .eq('id', patient_id)
      .single();

    const patientName = patient?.full_name ?? '어르신';
    const gender = patient?.gender ?? 'female';

    // 최근 대화 이력 (컨텍스트 유지, 최대 20턴)
    const { data: history } = await supabase
      .from('agent_conversations')
      .select('role, content')
      .eq('user_id', user.id)
      .eq('agent_type', 'patient_agent')
      .order('created_at', { ascending: false })
      .limit(20);

    const conversationHistory = (history ?? []).reverse().map((h) => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }],
    }));

    // 현재 메시지 추가
    conversationHistory.push({ role: 'user', parts: [{ text: message }] });

    // 사용자 메시지 저장
    await supabase.from('agent_conversations').insert({
      user_id: user.id,
      agent_type: 'patient_agent',
      role: 'user',
      content: message,
      input_method,
    });

    // Gemini 호출 (Function Calling)
    const systemPrompt = buildSystemPrompt(patientName, gender);
    let geminiResult = await callGemini(systemPrompt, conversationHistory, TOOLS);

    const functionCallLog: unknown[] = [];

    // Function Call 처리 (최대 3회 반복)
    let iterations = 0;
    while (geminiResult.functionCall && iterations < 3) {
      iterations++;
      const { name, args } = geminiResult.functionCall;
      functionCallLog.push({ name, args });

      // patient_id 자동 주입
      if (!args.patient_id) args.patient_id = patient_id;

      const functionResult = await executeFunctionCall(supabase, name, args);

      // 함수 결과를 대화에 추가하고 재호출
      conversationHistory.push({
        role: 'model',
        parts: [{ functionCall: { name, args } } as unknown as { text: string }],
      });
      conversationHistory.push({
        role: 'function' as 'user',
        parts: [{ functionResponse: { name, response: { result: functionResult } } } as unknown as { text: string }],
      });

      geminiResult = await callGemini(systemPrompt, conversationHistory, TOOLS);
    }

    const responseText = geminiResult.text ?? '죄송해요, 잠시 문제가 생겼어요. 다시 말씀해주세요~';

    // 에이전트 응답 저장
    await supabase.from('agent_conversations').insert({
      user_id: user.id,
      agent_type: 'patient_agent',
      role: 'assistant',
      content: responseText,
      function_calls: functionCallLog.length > 0 ? functionCallLog : null,
    });

    return new Response(
      JSON.stringify({
        response: responseText,
        function_calls: functionCallLog,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('환자 에이전트 오류:', err);
    return new Response(
      JSON.stringify({ error: '서버 오류가 발생했어요. 잠시 후 다시 시도해주세요.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
