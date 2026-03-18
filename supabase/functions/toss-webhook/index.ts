// Toss Payments 웹훅 핸들러
// 결제 승인/실패/환불 이벤트를 수신하여 구독 상태를 관리합니다.
//
// 처리 흐름:
// 1. 웹훅 시그니처(HMAC) 검증
// 2. 이벤트 타입별 분기 처리
// 3. 구독 상태 및 결제 이력 업데이트
// 4. 실패 시 재시도 로직

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// HMAC SHA-256 서명 검증
async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );

    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return expectedSignature === signature;
  } catch {
    return false;
  }
}

// Toss Payments 결제 승인 API 호출
async function confirmPayment(paymentKey: string, orderId: string, amount: number): Promise<boolean> {
  const tossSecretKey = Deno.env.get('TOSS_SECRET_KEY');
  if (!tossSecretKey) return false;

  try {
    const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${btoa(tossSecretKey + ':')}`,
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

// 결제 실패 시 다음 재시도 날짜 계산 (3일, 7일, 14일)
function getNextRetryDate(failCount: number): string | null {
  const retryIntervals = [3, 7, 14]; // 일 단위
  if (failCount >= retryIntervals.length) return null; // 최대 재시도 횟수 초과

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + retryIntervals[failCount]);
  return nextDate.toISOString().split('T')[0];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 웹훅 시그니처 검증
    const tossWebhookSecret = Deno.env.get('TOSS_WEBHOOK_SECRET');
    const rawBody = await req.text();

    if (tossWebhookSecret) {
      const signature = req.headers.get('Toss-Signature') || '';
      const isValid = await verifyWebhookSignature(rawBody, signature, tossWebhookSecret);
      if (!isValid) {
        console.error('웹훅 시그니처 검증 실패');
        return new Response(
          JSON.stringify({ code: 'INVALID_SIGNATURE', message: '시그니처 검증에 실패했습니다.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    const event = JSON.parse(rawBody);

    // Toss 웹훅 이벤트 구조
    // event.eventType: 'PAYMENT_STATUS_CHANGED' 등
    // event.data: { paymentKey, orderId, status, ... }
    const eventType = event.eventType;
    const paymentData = event.data;

    if (!eventType || !paymentData) {
      return new Response(
        JSON.stringify({ code: 'BAD_REQUEST', message: '유효하지 않은 웹훅 이벤트입니다.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const paymentKey = paymentData.paymentKey;
    const orderId = paymentData.orderId;
    const status = paymentData.status;
    const amount = paymentData.totalAmount || paymentData.amount;

    // orderId에서 구독 ID 추출 (형식: "sub_{subscription_id}_{timestamp}")
    const subscriptionId = orderId?.split('_')[1];

    if (!subscriptionId) {
      console.error('orderId에서 구독 ID를 추출할 수 없습니다:', orderId);
      return new Response(
        JSON.stringify({ code: 'BAD_REQUEST', message: 'orderId 형식이 올바르지 않습니다.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 구독 정보 조회
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single();

    if (subError || !subscription) {
      console.error('구독 정보 조회 실패:', subError);
      return new Response(
        JSON.stringify({ code: 'NOT_FOUND', message: '구독 정보를 찾을 수 없습니다.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 이벤트 타입별 처리
    switch (status) {
      case 'DONE': {
        // 결제 성공
        // 1. payment_history에 성공 기록 추가
        await supabase.from('payment_history').insert({
          subscription_id: subscriptionId,
          org_id: subscription.org_id,
          amount: amount,
          status: 'paid',
          toss_payment_key: paymentKey,
          toss_order_id: orderId,
          paid_at: new Date().toISOString(),
        });

        // 2. 구독 상태를 활성으로 업데이트
        const nextBillingDate = new Date();
        if (subscription.billing_cycle === 'monthly') {
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
        } else {
          nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
        }

        await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            next_billing_date: nextBillingDate.toISOString().split('T')[0],
          })
          .eq('id', subscriptionId);

        // 3. 기관 관리자에게 결제 성공 알림 발송
        const { data: orgOwner } = await supabase
          .from('organizations')
          .select('owner_id')
          .eq('id', subscription.org_id)
          .single();

        if (orgOwner) {
          try {
            await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                user_ids: [orgOwner.owner_id],
                type: 'payment_success',
                title: '구독 결제 완료',
                body: `${subscription.plan.toUpperCase()} 플랜 정기 결제가 완료되었습니다. (${amount.toLocaleString()}원)`,
                data: { subscription_id: subscriptionId, amount },
                channels: ['in_app'],
              }),
            });
          } catch (notifErr) {
            console.error('결제 성공 알림 발송 실패:', notifErr);
          }
        }

        console.log(`결제 성공: 구독 ${subscriptionId}, 금액 ${amount}원`);
        break;
      }

      case 'ABORTED':
      case 'EXPIRED': {
        // 결제 실패
        // 1. payment_history에 실패 기록 추가
        await supabase.from('payment_history').insert({
          subscription_id: subscriptionId,
          org_id: subscription.org_id,
          amount: amount || subscription.amount,
          status: 'failed',
          toss_payment_key: paymentKey,
          toss_order_id: orderId,
        });

        // 2. 실패 횟수 확인 (최근 결제 실패 건수)
        const { count: failCount } = await supabase
          .from('payment_history')
          .select('*', { count: 'exact', head: true })
          .eq('subscription_id', subscriptionId)
          .eq('status', 'failed')
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

        const currentFailCount = failCount ?? 0;
        const nextRetryDate = getNextRetryDate(currentFailCount);

        // 3. 구독 상태 업데이트
        if (nextRetryDate) {
          // 재시도 가능: past_due 상태로 변경, 다음 결제일을 재시도일로 설정
          await supabase
            .from('subscriptions')
            .update({
              status: 'past_due',
              next_billing_date: nextRetryDate,
            })
            .eq('id', subscriptionId);
        } else {
          // 최대 재시도 초과: 구독 해지
          await supabase
            .from('subscriptions')
            .update({
              status: 'cancelled',
              cancelled_at: new Date().toISOString(),
            })
            .eq('id', subscriptionId);

          // 기관 플랜을 free로 다운그레이드
          await supabase
            .from('organizations')
            .update({ subscription_plan: 'free' })
            .eq('id', subscription.org_id);
        }

        // 4. 기관 관리자에게 결제 실패 알림
        const { data: orgOwnerFail } = await supabase
          .from('organizations')
          .select('owner_id')
          .eq('id', subscription.org_id)
          .single();

        if (orgOwnerFail) {
          try {
            await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                user_ids: [orgOwnerFail.owner_id],
                type: 'payment_failed',
                title: '구독 결제 실패',
                body: nextRetryDate
                  ? `정기 결제가 실패했습니다. ${nextRetryDate}에 재시도됩니다. 결제 수단을 확인해주세요.`
                  : '정기 결제가 반복 실패하여 구독이 해지되었습니다. 서비스 이용을 위해 재구독해주세요.',
                data: {
                  subscription_id: subscriptionId,
                  fail_count: currentFailCount,
                  next_retry: nextRetryDate,
                },
                channels: ['in_app', 'push', 'kakao_alimtalk'],
              }),
            });
          } catch (notifErr) {
            console.error('결제 실패 알림 발송 실패:', notifErr);
          }
        }

        console.log(`결제 실패: 구독 ${subscriptionId}, 실패 횟수 ${currentFailCount}`);
        break;
      }

      case 'CANCELED': {
        // 결제 취소/환불
        await supabase.from('payment_history').insert({
          subscription_id: subscriptionId,
          org_id: subscription.org_id,
          amount: -(amount || 0),
          status: 'refunded',
          toss_payment_key: paymentKey,
          toss_order_id: orderId,
        });

        console.log(`결제 환불: 구독 ${subscriptionId}, 금액 ${amount}원`);
        break;
      }

      default:
        console.log(`처리되지 않은 이벤트 상태: ${status}`);
    }

    // 웹훅 처리 성공 응답 (200 OK)
    return new Response(
      JSON.stringify({ success: true, event_type: eventType, status }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('Toss 웹훅 처리 중 예외:', err);
    return new Response(
      JSON.stringify({ code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
