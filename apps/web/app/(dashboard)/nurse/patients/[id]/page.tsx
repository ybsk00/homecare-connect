'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge, getStatusBadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import {
  ArrowLeft,
  User,
  Heart,
  Activity,
  Thermometer,
  Droplets,
  Calendar,
  FileText,
  Clock,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const statusLabels: Record<string, string> = {
  scheduled: '예정',
  en_route: '이동중',
  checked_in: '체크인',
  in_progress: '진행중',
  completed: '완료',
  cancelled: '취소',
  no_show: '미방문',
};

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // Patient info
  const { data: patient, isLoading: patientLoading } = useQuery({
    queryKey: ['patient-detail', id],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase
        .from('patients')
        .select('id, full_name, birth_date, gender, care_grade, primary_diagnosis, address, phone, special_notes, status')
        .eq('id', id)
        .single();
      return data as {
        id: string;
        full_name: string;
        birth_date: string | null;
        gender: string | null;
        care_grade: string | null;
        primary_diagnosis: string | null;
        address: string | null;
        phone: string | null;
        special_notes: string | null;
        status: string;
      } | null;
    },
  });

  // Vital history (last 30 days) - vitals stored as JSONB in visit_records
  const { data: vitalHistory = [] } = useQuery({
    queryKey: ['patient-vitals', id],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data } = await supabase
        .from('visit_records')
        .select('vitals, created_at')
        .eq('patient_id', id)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      return (data ?? [])
        .filter((r: Record<string, unknown>) => r.vitals && Object.keys(r.vitals as object).length > 0)
        .map((r: Record<string, unknown>) => {
          const vitals = (r.vitals ?? {}) as Record<string, unknown>;
          return {
            date: new Date(r.created_at as string).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
            systolic_bp: (vitals.systolic_bp as number) ?? null,
            diastolic_bp: (vitals.diastolic_bp as number) ?? null,
            heart_rate: (vitals.heart_rate as number) ?? null,
            temperature: (vitals.temperature as number) ?? null,
            spo2: (vitals.spo2 as number) ?? null,
          };
        });
    },
  });

  // Visit history
  const { data: visitHistory = [] } = useQuery({
    queryKey: ['patient-visits', id],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase
        .from('visits')
        .select('id, scheduled_date, scheduled_time, status, checkin_at, checkout_at, actual_duration_min')
        .eq('patient_id', id)
        .order('scheduled_date', { ascending: false })
        .limit(20);
      return (data ?? []) as Array<{
        id: string;
        scheduled_date: string;
        scheduled_time: string | null;
        status: string;
        checkin_at: string | null;
        checkout_at: string | null;
        actual_duration_min: number | null;
      }>;
    },
  });

  // Service plans
  const { data: servicePlans = [] } = useQuery({
    queryKey: ['patient-service-plans', id],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase
        .from('service_plans')
        .select('id, visit_frequency, start_date, end_date, status, goals')
        .eq('patient_id', id)
        .order('created_at', { ascending: false });
      return (data ?? []) as Array<{
        id: string;
        visit_frequency: string;
        start_date: string | null;
        end_date: string | null;
        status: string;
        goals: string | null;
      }>;
    },
  });

  const calculateAge = (dob: string | null): number | null => {
    if (!dob) return null;
    const birth = new Date(dob);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return age;
  };

  if (patientLoading) return <Loading />;

  if (!patient) {
    return (
      <div className="py-14 text-center text-on-surface-variant">
        환자 정보를 찾을 수 없습니다.
      </div>
    );
  }

  const age = calculateAge(patient.birth_date);

  return (
    <div className="space-y-10">
      {/* Back button + Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          뒤로
        </Button>
      </div>

      {/* Patient info header */}
      <Card elevated>
        <div className="flex items-start gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-container">
            <User className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-on-surface">{patient.full_name}</h1>
              {patient.care_grade && (
                <Badge variant="primary">{patient.care_grade}등급</Badge>
              )}
              <Badge variant={getStatusBadgeVariant(patient.status)}>
                {patient.status === 'active' ? '활성' : patient.status}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-on-surface-variant">
              {age !== null && <span>{age}세</span>}
              {patient.gender && <span>{patient.gender === 'male' ? '남성' : '여성'}</span>}
              {patient.primary_diagnosis && <span>{patient.primary_diagnosis}</span>}
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-on-surface-variant/70">
              {patient.phone && <span>연락처: {patient.phone}</span>}
              {patient.address && <span>주소: {patient.address}</span>}
              {patient.special_notes && (
                <span>특이사항: {patient.special_notes}</span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Vital history chart - BP */}
      <Card className="bg-surface-container-lowest ambient-shadow">
        <CardHeader>
          <CardTitle>
            <Heart className="mr-2 inline h-5 w-5 text-secondary" />
            혈압 추이
          </CardTitle>
          <span className="text-xs text-on-surface-variant">(mmHg)</span>
        </CardHeader>
        {vitalHistory.length === 0 ? (
          <div className="py-12 text-center">
            <Heart className="mx-auto h-10 w-10 text-on-surface-variant/20" />
            <p className="mt-3 text-sm text-on-surface-variant">
              바이탈 데이터가 없습니다.
            </p>
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={vitalHistory} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-outline-variant/30" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-on-surface-variant" tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} className="fill-on-surface-variant" tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 16,
                    border: 'none',
                    boxShadow: '0 10px 40px rgba(24,28,30,0.1)',
                    fontSize: 12,
                    padding: '12px 16px',
                    backgroundColor: 'var(--color-surface-container-lowest)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
                <Line type="monotone" dataKey="systolic_bp" name="수축기" stroke="var(--color-secondary)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--color-secondary)', strokeWidth: 0 }} connectNulls />
                <Line type="monotone" dataKey="diastolic_bp" name="이완기" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--color-primary)', strokeWidth: 0 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Vital history chart - HR, Temp, SpO2 */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="bg-surface-container-lowest ambient-shadow">
          <CardHeader>
            <CardTitle>
              <Activity className="mr-2 inline h-5 w-5 text-secondary" />
              심박수
            </CardTitle>
          </CardHeader>
          {vitalHistory.length === 0 ? (
            <div className="py-8 text-center">
              <Activity className="mx-auto h-8 w-8 text-on-surface-variant/20" />
              <p className="mt-2 text-sm text-on-surface-variant">데이터 없음</p>
            </div>
          ) : (
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={vitalHistory}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-outline-variant/30" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} className="fill-on-surface-variant" tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} className="fill-on-surface-variant" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 10px 40px rgba(24,28,30,0.1)', fontSize: 12, backgroundColor: 'var(--color-surface-container-lowest)' }} />
                  <Line type="monotone" dataKey="heart_rate" name="심박수" stroke="var(--color-secondary)" strokeWidth={2} dot={{ r: 2, fill: 'var(--color-secondary)', strokeWidth: 0 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="bg-surface-container-lowest ambient-shadow">
          <CardHeader>
            <CardTitle>
              <Thermometer className="mr-2 inline h-5 w-5 text-tertiary" />
              체온
            </CardTitle>
          </CardHeader>
          {vitalHistory.length === 0 ? (
            <div className="py-8 text-center">
              <Thermometer className="mx-auto h-8 w-8 text-on-surface-variant/20" />
              <p className="mt-2 text-sm text-on-surface-variant">데이터 없음</p>
            </div>
          ) : (
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={vitalHistory}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-outline-variant/30" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} className="fill-on-surface-variant" tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} className="fill-on-surface-variant" tickLine={false} axisLine={false} domain={[35, 40]} />
                  <Tooltip contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 10px 40px rgba(24,28,30,0.1)', fontSize: 12, backgroundColor: 'var(--color-surface-container-lowest)' }} />
                  <Line type="monotone" dataKey="temperature" name="체온" stroke="var(--color-tertiary)" strokeWidth={2} dot={{ r: 2, fill: 'var(--color-tertiary)', strokeWidth: 0 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="bg-surface-container-lowest ambient-shadow">
          <CardHeader>
            <CardTitle>
              <Droplets className="mr-2 inline h-5 w-5 text-secondary" />
              산소포화도
            </CardTitle>
          </CardHeader>
          {vitalHistory.length === 0 ? (
            <div className="py-8 text-center">
              <Droplets className="mx-auto h-8 w-8 text-on-surface-variant/20" />
              <p className="mt-2 text-sm text-on-surface-variant">데이터 없음</p>
            </div>
          ) : (
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={vitalHistory}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-outline-variant/30" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} className="fill-on-surface-variant" tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} className="fill-on-surface-variant" tickLine={false} axisLine={false} domain={[85, 100]} />
                  <Tooltip contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 10px 40px rgba(24,28,30,0.1)', fontSize: 12, backgroundColor: 'var(--color-surface-container-lowest)' }} />
                  <Line type="monotone" dataKey="spo2" name="SpO2" stroke="var(--color-secondary)" strokeWidth={2} dot={{ r: 2, fill: 'var(--color-secondary)', strokeWidth: 0 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* Visit history timeline */}
      <Card className="ambient-shadow">
        <CardHeader>
          <CardTitle>
            <Calendar className="mr-2 inline h-5 w-5 text-primary" />
            방문 이력
          </CardTitle>
        </CardHeader>
        {visitHistory.length === 0 ? (
          <div className="py-10 text-center">
            <Calendar className="mx-auto h-10 w-10 text-on-surface-variant/20" />
            <p className="mt-3 text-sm text-on-surface-variant">방문 이력이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visitHistory.map((visit) => (
              <div
                key={visit.id}
                className="flex items-center gap-4 rounded-xl bg-surface-container-low p-4 transition-colors hover:bg-surface-container-high/50 cursor-pointer"
                onClick={() => router.push(`/nurse/visits/${visit.id}`)}
              >
                <div className="flex h-10 w-10 flex-col items-center justify-center rounded-xl bg-white text-center">
                  <span className="text-[10px] text-on-surface-variant">
                    {new Date(visit.scheduled_date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-on-surface">
                      {visit.scheduled_time?.slice(0, 5) || '--:--'}
                    </span>
                    <Badge variant={getStatusBadgeVariant(visit.status)}>
                      {statusLabels[visit.status] || visit.status}
                    </Badge>
                  </div>
                </div>
                {visit.actual_duration_min && (
                  <span className="flex items-center gap-1 text-xs text-on-surface-variant">
                    <Clock className="h-3 w-3" />
                    {visit.actual_duration_min}분
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Service plans */}
      <Card className="ambient-shadow">
        <CardHeader>
          <CardTitle>
            <FileText className="mr-2 inline h-5 w-5 text-primary" />
            서비스 계획
          </CardTitle>
        </CardHeader>
        {servicePlans.length === 0 ? (
          <div className="py-10 text-center">
            <FileText className="mx-auto h-10 w-10 text-on-surface-variant/20" />
            <p className="mt-3 text-sm text-on-surface-variant">서비스 계획이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {servicePlans.map((plan) => (
              <div key={plan.id} className="rounded-xl bg-surface-container-low p-4">
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusBadgeVariant(plan.status)}>{plan.status}</Badge>
                  {plan.visit_frequency && (
                    <span className="text-xs text-on-surface-variant">{plan.visit_frequency}</span>
                  )}
                </div>
                <p className="mt-1 text-xs text-on-surface-variant">
                  {plan.start_date ?? '-'} ~ {plan.end_date || '진행중'}
                </p>
                {plan.goals && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-on-surface-variant">목표:</p>
                    <p className="mt-1 text-xs text-on-surface-variant">{plan.goals}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
