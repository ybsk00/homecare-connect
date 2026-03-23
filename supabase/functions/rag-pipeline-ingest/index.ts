// RAG 파이프라인: 데이터 수집 → Gemini FAQ 변환 → 임베딩 → DB 적재
//
// 소스:
// 1. PubMed (NCBI E-utilities) → 간호사 임상 RAG
// 2. 건강정보포털 (질병관리청) → 환자 질환 RAG
// 3. 수동 입력 (JSON) → 모든 RAG 테이블
//
// Input:
//   { action: "pubmed", query: string, category: string, max_results?: number }
//   { action: "health_portal", disease_code: string, category: string }
//   { action: "manual", target_table: string, items: Array<{question, answer, source, ...}> }
//   { action: "seed_mvp" }  ← MVP 5대 질환 시드 데이터 자동 생성

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Gemini 임베딩 (1536 차원) ──

async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY 미설정');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        taskType: 'RETRIEVAL_DOCUMENT',
        outputDimensionality: 1536,
      }),
    },
  );
  if (!res.ok) throw new Error(`임베딩 API 오류: ${res.status}`);
  const result = await res.json();
  return result.embedding?.values ?? [];
}

// ── Gemini FAQ 변환 ──

async function convertToFAQ(
  content: string,
  targetAudience: 'patient' | 'nurse',
  category: string,
): Promise<Array<{ question: string; answer: string }>> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY 미설정');

  const audiencePrompt =
    targetAudience === 'patient'
      ? '70대 어르신이 이해할 수 있는 쉬운 한국어로, 핵심만 3줄 이내로 답변을 작성하세요. 의학 용어 사용 금지.'
      : '임상 근거와 수치 기준을 포함해서, 간호사의 판단에 필요한 정보 중심으로 작성하세요.';

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{
            text: `당신은 의학 콘텐츠를 FAQ 형태로 변환하는 전문가입니다.
주어진 의학 텍스트를 ${category} 관련 Q&A 쌍으로 변환합니다.
${audiencePrompt}

반드시 JSON 배열로만 응답하세요 (마크다운 코드블록 없이):
[{"question": "질문", "answer": "답변"}, ...]

5~10개의 Q&A를 생성하세요.`,
          }],
        },
        contents: [{ parts: [{ text: `다음 텍스트를 ${category} FAQ로 변환:\n\n${content}` }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
      }),
    },
  );

  if (!res.ok) throw new Error(`Gemini FAQ 변환 오류: ${res.status}`);
  const result = await res.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    console.error('FAQ JSON 파싱 실패:', cleaned.slice(0, 200));
    return [];
  }
}

// ── PubMed 검색 ──

async function searchPubMed(
  query: string,
  maxResults: number = 5,
): Promise<Array<{ title: string; abstract: string; pmid: string }>> {
  const ncbiKey = Deno.env.get('NCBI_API_KEY') ?? '';
  const keyParam = ncbiKey ? `&api_key=${ncbiKey}` : '';

  // 1. 검색 (PMID 리스트)
  const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${maxResults}&retmode=json${keyParam}`;
  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) throw new Error(`PubMed 검색 오류: ${searchRes.status}`);
  const searchData = await searchRes.json();
  const pmids: string[] = searchData.esearchresult?.idlist ?? [];

  if (pmids.length === 0) return [];

  // 2. 상세 조회 (초록)
  const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmids.join(',')}&retmode=xml${keyParam}`;
  const fetchRes = await fetch(fetchUrl);
  if (!fetchRes.ok) throw new Error(`PubMed 조회 오류: ${fetchRes.status}`);
  const xml = await fetchRes.text();

  // 간단한 XML 파싱 (제목 + 초록)
  const articles: Array<{ title: string; abstract: string; pmid: string }> = [];

  for (const pmid of pmids) {
    const titleMatch = xml.match(new RegExp(`<PMID[^>]*>${pmid}</PMID>[\\s\\S]*?<ArticleTitle>([\\s\\S]*?)</ArticleTitle>`));
    const abstractMatch = xml.match(new RegExp(`<PMID[^>]*>${pmid}</PMID>[\\s\\S]*?<AbstractText[^>]*>([\\s\\S]*?)</AbstractText>`));

    if (titleMatch || abstractMatch) {
      articles.push({
        pmid,
        title: (titleMatch?.[1] ?? '').replace(/<[^>]+>/g, '').trim(),
        abstract: (abstractMatch?.[1] ?? '').replace(/<[^>]+>/g, '').trim(),
      });
    }
  }

  return articles;
}

