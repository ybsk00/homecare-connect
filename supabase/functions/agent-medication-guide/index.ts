// 처방 입력 시 복약지도 자동 생성
// 1. e약은요 API로 약품 정보 조회
// 2. DUR API로 기존 처방약과 병용금기/노인주의 체크
// 3. Gemini로 어르신 눈높이 복약지도 변환
// 4. 복용 스케줄 자동 생성
//
// Input: { prescription_id: string }
// Trigger: prescriptions 테이블 INSERT 후 호출

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { parseAndValidate, isValidationError, type FieldSchema } from '../_shared/validate.ts';

async function callGemini(prompt: string): Promise<string> {
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
            text: `당신은 어르신(65세 이상)을 위한 복약지도 전문가입니다.
의약품 정보를 받아서 70대 어르신이 이해할 수 있는 쉬운 한국어로 변환합니다.

규칙:
- 3~5줄 이내로 핵심만
- 의학 용어 사용 금지
- "~하세요", "~드세요" 형태의 존댓말
- 복용 시간/방법을 명확하게
- 주의사항은 꼭 포함 (음식 금기, 부작용 등)
- 보관법은 한 줄로`,
          }],
        },
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
      }),
    },
  );

  if (!res.ok) throw new Error(`Gemini API 오류: ${res.status}`);
  const result = await res.json();
  return result.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

// 복용 스케줄 생성 (frequency 파싱)
function generateScheduleDates(
  startDate: string,
  endDate: string | null,
  frequency: string,
  timing: string,
): Array<{ time: string; date: string }> {
  const schedules: Array<{ time: string; date: string }> = [];

  // frequency 파싱: "1일 3회", "1일 2회", "1일 1회"
  const freqMatch = frequency.match(/(\d+)\s*회/);
  const timesPerDay = freqMatch ? parseInt(freqMatch[1]) : 1;

  // timing에서 시간 추정
  const timingLower = timing.toLowerCase();
  let times: string[] = [];

  if (timesPerDay === 3) {
    if (timingLower.includes('식전')) {
      times = ['07:30', '11:30', '17:30'];
    } else {
      times = ['08:30', '12:30', '18:30']; // 식후 30분 기본
    }
  } else if (timesPerDay === 2) {
    if (timingLower.includes('식전')) {
      times = ['07:30', '17:30'];
    } else {
      times = ['08:30', '18:30'];
    }
  } else {
    if (timingLower.includes('아침')) times = ['08:00'];
    else if (timingLower.includes('저녁')) times = ['18:00'];
    else if (timingLower.includes('취침')) times = ['21:00'];
    else times = ['08:30'];
  }

  // 날짜 범위 생성 (최대 30일)
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
  const maxEnd = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
  const actualEnd = end < maxEnd ? end : maxEnd;

  for (let d = new Date(start); d <= actualEnd; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    for (const time of times) {
      schedules.push({ date: dateStr, time });
    }
  }

  return schedules;
}

