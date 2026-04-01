// 알림 발송 디스패처
// 인앱 알림, 푸시 알림, 카카오 알림톡 채널을 지원합니다.
// Input: {
//   user_ids: string[],
//   type: string,
//   title: string,
//   body: string,
//   data?: Record<string, unknown>,
//   channels?: ('in_app' | 'push' | 'kakao_alimtalk')[]
// }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { parseAndValidate, isValidationError, type FieldSchema } from '../_shared/validate.ts';

// Expo Push API로 푸시 알림 발송
async function sendExpoPush(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, unknown>,
): Promise<{ success: number; failed: number }> {
  if (tokens.length === 0) return { success: 0, failed: 0 };

  // Expo Push API는 최대 100개씩 배치 발송
  const batchSize = 100;
  let success = 0;
  let failed = 0;

  for (let i = 0; i < tokens.length; i += batchSize) {
    const batch = tokens.slice(i, i + batchSize);
    const messages = batch.map((token) => ({
      to: token,
      sound: 'default',
      title,
      body,
      data,
    }));

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      if (response.ok) {
        const result = await response.json();
        // Expo API는 각 메시지별 성공/실패를 반환
        if (result.data) {
          result.data.forEach((item: { status: string }) => {
            if (item.status === 'ok') success++;
            else failed++;
          });
        }
      } else {
        failed += batch.length;
        console.error('Expo Push API 응답 오류:', response.status);
      }
    } catch (err) {
      failed += batch.length;
      console.error('Expo Push API 호출 실패:', err);
    }
  }

  return { success, failed };
}

// 카카오 알림톡 발송 (비즈메시지 API)
async function sendKakaoAlimtalk(
  phones: string[],
  title: string,
  body: string,
): Promise<{ success: number; failed: number }> {
  const kakaoApiKey = Deno.env.get('KAKAO_ALIMTALK_API_KEY');
  const senderKey = Deno.env.get('KAKAO_ALIMTALK_SENDER_KEY');
  const templateCode = Deno.env.get('KAKAO_ALIMTALK_TEMPLATE_CODE');

  if (!kakaoApiKey || !senderKey || !templateCode) {
    console.warn('카카오 알림톡 설정이 없습니다. 발송을 건너뜁니다.');
    return { success: 0, failed: 0 };
  }

  let success = 0;
  let failed = 0;

  for (const phone of phones) {
    try {
      // 전화번호 형식 정리 (하이픈 제거)
      const cleanPhone = phone.replace(/-/g, '');

      const response = await fetch('https://kapi.kakao.com/v2/api/talk/memo/default/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `KakaoAK ${kakaoApiKey}`,
        },
        body: JSON.stringify({
          senderKey,
          templateCode,
          recipientList: [
            {
              recipientNo: cleanPhone,
              templateParameter: {
                title,
                body: body.substring(0, 1000), // 알림톡 본문 길이 제한
              },
            },
          ],
        }),
      });

      if (response.ok) {
        success++;
      } else {
        failed++;
        const errorText = await response.text();
        console.error(`카카오 알림톡 발송 실패 (${cleanPhone}):`, errorText);
      }
    } catch (err) {
      failed++;
      console.error('카카오 알림톡 API 호출 실패:', err);
    }
  }

  return { success, failed };
}

const inputSchema: FieldSchema[] = [
  { name: 'user_ids', type: 'array', required: true, maxLength: 1000 },
  { name: 'type', type: 'string', required: true, maxLength: 100 },
  { name: 'title', type: 'string', required: true, maxLength: 200 },
  { name: 'body', type: 'string', required: true, maxLength: 2000 },
];

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // 인증 확인 — 서비스 롤 키 또는 인증된 사용자 모두 허용
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('UNAUTHORIZED', '인증 토큰이 필요합니다.', 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const isServiceRole = authHeader.includes(supabaseServiceKey);
    if (!isServiceRole) {
      const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
      if (authError || !user) {
        return errorResponse('UNAUTHORIZED', '유효하지 않은 인증 토큰입니다.', 401);
      }
    }

    // 입력 검증
    const input = await parseAndValidate<{
      user_ids: string[];
      type: string;
      title: string;
      body: string;
      data?: Record<string, unknown>;
      channels?: string[];
    }>(req, inputSchema);
    if (isValidationError(input)) return input;

    const { user_ids, type, title, body, data = {}, channels = ['in_app', 'push'] } = input;

    const results = {
      in_app: { success: 0, failed: 0 },
      push: { success: 0, failed: 0 },
      kakao_alimtalk: { success: 0, failed: 0 },
    };

    // 1. 인앱 알림 저장
    if (channels.includes('in_app')) {
      const notificationRecords = user_ids.map((userId: string) => ({
        user_id: userId,
        type,
        title,
        body,
        data,
        channels,
        read: false,
        push_sent: false,
        kakao_sent: false,
      }));

      const { data: insertedNotifs, error: insertError } = await supabase
        .from('notifications')
        .insert(notificationRecords)
        .select('id');

      if (insertError) {
        console.error('인앱 알림 저장 실패:', insertError);
        results.in_app.failed = user_ids.length;
      } else {
        results.in_app.success = insertedNotifs?.length ?? 0;
      }
    }

    // 2. 푸시 알림 발송
    if (channels.includes('push')) {
      // 사용자들의 푸시 토큰 조회
      const { data: pushTokenData } = await supabase
        .from('push_tokens')
        .select('user_id, expo_push_token')
        .in('user_id', user_ids)
        .eq('is_active', true);

      const tokens = (pushTokenData || []).map((t: { expo_push_token: string }) => t.expo_push_token);

      if (tokens.length > 0) {
        results.push = await sendExpoPush(tokens, title, body, data);

        // 푸시 발송 상태 업데이트
        if (results.push.success > 0) {
          await supabase
            .from('notifications')
            .update({ push_sent: true })
            .in('user_id', user_ids)
            .eq('type', type)
            .eq('push_sent', false)
            .order('created_at', { ascending: false })
            .limit(user_ids.length);
        }
      }
    }

    // 3. 카카오 알림톡 발송
    if (channels.includes('kakao_alimtalk')) {
      // 사용자들의 전화번호 조회
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, phone')
        .in('id', user_ids)
        .not('phone', 'is', null);

      const phones = (profileData || [])
        .filter((p: { phone: string | null }) => p.phone)
        .map((p: { phone: string }) => p.phone);

      if (phones.length > 0) {
        results.kakao_alimtalk = await sendKakaoAlimtalk(phones, title, body);

        // 카카오 발송 상태 업데이트
        if (results.kakao_alimtalk.success > 0) {
          await supabase
            .from('notifications')
            .update({ kakao_sent: true })
            .in('user_id', user_ids)
            .eq('type', type)
            .eq('kakao_sent', false)
            .order('created_at', { ascending: false })
            .limit(user_ids.length);
        }
      }
    }

    // 응답 반환
    return jsonResponse({
      user_count: user_ids.length,
      channels_used: channels,
      results,
    });
  } catch (err) {
    console.error('알림 발송 중 예외:', err);
    return errorResponse('INTERNAL_ERROR', '서버 오류가 발생했습니다.', 500);
  }
});