// ── MVP 시드 데이터 (5대 질환) ──

function getMVPSeedData(): {
  patient: Array<{ category: string; question: string; answer: string; source: string }>;
  emergency: Array<{ symptom: string; severity: string; question: string; answer: string; nurse_instruction: string; source: string }>;
  clinical: Array<{ category: string; question: string; answer: string; source: string; source_type: string }>;
  assessment: Array<{ assessment_type: string; question: string; answer: string; criteria: object; source: string }>;
} {
  return {
    patient: [
      // 고혈압
      { category: 'hypertension', question: '혈압이 높으면 어떻게 해야 하나요?', answer: '소금을 줄이고, 야채와 과일을 많이 드세요. 매일 30분 걷기가 좋아요. 약은 빠뜨리지 말고 꼭 드세요~', source: '대한고혈압학회 가이드라인 2023' },
      { category: 'hypertension', question: '혈압약은 언제 먹어야 하나요?', answer: '보통 아침에 한 번 드시면 돼요. 의사 선생님이 정해주신 시간에 맞춰서 드세요. 갑자기 안 드시면 위험해요~', source: '대한고혈압학회 가이드라인 2023' },
      { category: 'hypertension', question: '혈압이 갑자기 올랐어요', answer: '우선 앉아서 쉬세요. 10분 후에 다시 재보세요. 그래도 180/120 이상이면 간호사 선생님한테 바로 알려주세요~', source: '대한고혈압학회 응급대응 지침' },
      // 당뇨
      { category: 'diabetes', question: '혈당이 높을 때 어떻게 하나요?', answer: '물을 많이 드시고, 단 음식은 피하세요. 가볍게 걷기 운동을 하시면 좋아요. 약이나 인슐린은 꼭 정해진 대로 하세요~', source: '대한당뇨병학회 진료지침 2023' },
      { category: 'diabetes', question: '저혈당 증상이 뭔가요?', answer: '손이 떨리거나, 식은땀이 나거나, 어지러우면 저혈당일 수 있어요. 사탕이나 주스를 바로 드세요! 자주 그러면 간호사 선생님한테 말씀하세요~', source: '대한당뇨병학회 진료지침 2023' },
      { category: 'diabetes', question: '당뇨 있을 때 발 관리는 어떻게 하나요?', answer: '매일 발을 살펴보세요. 상처가 있으면 바로 알려주세요. 꽉 끼는 신발은 안 돼요. 맨발로 다니지 마세요~', source: '대한당뇨병학회 발관리 지침' },
      // 치매
      { category: 'dementia', question: '치매 어르신은 어떻게 대해야 하나요?', answer: '천천히 간단하게 말씀하세요. 같은 말을 반복하셔도 화내지 마세요. 익숙한 환경을 유지해 주시는 게 좋아요~', source: '중앙치매센터 가이드라인' },
      { category: 'dementia', question: '치매 예방에 좋은 활동이 뭐가 있나요?', answer: '퍼즐, 그림 그리기, 노래 부르기가 좋아요. 매일 30분 걷기도 도움이 돼요. 사람들과 대화를 자주 하세요~', source: '중앙치매센터 예방 가이드' },
      // 관절염
      { category: 'arthritis', question: '관절이 아플 때 운동해도 되나요?', answer: '가벼운 운동은 오히려 좋아요! 수영이나 걷기를 추천해요. 너무 아프면 쉬시고, 무리하지 마세요~', source: '대한류마티스학회 관절염 관리' },
      // 낙상예방
      { category: 'fall_prevention', question: '넘어지지 않으려면 어떻게 해야 하나요?', answer: '집에 미끄러운 곳이 없는지 확인하세요. 밤에 화장실 갈 때 불을 꼭 켜세요. 편한 신발을 신으세요~', source: '대한노인의학회 낙상예방 가이드' },
      { category: 'fall_prevention', question: '넘어졌을 때 어떻게 해야 하나요?', answer: '우선 움직이지 말고 어디가 아픈지 확인하세요. 심하게 다치셨으면 주변에 도움을 요청하세요. 간호사 선생님한테 꼭 알려주세요~', source: '대한노인의학회 낙상대응 지침' },
    ],

    emergency: [
      { symptom: '어지러움', severity: 'warning', question: '갑자기 어지러워요', answer: '우선 앉거나 누우세요. 물을 조금 드시고, 10분 쉬어 보세요. 계속 어지러우면 간호사 선생님한테 알려드릴게요~', nurse_instruction: '기립성 저혈압 가능성. 최근 혈압/복약 이행률 확인. 반복 시 낙상 위험 평가 필요.', source: '응급대응 매뉴얼' },
      { symptom: '가슴통증', severity: 'critical', question: '가슴이 아파요', answer: '지금 바로 앉으시고, 움직이지 마세요. 간호사 선생님한테 바로 알려드릴게요!', nurse_instruction: 'ACS 감별 필요. 흉통 OPQRST 확인. 니트로글리세린 처방 여부 확인. 119 호출 기준 교육.', source: '응급대응 매뉴얼' },
      { symptom: '호흡곤란', severity: 'critical', question: '숨쉬기가 힘들어요', answer: '앉은 자세로 천천히 숨 쉬어 보세요. 간호사 선생님한테 지금 바로 알려드릴게요!', nurse_instruction: 'SpO2 확인. COPD/심부전/폐렴 감별. 호흡수 20회/분 이상 시 긴급 대응.', source: '응급대응 매뉴얼' },
      { symptom: '낙상', severity: 'critical', question: '넘어졌어요', answer: '움직이지 마시고, 어디가 아픈지 천천히 확인해보세요. 간호사 선생님한테 바로 알려드릴게요!', nurse_instruction: '골절 여부 확인 (고관절, 대퇴골, 손목). 두부 외상 관찰 24h. 항응고제 복용 환자 특히 주의.', source: '낙상대응 프로토콜' },
      { symptom: '고혈당', severity: 'warning', question: '혈당이 300이 넘어요', answer: '물을 많이 드시고, 인슐린 처방이 있으면 확인해보세요. 간호사 선생님한테 알려드릴게요~', nurse_instruction: '혈당 300 이상: DKA/HHS 감별. 케톤 확인. 탈수 평가. 인슐린 스케줄 조정 필요.', source: '당뇨 응급 프로토콜' },
      { symptom: '식욕부진', severity: 'info', question: '밥맛이 없어요', answer: '조금씩이라도 드셔 보세요. 좋아하시는 음식으로 해보시는 것도 좋아요. 3일 넘게 그러시면 알려주세요~', nurse_instruction: '3일 이상 지속 시 탈수/영양불량 위험. 체중 모니터링. 우울증 스크리닝 고려.', source: '노인 영양관리 지침' },
    ],

    clinical: [
      { category: 'hypertension', question: '노인 고혈압 목표 혈압은?', answer: '65세 이상: 수축기 130-139mmHg 목표 (2023 대한고혈압학회). 80세 이상 허약 노인: 140-149mmHg까지 허용. 기립성 저혈압 주의하며 약제 조절.', source: '대한고혈압학회 진료지침 2023', source_type: 'guideline' },
      { category: 'hypertension', question: '가정혈압 측정 기준은?', answer: '아침 기상 후 1시간 이내 + 취침 전, 2회 측정 평균. 가정혈압 135/85mmHg 이상 시 고혈압. 진료실 혈압보다 5mmHg 낮게 판단.', source: '대한고혈압학회 가정혈압 가이드', source_type: 'guideline' },
      { category: 'diabetes', question: '노인 당뇨 혈당 조절 목표는?', answer: 'HbA1c 7.0-8.0% (건강한 노인 7.0%, 허약한 노인 8.0-8.5%). 저혈당 회피가 최우선. 공복혈당 80-130mg/dL, 식후 2시간 <180mg/dL.', source: '대한당뇨병학회 진료지침 2023', source_type: 'guideline' },
      { category: 'diabetes', question: '저혈당 대응 프로토콜은?', answer: '혈당 <70mg/dL: 포도당 15-20g 경구 투여 → 15분 후 재측정 → 미회복 시 반복. 의식저하 시 글루카곤 IM 또는 119. 설포닐우레아/인슐린 사용 환자 고위험.', source: '대한당뇨병학회 저혈당 매뉴얼', source_type: 'guideline' },
      { category: 'dementia', question: '치매 환자 BPSD 대응은?', answer: 'BPSD(행동심리증상): 비약물적 접근 우선. 환경 조절, 일과 구조화, 음악/미술 치료. 약물: 리스페리돈 0.5mg 시작(FDA 승인 유일), 최소 용량/기간 사용. 항정신병약 사망률 증가 주의.', source: '중앙치매센터 BPSD 가이드라인', source_type: 'guideline' },
      { category: 'fall_prevention', question: '낙상 위험 평가 도구는?', answer: 'Morse Fall Scale 또는 STRATIFY. 위험 요인: 65세 이상, 낙상 이력, 보행 장애, 4개 이상 약물, 시력 저하, 인지 저하. 25점 이상 고위험군 → 중재 프로그램 적용.', source: '대한노인의학회 낙상예방 지침', source_type: 'guideline' },
      { category: 'arthritis', question: '노인 골관절염 비약물 치료는?', answer: '운동치료: 관절가동범위 운동 + 근력 강화 + 유산소. 수중 운동 효과적. 체중 관리 (5% 감량 시 증상 50% 개선). 보조기구(지팡이, 무릎보호대) 적극 활용.', source: '대한류마티스학회 골관절염 가이드', source_type: 'guideline' },
    ],

    assessment: [
      { assessment_type: 'vital_signs', question: '노인 바이탈 정상 범위는?', answer: '혈압: 수축기 90-139, 이완기 60-89mmHg. 맥박: 60-100회/분. 호흡: 12-20회/분. 체온: 36.0-37.2°C (노인은 기저체온 낮을 수 있음). SpO2: ≥95%.', criteria: { systolic_bp: [90, 139], diastolic_bp: [60, 89], heart_rate: [60, 100], temperature: [36.0, 37.2], spo2: [95, 100], respiratory_rate: [12, 20] }, source: '노인간호 바이탈 기준' },
      { assessment_type: 'pain', question: '노인 통증 사정 방법은?', answer: 'NRS(0-10) 또는 FPS(표정 척도, 인지저하 환자). 통증 OPQRST: 발생(Onset), 유발요인(Provocation), 양상(Quality), 부위(Region), 강도(Severity), 시간(Time). 노인은 통증 과소보고 경향.', criteria: { mild: [1, 3], moderate: [4, 6], severe: [7, 10] }, source: '한국간호과학회 통증사정 가이드' },
      { assessment_type: 'nutrition', question: '노인 영양 스크리닝 기준은?', answer: 'MNA-SF(Mini Nutritional Assessment): 12-14점 정상, 8-11점 영양불량 위험, 0-7점 영양불량. BMI <18.5 저체중. 단백질 권장: 1.0-1.2g/kg/day. 근감소증 예방 위해 류신 풍부 식품 권장.', criteria: { bmi_underweight: 18.5, protein_per_kg: 1.2, mna_normal: [12, 14], mna_risk: [8, 11] }, source: '대한노인의학회 영양관리 지침' },
      { assessment_type: 'wound', question: '욕창 사정 기준은?', answer: 'Braden Scale (6항목 6-23점): 18점 이하 위험. 단계: 1단계(발적), 2단계(수포/미란), 3단계(전층 손실), 4단계(근육/뼈 노출). 호발 부위: 천골, 대전자, 발뒤꿈치. 2시간 체위 변경 필수.', criteria: { braden_high_risk: 12, braden_moderate_risk: 14, braden_low_risk: 18, reposition_interval_hours: 2 }, source: 'NPUAP 욕창 가이드라인' },
    ],
  };
}