const inputSchema: FieldSchema[] = [
  { name: 'prescription_id', type: 'string', required: true },
];

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // 이 함수는 내부 트리거로 호출되므로 서비스 롤 키로 직접 인증
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // 입력 검증
    const input = await parseAndValidate<{ prescription_id: string }>(req, inputSchema);
    if (isValidationError(input)) return input;
    const { prescription_id } = input;

    // 1. 처방 정보 조회
    const { data: rx, error: rxError } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('id', prescription_id)
      .single();

    if (rxError || !rx) {
      return errorResponse('NOT_FOUND', '처방 정보 없음', 404);
    }

    // 2. e약은요 API로 약품 정보 조회
    let drugInfo: string = '';
    const dataGoKrKey = Deno.env.get('DATA_GO_KR_API_KEY');

    if (dataGoKrKey) {
      try {
        const params = new URLSearchParams({
          serviceKey: dataGoKrKey,
          itemName: rx.medication_name,
          type: 'json',
          numOfRows: '1',
          pageNo: '1',
        });

        const drugRes = await fetch(
          `http://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList?${params}`,
        );

        if (drugRes.ok) {
          const drugData = await drugRes.json();
          const item = drugData?.body?.items?.[0];
          if (item) {
            drugInfo = `
약품명: ${item.itemName}
효능: ${item.efcyQesitm ?? '정보없음'}
사용법: ${item.useMethodQesitm ?? '정보없음'}
주의사항: ${item.atpnQesitm ?? '정보없음'}
주의사항(경고): ${item.atpnWarnQesitm ?? '없음'}
상호작용: ${item.intrcQesitm ?? '정보없음'}
부작용: ${item.seQesitm ?? '정보없음'}
보관법: ${item.depositMethodQesitm ?? '정보없음'}`;
          }
        }
      } catch (e) {
        console.error('e약은요 조회 실패:', e);
      }
    }

    // 3. DUR 병용금기 체크 (기존 처방약과)
    let durWarnings: unknown[] = [];

    if (dataGoKrKey && rx.medication_code) {
      const { data: otherRx } = await supabase
        .from('prescriptions')
        .select('medication_code, medication_name')
        .eq('patient_id', rx.patient_id)
        .eq('status', 'active')
        .neq('id', prescription_id)
        .not('medication_code', 'is', null);

      if (otherRx && otherRx.length > 0) {
        for (const other of otherRx) {
          if (!other.medication_code) continue;
          try {
            const params = new URLSearchParams({
              serviceKey: dataGoKrKey,
              itemSeq: rx.medication_code,
              type: 'json',
              numOfRows: '10',
              pageNo: '1',
            });

            const durRes = await fetch(
              `http://apis.data.go.kr/1471000/DURPrdlstInfoService03/getUsjntTabooInfoList03?${params}`,
            );

            if (durRes.ok) {
              const durData = await durRes.json();
              const items = durData?.body?.items ?? [];
              const matches = items.filter(
                (item: Record<string, string>) => item.MIXTURE_ITEM_SEQ === other.medication_code,
              );
              if (matches.length > 0) {
                durWarnings.push(
                  ...matches.map((m: Record<string, string>) => ({
                    type: 'interaction',
                    drugA: rx.medication_name,
                    drugB: other.medication_name,
                    content: m.PROHBT_CONTENT,
                  })),
                );
              }
            }
          } catch (e) {
            console.error('DUR 조회 실패:', e);
          }
        }
      }
    }

    // 4. Gemini로 어르신용 복약지도 생성
    let easyGuide = '';
    if (drugInfo) {
      const prompt = `다음 의약품 정보를 70대 어르신이 이해할 수 있는 복약지도로 변환해주세요.

처방 정보:
- 약품명: ${rx.medication_name}
- 용량: ${rx.dosage}
- 복용빈도: ${rx.frequency}
- 복용시점: ${rx.timing}
${rx.instructions ? `- 의사 지시사항: ${rx.instructions}` : ''}

${drugInfo}

${durWarnings.length > 0 ? `⚠️ 병용금기 경고:\n${JSON.stringify(durWarnings)}` : ''}`;

      try {
        easyGuide = await callGemini(prompt);
      } catch (e) {
        console.error('Gemini 복약지도 생성 실패:', e);
        easyGuide = `${rx.medication_name} ${rx.dosage}을(를) ${rx.frequency} ${rx.timing}에 복용하세요.`;
      }
    }

    // 5. 처방 업데이트 (easy_guide, dur_warnings)
    await supabase
      .from('prescriptions')
      .update({
        easy_guide: easyGuide || null,
        dur_warnings: durWarnings.length > 0 ? durWarnings : [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', prescription_id);

    // 6. 복용 스케줄 자동 생성
    const schedules = generateScheduleDates(
      rx.start_date,
      rx.end_date,
      rx.frequency,
      rx.timing,
    );

    if (schedules.length > 0) {
      const scheduleRows = schedules.map((s) => ({
        prescription_id,
        patient_id: rx.patient_id,
        scheduled_time: s.time,
        scheduled_date: s.date,
        status: 'pending',
      }));

      // 배치 INSERT (100개씩)
      for (let i = 0; i < scheduleRows.length; i += 100) {
        const batch = scheduleRows.slice(i, i + 100);
        await supabase.from('medication_schedules').insert(batch);
      }
    }

    // 7. DUR 위험 시 의사/간호사에게 알림
    if (durWarnings.length > 0) {
      const { data: plans } = await supabase
        .from('service_plans')
        .select('nurse_id')
        .eq('patient_id', rx.patient_id)
        .eq('status', 'active')
        .limit(1)
        .single();

      if (plans?.nurse_id) {
        const { data: staff } = await supabase
          .from('staff')
          .select('user_id')
          .eq('id', plans.nurse_id)
          .single();

        if (staff?.user_id) {
          await supabase.from('notifications').insert({
            user_id: staff.user_id,
            type: 'dur_warning',
            title: '⚠️ 약물 상호작용 경고',
            body: `${rx.medication_name} 처방에서 병용금기가 발견되었습니다.`,
            data: { prescription_id, warnings: durWarnings },
            channels: ['push', 'in_app'],
          });
        }
      }
    }

    return jsonResponse({
      success: true,
      easy_guide: easyGuide,
      dur_warnings: durWarnings,
      schedules_created: schedules.length,
    });
  } catch (err) {
    console.error('복약지도 생성 오류:', err);
    return errorResponse('INTERNAL_ERROR', '서버 오류', 500);
  }
});
