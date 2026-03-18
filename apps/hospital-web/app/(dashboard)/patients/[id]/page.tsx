'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { PatientDetail } from '@/components/patients/PatientDetail';
import { VitalsChart } from '@/components/patients/VitalsChart';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge, getStatusBadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import { ArrowLeft, Clock, User, AlertTriangle } from 'lucide-react';
import type { Tables } from '@homecare/shared-types';

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;

  const { data: patient, isLoading: patientLoading } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();
      return data as Tables<'patients'> | null;
    },
  });

  const { data: servicePlan } = useQuery({
    queryKey: ['patient-plan', patientId],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase
        .from('service_plans')
        .select('*')
        .eq('patient_id', patientId)
        .eq('status', 'active')
        .single();
      return data as Tables<'service_plans'> | null;
    },
  });

  const { data: vitalsData = [] } = useQuery({
    queryKey: ['patient-vitals', patientId],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase
        .from('visit_records')
        .select('vitals, created_at')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: true })
        .limit(30);

      return (data || []).map((r: { vitals: Record<string, number>; created_at: string }) => ({
        date: new Date(r.created_at).toLocaleDateString('ko-KR', {
          month: 'short',
          day: 'numeric',
        }),
        systolic_bp: r.vitals?.systolic_bp,
        diastolic_bp: r.vitals?.diastolic_bp,
        heart_rate: r.vitals?.heart_rate,
        temperature: r.vitals?.temperature,
        blood_sugar: r.vitals?.blood_sugar,
        spo2: r.vitals?.spo2,
        weight: r.vitals?.weight,
      }));
    },
  });

  const { data: recentVisits = [] } = useQuery({
    queryKey: ['patient-visits', patientId],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase
        .from('visits')
        .select('*, staff(profiles(full_name))')
        .eq('patient_id', patientId)
        .order('scheduled_date', { ascending: false })
        .limit(10);
      return (data || []) as (Tables<'visits'> & {
        staff: { profiles: { full_name: string } | null } | null;
      })[];
    },
  });

  const { data: redFlags = [] } = useQuery({
    queryKey: ['patient-redflags', patientId],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase
        .from('red_flag_alerts')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(5);
      return (data || []) as Tables<'red_flag_alerts'>[];
    },
  });

  const visitStatusLabels: Record<string, string> = {
    scheduled: '예정',
    en_route: '이동중',
    checked_in: '도착',
    in_progress: '진행중',
    completed: '완료',
    cancelled: '취소',
    no_show: '미방문',
  };

  if (patientLoading) return <Loading />;
  if (!patient) {
    return (
      <div className="py-14 text-center text-on-surface-variant">
        환자를 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          뒤로
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-on-surface">
          {patient.full_name}
        </h1>
      </div>

      <PatientDetail patient={patient} servicePlan={servicePlan} />

      {/* Vitals charts */}
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <VitalsChart data={vitalsData} type="bp" />
        <VitalsChart data={vitalsData} type="weight" />
      </div>

      {/* Recent visits */}
      <Card>
        <CardHeader>
          <CardTitle>최근 방문 기록</CardTitle>
        </CardHeader>
        {recentVisits.length === 0 ? (
          <p className="py-8 text-center text-sm text-on-surface-variant">
            방문 기록이 없습니다.
          </p>
        ) : (
          <div className="space-y-2">
            {recentVisits.map((visit, idx) => (
              <div
                key={visit.id}
                className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                  idx % 2 === 0 ? 'bg-surface-container-low/50' : 'bg-white'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="text-sm text-on-surface-variant">
                    <Clock className="mb-0.5 mr-1 inline h-3.5 w-3.5" />
                    {visit.scheduled_date}
                    {visit.scheduled_time && ` ${visit.scheduled_time.slice(0, 5)}`}
                  </div>
                  <div className="text-sm text-on-surface">
                    <User className="mb-0.5 mr-1 inline h-3.5 w-3.5 text-on-surface-variant" />
                    {visit.staff?.profiles?.full_name || '-'}
                  </div>
                  {visit.actual_duration_min && (
                    <div className="text-xs text-on-surface-variant">
                      {visit.actual_duration_min}분
                    </div>
                  )}
                </div>
                <Badge variant={getStatusBadgeVariant(visit.status)}>
                  {visitStatusLabels[visit.status] || visit.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Red flag history */}
      <Card>
        <CardHeader>
          <CardTitle>레드플래그 이력</CardTitle>
        </CardHeader>
        {redFlags.length === 0 ? (
          <p className="py-8 text-center text-sm text-on-surface-variant">
            레드플래그 이력이 없습니다.
          </p>
        ) : (
          <div className="space-y-2">
            {redFlags.map((flag, idx) => (
              <div
                key={flag.id}
                className={`flex items-start gap-3 rounded-xl px-4 py-3 ${
                  idx % 2 === 0 ? 'bg-surface-container-low/50' : 'bg-white'
                }`}
              >
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-error/10">
                  <AlertTriangle
                    className={`h-3.5 w-3.5 ${
                      flag.severity === 'red'
                        ? 'text-error'
                        : flag.severity === 'orange'
                          ? 'text-tertiary'
                          : 'text-on-secondary-container'
                    }`}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-on-surface">{flag.title}</span>
                    <Badge variant={getStatusBadgeVariant(flag.status)}>
                      {flag.status === 'active'
                        ? '활성'
                        : flag.status === 'acknowledged'
                          ? '확인됨'
                          : flag.status === 'resolved'
                            ? '해결됨'
                            : '오탐'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    {flag.description}
                  </p>
                  <p className="mt-1.5 text-[11px] text-on-surface-variant/60">
                    {new Date(flag.created_at).toLocaleString('ko-KR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