// ── 메인 핸들러 ──

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const body = await req.json();
    const { action } = body;

    switch (action) {
      // ── PubMed 수집 → 간호사 임상 RAG ──
      case 'pubmed': {
        const { query, category, max_results = 5 } = body;
        if (!query || !category) {
          return new Response(JSON.stringify({ error: 'query, category 필요' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const articles = await searchPubMed(query, max_results);
        if (articles.length === 0) {
          return new Response(JSON.stringify({ message: '검색 결과 없음', inserted: 0 }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        let totalInserted = 0;

        for (const article of articles) {
          if (!article.abstract) continue;

          // Gemini로 FAQ 변환
          const faqs = await convertToFAQ(
            `Title: ${article.title}\nAbstract: ${article.abstract}`,
            'nurse',
            category,
          );

          for (const faq of faqs) {
            const embedding = await getEmbedding(`${faq.question} ${faq.answer}`);
            await supabase.from('nurse_agent_rag_clinical').insert({
              category,
              question: faq.question,
              answer: faq.answer,
              source: `PubMed PMID:${article.pmid}`,
              source_type: 'pubmed',
              embedding,
              metadata: { pmid: article.pmid, title: article.title },
            });
            totalInserted++;
          }

          // Rate limit 준수
          await new Promise((r) => setTimeout(r, 200));
        }

        return new Response(
          JSON.stringify({ success: true, articles: articles.length, inserted: totalInserted }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      // ── MVP 시드 데이터 적재 ──
      case 'seed_mvp': {
        const seed = getMVPSeedData();
        let counts = { patient: 0, emergency: 0, clinical: 0, assessment: 0 };

        // 환자 질환 RAG
        for (const item of seed.patient) {
          const embedding = await getEmbedding(`${item.question} ${item.answer}`);
          await supabase.from('patient_agent_rag_diseases').insert({
            ...item,
            source_type: 'manual',
            embedding,
          });
          counts.patient++;
          await new Promise((r) => setTimeout(r, 100));
        }

        // 환자 응급 RAG
        for (const item of seed.emergency) {
          const embedding = await getEmbedding(`${item.symptom} ${item.question} ${item.answer}`);
          await supabase.from('patient_agent_rag_emergency').insert({
            ...item,
            embedding,
          });
          counts.emergency++;
          await new Promise((r) => setTimeout(r, 100));
        }

        // 간호사 임상 RAG
        for (const item of seed.clinical) {
          const embedding = await getEmbedding(`${item.question} ${item.answer}`);
          await supabase.from('nurse_agent_rag_clinical').insert({
            ...item,
            embedding,
          });
          counts.clinical++;
          await new Promise((r) => setTimeout(r, 100));
        }

        // 간호사 사정 RAG
        for (const item of seed.assessment) {
          const embedding = await getEmbedding(`${item.question} ${item.answer}`);
          await supabase.from('nurse_agent_rag_assessment').insert({
            ...item,
            embedding,
          });
          counts.assessment++;
          await new Promise((r) => setTimeout(r, 100));
        }

        return new Response(
          JSON.stringify({ success: true, counts }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      // ── 수동 입력 ──
      case 'manual': {
        const { target_table, items } = body;
        if (!target_table || !items?.length) {
          return new Response(JSON.stringify({ error: 'target_table, items 필요' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        let inserted = 0;
        for (const item of items) {
          const textForEmbedding = `${item.question ?? ''} ${item.answer ?? ''}`;
          const embedding = await getEmbedding(textForEmbedding);
          await supabase.from(target_table).insert({ ...item, embedding });
          inserted++;
          await new Promise((r) => setTimeout(r, 100));
        }

        return new Response(
          JSON.stringify({ success: true, inserted }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      default:
        return new Response(JSON.stringify({ error: `알 수 없는 action: ${action}` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (err) {
    console.error('RAG 파이프라인 오류:', err);
    return new Response(
      JSON.stringify({ error: '서버 오류', detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
