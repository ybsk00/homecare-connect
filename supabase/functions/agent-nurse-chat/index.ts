// 간호사 AI 에이전트 - Gemini Function Calling 기반
// 간결한 전문 어시스턴트 페르소나
//
// 기능: 오늘 브리핑, 환자 요약, 처방약 조회, 레드플래그, 음성 브리핑
// Input: { nurse_id, message, input_method }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { authenticateRequest, isAuthError } from '../_shared/auth.ts';
import { parseAndValidate, isValidationError, type FieldSchema } from '../_shared/validate.ts';
import { checkRateLimit } from '../_shared/rate-limit.ts';

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
    generationConfig: { temperature: 0.4, maxOutputTokens: 3072 },
  };
  if (tools?.length) body.tools = [{ function_declarations: tools }];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
  );
  if (!res.ok) throw new Error(`Gemini API 오류: ${res.status}`);

  const result = await res.json();
  const candidate = result.candidates?.[0]?.content?.parts?.[0];
  if (candidate?.functionCall) {
    return { functionCall: { name: candidate.functionCall.name, args: candidate.functionCall.args ?? {} } };
  }
  return { text: candidate?.text ?? '' };
}

const TOOLS = [
  {
    name: 'get_today_briefing',
    description: '오늘 전체 방문 스케줄 + 환자별 요약을 생성합니다',
    parameters: { type: 'object', properties: { nurse_id: { type: 'string' } }, required: ['nurse_id'] },
  },
  {
    name: 'get_patient_summary',
    description: '특정 환자의 최근 상태 요약 (바이탈, 컨디션, 식사, 복약이행률)',
    parameters: {
      type: 'object',
      properties: { patient_id: { type: 'string' }, days: { type: 'number' } },
      required: ['patient_id'],
    },
  },
  {
    name: 'get_patient_medications',
    description: '환자의 현재 처방약 목록 + 변경 이력',
    parameters: { type: 'object', properties: { patient_id: { type: 'string' } }, required: ['patient_id'] },
  },
  {
    name: 'get_red_flags',
    description: '담당 환자의 활성 레드플래그 목록',
    parameters: { type: 'object', properties: { nurse_id: { type: 'string' } }, required: ['nurse_id'] },
  },
  {
    name: 'get_next_patient',
    description: '다음 방문 환자 정보 (이동 중 음성 브리핑용)',
    parameters: { type: 'object', properties: { nurse_id: { type: 'string' } }, required: ['nurse_id'] },
  },
  {
    name: 'get_condition_check_results',
    description: '환자 에이전트가 수집한 오늘 컨디션 체크 결과',
    parameters: {
      type: 'object',
      properties: { patient_ids: { type: 'array', items: { type: 'string' } } },
      required: ['patient_ids'],
    },
  },
];

