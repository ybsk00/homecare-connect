// RAG 챗봇 (보호자용)
// 장기요양/방문치료 관련 질문에 벡터 검색 기반으로 답변합니다.
// Input: { message: string, conversation_id?: string }
//
// 처리 흐름:
// 1. Gemini embedding으로 질문 임베딩 생성
// 2. rag_hybrid_search RPC로 관련 문서 검색 (벡터 + 키워드)
// 3. 검색된 문서를 컨텍스트로 활용해 Gemini로 답변 생성
// 4. 출처 정보와 후속 액션 함께 반환

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Gemini 임베딩 API 호출
async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        taskType: 'RETRIEVAL_QUERY',
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`임베딩 API 오류: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  return result.embedding?.values || [];
}

// Gemini 생성 API 호출
async function generateAnswer(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 2048,
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini 생성 API 오류: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  return result.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// 챗봇 시스템 프롬프트
const CHATBOT_SYSTEM_PROMPT = `당신은 "홈케어커넥트" 플랫폼의 보호자용 상담 AI 챗봇입니다.
장기요양보험, 방문간호, 방문요양, 방문재활 등 재가서비스에 대한 질문에 친절하고 정확하게 답변합니다.

중요 지침:
1. 반드시 제공된 참고 자료(Context)를 기반으로 답변하세요.
2. 참고 자료에 없는 내용은 "정확한 정보가 없어 답변드리기 어렵습니다"라고 안내하세요.
3. 절대로 의료 진단이나 처방을 하지 마세요. 의료적 판단이 필요한 질문에는 "담당 의료진에게 상담하시기 바랍니다"라고 안내하세요.
4. 보호자가 이해하기 쉬운 일상적인 한국어를 사용하세요.
5. 답변은 간결하되 필요한 정보는 빠짐없이 포함하세요.
6. 장기요양등급, 서비스 신청, 비용 등 행정 절차에 대해서는 구체적으로 안내하세요.
7. 감정적으로 힘든 보호자에게는 공감하는 어조를 사용하세요.`;

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

    const { message, conversation_id } = await req.json();

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ code: 'BAD_REQUEST', message: '메시지를 입력해주세요.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 1. 질문 임베딩 생성
    const queryEmbedding = await getEmbedding(message);

    // 2. 하이브리드 검색 (벡터 + 키워드)
    const { data: searchResults, error: searchError } = await supabase
      .rpc('rag_hybrid_search', {
        p_query_embedding: queryEmbedding,
        p_query_text: message,
        p_limit: 5,
      });

    if (searchError) {
      console.error('RAG 검색 실패:', searchError);
    }

    const documents = searchResults || [];

    // 3. 컨텍스트 구성
    let contextText = '';
    const sources: Array<{ title: string; source: string }> = [];

    if (documents.length > 0) {
      contextText = documents
        .map((doc: { title: string; content: string; source: string; similarity: number }, idx: number) => {
          // 중복 출처 제거
          const sourceExists = sources.some((s) => s.title === doc.title && s.source === doc.source);
          if (!sourceExists) {
            sources.push({ title: doc.title, source: doc.source });
          }
          return `[참고자료 ${idx + 1}] "${doc.title}" (출처: ${doc.source})\n${doc.content}`;
        })
        .join('\n\n---\n\n');
    }

    // 4. Gemini로 답변 생성
    const userPrompt = contextText
      ? `## 참고 자료 (Context)\n${contextText}\n\n---\n\n## 사용자 질문\n${message}`
      : `## 사용자 질문\n${message}\n\n(참고 자료가 없습니다. 일반적인 지식으로 답변하되, 정확하지 않을 수 있음을 안내해주세요.)`;

    const answer = await generateAnswer(CHATBOT_SYSTEM_PROMPT, userPrompt);

    // 5. 후속 액션 생성
    const followUpActions: Array<{ type: string; label: string; url?: string }> = [];

    // 서비스 매칭 관련 질문이면 매칭 액션 추가
    const matchingKeywords = ['매칭', '서비스 신청', '간호사 찾기', '기관 찾기', '방문간호 신청'];
    if (matchingKeywords.some((kw) => message.includes(kw))) {
      followUpActions.push({
        type: 'navigate',
        label: '서비스 매칭 신청하기',
        url: '/matching/new',
      });
    }

    // 등급 관련 질문이면 등급 안내 액션 추가
    const gradeKeywords = ['등급', '장기요양', '인정 신청', '등급 판정'];
    if (gradeKeywords.some((kw) => message.includes(kw))) {
      followUpActions.push({
        type: 'external_link',
        label: '국민건강보험공단 장기요양 안내',
        url: 'https://www.longtermcare.or.kr',
      });
    }

    // 비용/요금 관련이면 비용 안내
    const costKeywords = ['비용', '요금', '본인부담', '수가', '가격'];
    if (costKeywords.some((kw) => message.includes(kw))) {
      followUpActions.push({
        type: 'navigate',
        label: '서비스 요금 안내 보기',
        url: '/pricing',
      });
    }

    // 에스컬레이션이 필요한 경우 감지
    const escalationKeywords = ['상담원', '사람과 대화', '전화', '불만', '문제가 해결되지'];
    const needsEscalation = escalationKeywords.some((kw) => message.includes(kw));
    if (needsEscalation) {
      followUpActions.push({
        type: 'escalation',
        label: '상담원 연결하기',
      });

      // 에스컬레이션 알림 생성
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'chat_escalation',
        title: '챗봇 상담 에스컬레이션 요청',
        body: `사용자 메시지: ${message.substring(0, 200)}`,
        data: { conversation_id, message },
        channels: ['in_app'],
      });
    }

    // 응답 반환
    return new Response(
      JSON.stringify({
        answer,
        sources,
        follow_up_actions: followUpActions,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('RAG 챗봇 처리 중 예외:', err);
    return new Response(
      JSON.stringify({ code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
