// 복용 알람 트리거 (pg_cron 1분 간격 호출)
// 처리 흐름:
// 1. 현재 시간 ±5분 내 pending 복용 스케줄 조회
// 2. 해당 환자에게 푸시 알림 발송
// 3. 30분 경과 미응답 → 재알림 (reminder_count 증가)
// 4. 60분 경과 미응답 → missed 처리 + 간호사 알림

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // 이 함수는 pg_cron에서 호출되므로 서비스 롤 키로 직접 인증
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM

    // 현재 시간 기준 ±5분 범위 계산
    const fiveMinBefore = new Date(now.getTime() - 5 * 60 * 1000).toTimeString().slice(0, 5);
    const fiveMinAfter = new Date(now.getTime() + 5 * 60 * 1000).toTimeString().slice(0, 5);

    // 1. 알림 대상 조회: pending 상태 + 오늘 + 현재 시간 범위
    const { data: pendingSchedules } = await supabase
      .from('medication_schedules')
      .select(`
        id, scheduled_time, reminder_count, patient_id, created_at,
        prescription:prescriptions(medication_name, dosage, timing)
      `)
      .eq('scheduled_date', today)
      .eq('status', 'pending')
      .gte('scheduled_time', fiveMinBefore)
      .lte('scheduled_time', fiveMinAfter);

    let sentCount = 0;

    for (const schedule of pendingSchedules ?? []) {
      const rx = schedule.prescription as any;
      const patientId = schedule.patient_id;

      // 보호자 ID 조회 (푸시 알림 대상)
      const { data: links } = await supabase
        .from('guardian_patient_links')
        .select('guardian_id')
        .eq('patient_id', patientId)
        .eq('is_primary', true)
        .limit(1);

      const guardianId = links?.[0]?.guardian_id;
      if (!guardianId) continue;

      // 환자 이름 조회
      const { data: patient } = await supabase
        .from('patients')
        .select('full_name, gender')
        .eq('id', patientId)
        .single();

      const honorific = patient?.gender === 'male' ? '아버님' : '어머님';
      const name = patient?.full_name ?? '어르신';

      // 푸시 알림 발송
      await supabase.from('notifications').insert({
        user_id: guardianId,
        type: 'medication_reminder',
        title: '💊 약 드실 시간이에요',
        body: `${name} ${honorific}, ${rx?.medication_name} ${rx?.dosage} 드실 시간이에요~`,
        data: {
          schedule_id: schedule.id,
          medication_name: rx?.medication_name,
          patient_id: patientId,
        },
        channels: ['push', 'in_app'],
      });

      // reminder_count 증가
      await supabase
        .from('medication_schedules')
        .update({ reminder_count: (schedule.reminder_count ?? 0) + 1 })
        .eq('id', schedule.id);

      sentCount++;
    }

    // 2. 30분 경과 재알림 대상 (reminder_count = 1, 30분 전 시간)
    const thirtyMinBefore = new Date(now.getTime() - 30 * 60 * 1000).toTimeString().slice(0, 5);
    const thirtyFiveMinBefore = new Date(now.getTime() - 35 * 60 * 1000).toTimeString().slice(0, 5);

    const { data: reRemindSchedules } = await supabase
      .from('medication_schedules')
      .select(`
        id, scheduled_time, reminder_count, patient_id,
        prescription:prescriptions(medication_name, dosage)
      `)
      .eq('scheduled_date', today)
      .eq('status', 'pending')
      .eq('reminder_count', 1)
      .gte('scheduled_time', thirtyFiveMinBefore)
      .lte('scheduled_time', thirtyMinBefore);

    for (const schedule of reRemindSchedules ?? []) {
      const rx = schedule.prescription as any;
      const { data: links } = await supabase
        .from('guardian_patient_links')
        .select('guardian_id')
        .eq('patient_id', schedule.patient_id)
        .eq('is_primary', true)
        .limit(1);

      const guardianId = links?.[0]?.guardian_id;
      if (!guardianId) continue;

      await supabase.from('notifications').insert({
        user_id: guardianId,
        type: 'medication_reminder',
        title: '💊 약 아직 안 드셨어요~',
        body: `${rx?.medication_name} 아직 안 드셨으면 지금 드세요~`,
        data: { schedule_id: schedule.id, patient_id: schedule.patient_id },
        channels: ['push', 'in_app'],
      });

      await supabase
        .from('medication_schedules')
        .update({ reminder_count: 2 })
        .eq('id', schedule.id);
    }

    // 3. 60분 경과 → missed 처리 + 간호사 알림
    const sixtyMinBefore = new Date(now.getTime() - 60 * 60 * 1000).toTimeString().slice(0, 5);
    const sixtyFiveMinBefore = new Date(now.getTime() - 65 * 60 * 1000).toTimeString().slice(0, 5);

    const { data: missedSchedules } = await supabase
      .from('medication_schedules')
      .select(`
        id, patient_id,
        prescription:prescriptions(medication_name)
      `)
      .eq('scheduled_date', today)
      .eq('status', 'pending')
      .gte('reminder_count', 2)
      .gte('scheduled_time', sixtyFiveMinBefore)
      .lte('scheduled_time', sixtyMinBefore)
      .eq('nurse_notified', false);

    for (const schedule of missedSchedules ?? []) {
      const rx = schedule.prescription as any;

      // missed 처리
      await supabase
        .from('medication_schedules')
        .update({ status: 'missed', nurse_notified: true })
        .eq('id', schedule.id);

      // 담당 간호사에게 알림
      const { data: plans } = await supabase
        .from('service_plans')
        .select('nurse_id')
        .eq('patient_id', schedule.patient_id)
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
          const { data: patient } = await supabase
            .from('patients')
            .select('full_name')
            .eq('id', schedule.patient_id)
            .single();

          await supabase.from('notifications').insert({
            user_id: staff.user_id,
            type: 'medication_missed',
            title: '⚠️ 환자 복약 미이행',
            body: `${patient?.full_name ?? '환자'}님이 ${rx?.medication_name} 복용을 1시간 이상 하지 않았습니다.`,
            data: { schedule_id: schedule.id, patient_id: schedule.patient_id },
            channels: ['push', 'in_app'],
          });
        }
      }
    }

    return jsonResponse({
      success: true,
      reminders_sent: sentCount,
      re_reminders: reRemindSchedules?.length ?? 0,
      missed: missedSchedules?.length ?? 0,
    });
  } catch (err) {
    console.error('복약 알람 오류:', err);
    return errorResponse('INTERNAL_ERROR', '서버 오류', 500);
  }
});
