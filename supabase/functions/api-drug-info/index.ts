// 공공 API 프록시: e약은요 + DUR + 낱알식별
// 클라이언트에서 직접 호출하지 않고 이 Edge Function을 통해 프록시
// 응답은 24시간 캐싱 (약 정보는 자주 변하지 않음)
//
// Endpoints:
//   POST { action: "drug_info", drug_name: string }           → e약은요 API
//   POST { action: "dur_check", drug_codes: string[] }        → DUR 병용금기
//   POST { action: "dur_elderly", drug_code: string }         → DUR 노인주의
//   POST { action: "identify_pill", features: object }        → 낱알식별

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API_BASE = 'http://apis.data.go.kr/1471000';

// 간단한 인메모리 캐시 (24시간)
const cache = new Map<string, { data: unknown; expires: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000;

function getCached(key: string): unknown | null {
  const entry = cache.get(key);
  if (entry && entry.expires > Date.now()) return entry.data;
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL });
}

// e약은요 API: 의약품 상세정보
async function getDrugInfo(apiKey: string, drugName: string) {
  const cacheKey = `drug:${drugName}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    serviceKey: apiKey,
    itemName: drugName,
    type: 'json',
    numOfRows: '5',
    pageNo: '1',
  });

  const res = await fetch(
    `${API_BASE}/DrbEasyDrugInfoService/getDrbEasyDrugList?${params}`,
  );

  if (!res.ok) throw new Error(`e약은요 API 오류: ${res.status}`);

  const raw = await res.json();
  const items = raw?.body?.items ?? [];

  const result = items.map((item: Record<string, string>) => ({
    itemName: item.itemName,
    entpName: item.entpName,
    efcyQesitm: item.efcyQesitm,         // 효능
    useMethodQesitm: item.useMethodQesitm, // 사용법
    atpnWarnQesitm: item.atpnWarnQesitm,  // 주의사항(경고)
    atpnQesitm: item.atpnQesitm,          // 주의사항
    intrcQesitm: item.intrcQesitm,         // 상호작용
    seQesitm: item.seQesitm,              // 부작용
    depositMethodQesitm: item.depositMethodQesitm, // 보관법
    itemSeq: item.itemSeq,
  }));

  setCache(cacheKey, result);
  return result;
}

// DUR 병용금기 체크
async function checkDurInteraction(apiKey: string, drugCodes: string[]) {
  if (drugCodes.length < 2) return [];

  const results: unknown[] = [];

  // 모든 조합 체크
  for (let i = 0; i < drugCodes.length; i++) {
    for (let j = i + 1; j < drugCodes.length; j++) {
      const cacheKey = `dur:${drugCodes[i]}:${drugCodes[j]}`;
      const cached = getCached(cacheKey);
      if (cached) {
        results.push(cached);
        continue;
      }

      const params = new URLSearchParams({
        serviceKey: apiKey,
        typeName: '병용금기',
        itemSeq: drugCodes[i],
        type: 'json',
        numOfRows: '10',
        pageNo: '1',
      });

      try {
        const res = await fetch(
          `${API_BASE}/DURPrdlstInfoService03/getUsjntTabooInfoList03?${params}`,
        );

        if (res.ok) {
          const raw = await res.json();
          const items = raw?.body?.items ?? [];
          const matches = items.filter(
            (item: Record<string, string>) => item.MIXTURE_ITEM_SEQ === drugCodes[j],
          );

          if (matches.length > 0) {
            const result = matches.map((m: Record<string, string>) => ({
              type: 'interaction',
              drugA: m.ITEM_NAME,
              drugB: m.MIXTURE_ITEM_NAME,
              prohibitContent: m.PROHBT_CONTENT,
              remark: m.REMARK,
            }));
            setCache(cacheKey, result);
            results.push(...result);
          }
        }
      } catch (e) {
        console.error('DUR 병용금기 조회 실패:', e);
      }
    }
  }

  return results;
}

// DUR 노인주의
async function checkElderlyWarning(apiKey: string, drugCode: string) {
  const cacheKey = `elderly:${drugCode}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    serviceKey: apiKey,
    itemSeq: drugCode,
    type: 'json',
    numOfRows: '10',
    pageNo: '1',
  });

  const res = await fetch(
    `${API_BASE}/DURPrdlstInfoService03/getOdSnAtntInfoList03?${params}`,
  );

  if (!res.ok) return [];

  const raw = await res.json();
  const items = raw?.body?.items ?? [];

  const result = items.map((item: Record<string, string>) => ({
    type: 'elderly_warning',
    itemName: item.ITEM_NAME,
    prohibitContent: item.PROHBT_CONTENT,
    remark: item.REMARK,
  }));

  setCache(cacheKey, result);
  return result;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('DATA_GO_KR_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'DATA_GO_KR_API_KEY 미설정' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const body = await req.json();
    const { action } = body;

    let result: unknown;

    switch (action) {
      case 'drug_info': {
        const { drug_name } = body;
        if (!drug_name) {
          return new Response(JSON.stringify({ error: 'drug_name 필요' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        result = await getDrugInfo(apiKey, drug_name);
        break;
      }

      case 'dur_check': {
        const { drug_codes } = body;
        if (!drug_codes || !Array.isArray(drug_codes)) {
          return new Response(JSON.stringify({ error: 'drug_codes 배열 필요' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        result = await checkDurInteraction(apiKey, drug_codes);
        break;
      }

      case 'dur_elderly': {
        const { drug_code } = body;
        if (!drug_code) {
          return new Response(JSON.stringify({ error: 'drug_code 필요' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        result = await checkElderlyWarning(apiKey, drug_code);
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `알 수 없는 action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ data: result }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('api-drug-info 오류:', err);
    return new Response(
      JSON.stringify({ error: '서버 오류' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