async function executeFunctionCall(
  supabase: ReturnType<typeof createClient>,
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  const today = new Date().toISOString().split('T')[0];

  switch (name) {
    case 'get_today_briefing': {
      const { data: visits } = await supabase
        .from('visits')
        .select(`
          scheduled_time, estimated_duration_min, status,
          patient:patients(id, full_name, care_grade, primary_diagnosis, address)
        `)
        .eq('nurse_id', args.nurse_id)
        .eq('scheduled_date', today)
        .neq('status', 'cancelled')
        .order('scheduled_time', { ascending: true });

      if (!visits?.length) return '오늘 예정된 방문이 없습니다.';

      const completed = visits.filter((v) => v.status === 'completed').length;
      const remaining = visits.length - completed;

      let briefing = `오늘 총 ${visits.length}건 방문 (완료 ${completed}, 남은 ${remaining})\n\n`;
      visits.forEach((v: any, i: number) => {
        const time = v.scheduled_time?.slice(0, 5) ?? '--:--';
        const duration = v.estimated_duration_min ?? '--';
        const statusLabel = v.status === 'completed' ? '✅' : v.status === 'in_progress' ? '🔵' : '⬜';
        briefing += `${statusLabel} ${time} (${duration}분) — ${v.patient?.full_name} (${v.patient?.care_grade ?? '-'}등급)\n`;
        briefing += `   📍 ${v.patient?.address?.split(' ').slice(0, 3).join(' ') ?? '주소미등록'}\n`;
        if (v.patient?.primary_diagnosis) briefing += `   🏥 ${v.patient.primary_diagnosis}\n`;
      });

      return briefing;
    }

    case 'get_patient_summary': {
      const days = (args.days as number) ?? 7;
      const daysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // 최근 바이탈
      const { data: vitals } = await supabase
        .from('visit_records')
        .select('vitals, created_at')
        .eq('patient_id', args.patient_id)
        .gte('created_at', daysAgo)
        .order('created_at', { ascending: false })
        .limit(3);

      // 컨디션 체크
      const { data: conditions } = await supabase
        .from('condition_checks')
        .select('mood, sleep_quality, pain_level, symptoms, ai_risk_level, check_date')
        .eq('patient_id', args.patient_id)
        .gte('check_date', daysAgo)
        .order('check_date', { ascending: false })
        .limit(3);

      // 복약 이행률
      const { data: meds } = await supabase
        .from('medication_schedules')
        .select('status')
        .eq('patient_id', args.patient_id)
        .gte('scheduled_date', daysAgo)
        .lte('scheduled_date', today);

      const total = meds?.length ?? 0;
      const taken = meds?.filter((m) => m.status === 'taken').length ?? 0;
      const adherence = total > 0 ? Math.round((taken / total) * 100) : null;

      let summary = '';
      if (vitals?.length) {
        summary += `[바이탈 트렌드]\n`;
        vitals.forEach((v: any) => {
          const d = new Date(v.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
          const vs = v.vitals ?? {};
          summary += `${d}: BP ${vs.systolic_bp ?? '-'}/${vs.diastolic_bp ?? '-'}, HR ${vs.heart_rate ?? '-'}, T ${vs.temperature ?? '-'}°C\n`;
        });
      }
      if (conditions?.length) {
        summary += `\n[컨디션 체크]\n`;
        conditions.forEach((c: any) => {
          summary += `${c.check_date}: 기분=${c.mood ?? '-'}, 수면=${c.sleep_quality ?? '-'}, 통증=${c.pain_level ?? '-'}/10`;
          if (c.symptoms?.length) summary += `, 증상: ${c.symptoms.join(', ')}`;
          if (c.ai_risk_level !== 'normal') summary += ` ⚠️${c.ai_risk_level}`;
          summary += '\n';
        });
      }
      if (adherence !== null) {
        summary += `\n[복약 이행률] ${adherence}% (${taken}/${total})`;
        if (adherence < 80) summary += ' ⚠️ 낮음';
      }

      return summary || '최근 데이터가 없습니다.';
    }

    case 'get_patient_medications': {
      const { data: rxList } = await supabase
        .from('prescriptions')
        .select('medication_name, dosage, frequency, timing, status, dur_warnings, start_date, updated_at')
        .eq('patient_id', args.patient_id)
        .in('status', ['active', 'completed'])
        .order('start_date', { ascending: false })
        .limit(10);

      if (!rxList?.length) return '처방약 정보가 없습니다.';

      return rxList.map((rx: any) => {
        let line = `${rx.status === 'active' ? '💊' : '⏹️'} ${rx.medication_name} ${rx.dosage} — ${rx.frequency} ${rx.timing}`;
        if (rx.dur_warnings?.length > 0) line += ' ⚠️DUR경고';
        return line;
      }).join('\n');
    }

    case 'get_red_flags': {
      const { data: flags } = await supabase
        .from('red_flag_alerts')
        .select('severity, title, description, patient:patients(full_name), created_at')
        .eq('nurse_id', args.nurse_id)
        .in('status', ['active', 'acknowledged'])
        .order('created_at', { ascending: false })
        .limit(5);

      if (!flags?.length) return '현재 활성 레드플래그가 없습니다.';

      return flags.map((f: any) => {
        const icon = f.severity === 'red' ? '🔴' : f.severity === 'orange' ? '🟠' : '🟡';
        return `${icon} ${f.patient?.full_name}: ${f.title}\n   ${f.description ?? ''}`;
      }).join('\n\n');
    }

    case 'get_next_patient': {
      const now = new Date().toTimeString().slice(0, 5);
      const { data: next } = await supabase
        .from('visits')
        .select(`
          scheduled_time, estimated_duration_min,
          patient:patients(id, full_name, care_grade, primary_diagnosis, address)
        `)
        .eq('nurse_id', args.nurse_id)
        .eq('scheduled_date', today)
        .in('status', ['scheduled', 'en_route'])
        .gte('scheduled_time', now)
        .order('scheduled_time', { ascending: true })
        .limit(1)
        .single();

      if (!next) return '오늘 남은 방문이 없습니다.';

      const p = next.patient as any;
      return `다음 방문: ${next.scheduled_time?.slice(0, 5)} — ${p?.full_name} (${p?.care_grade ?? '-'}등급)
주소: ${p?.address ?? '미등록'}
진단: ${p?.primary_diagnosis ?? '없음'}
예상 소요: ${next.estimated_duration_min ?? '--'}분`;
    }

    case 'get_condition_check_results': {
      const ids = args.patient_ids as string[];
      if (!ids?.length) return '환자 ID가 없습니다.';

      const { data: checks } = await supabase
        .from('condition_checks')
        .select('patient_id, mood, sleep_quality, pain_level, symptoms, ai_risk_level, patient:patients(full_name)')
        .in('patient_id', ids)
        .eq('check_date', today);

      if (!checks?.length) return '오늘 컨디션 체크 결과가 없습니다.';

      return checks.map((c: any) => {
        const icon = c.ai_risk_level === 'critical' ? '🔴' : c.ai_risk_level === 'warning' ? '🟠' : '🟢';
        return `${icon} ${c.patient?.full_name}: 기분=${c.mood ?? '-'}, 수면=${c.sleep_quality ?? '-'}, 통증=${c.pain_level ?? '-'}/10${c.symptoms?.length ? `, 증상: ${c.symptoms.join(', ')}` : ''}`;
      }).join('\n');
    }

    default:
      return '알 수 없는 기능입니다.';
  }
}

function buildSystemPrompt(nurseName: string): string {
  return `당신은 "홈케어 어시스턴트"입니다. 간결하고 유능한 업무 비서 페르소나입니다.

## 핵심 지침
- 호칭: "${nurseName}님"
- 존댓말이되 간결, 전문 용어 사용 가능
- 답변 구조: 핵심 먼저 → 상세는 요청 시
- 데이터 기반: 수치와 트렌드 중심 보고
- 판단 보조: "~가 권장됩니다" 형태, 최종 판단은 간호사에게
- 레드플래그 CRITICAL은 최상단 배치
- 이모지로 상태 구분 (🔴긴급 🟠주의 🟢정상)

## 기능
- 오늘 브리핑 (get_today_briefing)
- 환자 상세 요약 (get_patient_summary)
- 처방약 조회 (get_patient_medications)
- 레드플래그 확인 (get_red_flags)
- 다음 환자 정보 (get_next_patient)
- 컨디션 체크 결과 (get_condition_check_results)`;
}

const inputSchema: FieldSchema[] = [
  { name: 'nurse_id', type: 'string', required: true },
  { name: 'message', type: 'string', required: true, maxLength: 5000 },
  { name: 'input_method', type: 'string', required: false },
];

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // 인증 확인
    const authResult = await authenticateRequest(req);
    if (isAuthError(authResult)) return authResult;
    const { user, supabase } = authResult;

    // Rate limiting
    const rateLimitResponse = await checkRateLimit(supabase, user.id, 'agent-nurse-chat');
    if (rateLimitResponse) return rateLimitResponse;

    // 입력 검증
    const input = await parseAndValidate<{
      nurse_id: string;
      message: string;
      input_method?: string;
    }>(req, inputSchema);
    if (isValidationError(input)) return input;
    const { nurse_id, message, input_method = 'text' } = input;

    // 간호사 프로필
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const nurseName = profile?.full_name ?? '간호사';

    // 대화 이력
    const { data: history } = await supabase
      .from('agent_conversations')
      .select('role, content')
      .eq('user_id', user.id)
      .eq('agent_type', 'nurse_agent')
      .order('created_at', { ascending: false })
      .limit(20);

    const conversationHistory = (history ?? []).reverse().map((h) => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }],
    }));
    conversationHistory.push({ role: 'user', parts: [{ text: message }] });

    await supabase.from('agent_conversations').insert({
      user_id: user.id,
      agent_type: 'nurse_agent',
      role: 'user',
      content: message,
      input_method,
    });

    const systemPrompt = buildSystemPrompt(nurseName);
    let geminiResult = await callGemini(systemPrompt, conversationHistory, TOOLS);
    const functionCallLog: unknown[] = [];

    let iterations = 0;
    while (geminiResult.functionCall && iterations < 3) {
      iterations++;
      const { name, args } = geminiResult.functionCall;
      functionCallLog.push({ name, args });

      if (!args.nurse_id) args.nurse_id = nurse_id;

      const functionResult = await executeFunctionCall(supabase, name, args);

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

    const responseText = geminiResult.text ?? '죄송합니다, 일시적 오류가 발생했습니다.';

    await supabase.from('agent_conversations').insert({
      user_id: user.id,
      agent_type: 'nurse_agent',
      role: 'assistant',
      content: responseText,
      function_calls: functionCallLog.length > 0 ? functionCallLog : null,
    });

    return jsonResponse({ response: responseText, function_calls: functionCallLog });
  } catch (err) {
    console.error('간호사 에이전트 오류:', err);
    return errorResponse('INTERNAL_ERROR', '서버 오류가 발생했습니다.', 500);
  }
});
