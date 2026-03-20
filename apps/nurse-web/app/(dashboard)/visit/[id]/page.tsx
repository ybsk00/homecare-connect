'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge, getStatusBadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Loading } from '@/components/ui/Loading';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Heart,
  Activity,
  Thermometer,
  Droplets,
  ClipboardCheck,
  FileText,
  LogOut,
  CheckCircle2,
  PlayCircle,
} from 'lucide-react';
import { clsx } from 'clsx';

type VisitTab = 'checkin' | 'vitals' | 'checklist' | 'notes' | 'checkout';

const tabs: { key: VisitTab; label: string; icon: typeof Clock }[] = [
  { key: 'checkin', label: '체크인', icon: MapPin },
  { key: 'vitals', label: '바이탈 측정', icon: Heart },
  { key: 'checklist', label: '케어 체크리스트', icon: ClipboardCheck },
  { key: 'notes', label: '메모/노트', icon: FileText },
  { key: 'checkout', label: '체크아웃', icon: LogOut },
];

const statusLabels: Record<string, string> = {
  scheduled: '예정',
  en_route: '이동중',
  checked_in: '체크인',
  in_progress: '진행중',
  completed: '완료',
  cancelled: '취소',
  no_show: '미방문',
};

const defaultChecklist = [
  '환자 상태 확인',
  '복약 확인',
  '상처/피부 상태 확인',
  '영양 상태 확인',
  '활동/운동 상태 확인',
  '환경 안전 확인',
  '보호자 상담',
];

export default function VisitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<VisitTab>('checkin');

  // Vitals form
  const [systolicBp, setSystolicBp] = useState('');
  const [diastolicBp, setDiastolicBp] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [temperature, setTemperature] = useState('');
  const [spo2, setSpo2] = useState('');

  // Checklist
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  // Notes
  const [notes, setNotes] = useState('');

  // Visit data
  const { data: visit, isLoading } = useQuery({
    queryKey: ['visit-detail', id],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase
        .from('visits')
        .select(`
          id,
          scheduled_date,
          scheduled_time,
          estimated_duration_min,
          status,
          checkin_at,
          checkout_at,
          actual_duration_min,
          patient:patients(id, full_name, care_grade, primary_diagnosis, address, phone),
          visit_record:visit_records(id, vitals, performed_items, nurse_note, general_condition)
        `)
        .eq('id', id)
        .single();
      return data as {
        id: string;
        scheduled_date: string;
        scheduled_time: string | null;
        estimated_duration_min: number | null;
        status: string;
        checkin_at: string | null;
        checkout_at: string | null;
        actual_duration_min: number | null;
        patient: {
          id: string;
          full_name: string;
          care_grade: string | null;
          primary_diagnosis: string | null;
          address: string | null;
          phone: string | null;
        };
        visit_record: {
          id: string;
          vitals: Record<string, unknown>;
          performed_items: unknown[];
          nurse_note: string | null;
          general_condition: string | null;
        } | null;
      } | null;
    },
  });

  // Initialize form data from visit
  useEffect(() => {
    if (visit) {
      setNotes(visit.visit_record?.nurse_note || '');
      // Initialize checklist with defaults (performed_items from visit_record can pre-fill)
      const initial: Record<string, boolean> = {};
      const performedItems = (visit.visit_record?.performed_items ?? []) as Array<{ item?: string; done?: boolean }>;
      defaultChecklist.forEach((item) => {
        const found = performedItems.find((pi) => pi.item === item);
        initial[item] = found?.done ?? false;
      });
      setChecklist(initial);
    }
  }, [visit]);

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase
        .from('visits')
        .update({
          status: 'checked_in',
          checkin_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visit-detail', id] });
    },
  });

  // Save vitals mutation (vitals stored as JSONB in visit_records)
  const saveVitalsMutation = useMutation({
    mutationFn: async () => {
      if (!visit) return;
      const supabase = createBrowserSupabaseClient();

      const vitals: Record<string, number> = {};
      if (systolicBp) vitals.systolic_bp = Number(systolicBp);
      if (diastolicBp) vitals.diastolic_bp = Number(diastolicBp);
      if (heartRate) vitals.heart_rate = Number(heartRate);
      if (temperature) vitals.temperature = Number(temperature);
      if (spo2) vitals.spo2 = Number(spo2);

      // Upsert visit_record (visit_id is unique)
      const { error } = await supabase
        .from('visit_records')
        .upsert({
          visit_id: visit.id,
          nurse_id: visit.patient.id, // will be overwritten by RLS / trigger
          patient_id: visit.patient.id,
          vitals,
        } as never, { onConflict: 'visit_id' });

      if (error) throw error;

      // Update visit status to in_progress
      if (visit.status === 'checked_in') {
        await supabase
          .from('visits')
          .update({ status: 'in_progress', updated_at: new Date().toISOString() } as never)
          .eq('id', id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visit-detail', id] });
    },
  });

  // Save checklist mutation (stored as performed_items in visit_records)
  const saveChecklistMutation = useMutation({
    mutationFn: async () => {
      if (!visit) return;
      const supabase = createBrowserSupabaseClient();
      const performedItems = Object.entries(checklist).map(([item, done]) => ({ item, done }));
      const { error } = await supabase
        .from('visit_records')
        .upsert({
          visit_id: visit.id,
          nurse_id: visit.patient.id,
          patient_id: visit.patient.id,
          performed_items: performedItems,
        } as never, { onConflict: 'visit_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visit-detail', id] });
    },
  });

  // Save notes mutation (stored as nurse_note in visit_records)
  const saveNotesMutation = useMutation({
    mutationFn: async () => {
      if (!visit) return;
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase
        .from('visit_records')
        .upsert({
          visit_id: visit.id,
          nurse_id: visit.patient.id,
          patient_id: visit.patient.id,
          nurse_note: notes,
        } as never, { onConflict: 'visit_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visit-detail', id] });
    },
  });

  // Check-out mutation
  const checkOutMutation = useMutation({
    mutationFn: async () => {
      if (!visit) return;
      const supabase = createBrowserSupabaseClient();
      const now = new Date().toISOString();

      // Calculate actual duration
      let actualDurationMin: number | undefined;
      if (visit.checkin_at) {
        actualDurationMin = Math.round(
          (new Date(now).getTime() - new Date(visit.checkin_at).getTime()) / 60000
        );
      }

      const { error } = await supabase
        .from('visits')
        .update({
          status: 'completed',
          checkout_at: now,
          actual_duration_min: actualDurationMin,
          updated_at: now,
        } as never)
        .eq('id', id);
      if (error) throw error;

      // Save final notes and checklist to visit_record
      const performedItems = Object.entries(checklist).map(([item, done]) => ({ item, done }));
      await supabase
        .from('visit_records')
        .upsert({
          visit_id: visit.id,
          nurse_id: visit.patient.id,
          patient_id: visit.patient.id,
          nurse_note: notes,
          performed_items: performedItems,
        } as never, { onConflict: 'visit_id' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visit-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['nurse-visits-today'] });
    },
  });

  if (isLoading) return <Loading />;

  if (!visit) {
    return (
      <div className="py-14 text-center text-on-surface-variant">
        방문 정보를 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          뒤로
        </Button>
      </div>

      {/* Visit info header */}
      <Card elevated>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-on-surface">{visit.patient.full_name}</h1>
              {visit.patient.care_grade && (
                <Badge variant="primary">{visit.patient.care_grade}등급</Badge>
              )}
              <Badge variant={getStatusBadgeVariant(visit.status)}>
                {statusLabels[visit.status] || visit.status}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-on-surface-variant">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {visit.scheduled_date} {visit.scheduled_time?.slice(0, 5) || ''}
              </span>
              {visit.patient.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {visit.patient.address}
                </span>
              )}
            </div>
            {visit.patient.primary_diagnosis && (
              <p className="mt-1 text-xs text-on-surface-variant">
                진단: {visit.patient.primary_diagnosis}
              </p>
            )}
          </div>
          {visit.checkin_at && (
            <div className="text-right text-xs text-on-surface-variant">
              <p>체크인: {new Date(visit.checkin_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</p>
              {visit.checkout_at && (
                <p>체크아웃: {new Date(visit.checkout_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</p>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-2xl bg-surface-container-low p-1.5">
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                'flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-all',
                activeTab === tab.key
                  ? 'bg-white text-on-surface shadow-sm'
                  : 'text-on-surface-variant hover:bg-white/50'
              )}
            >
              <TabIcon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'checkin' && (
        <Card>
          <CardHeader>
            <CardTitle>
              <MapPin className="mr-2 inline h-5 w-5 text-on-surface-variant" />
              체크인
            </CardTitle>
          </CardHeader>

          {visit.status === 'scheduled' ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-on-surface-variant">
                환자 도착 후 체크인 버튼을 눌러주세요.
              </p>
              <p className="text-xs text-on-surface-variant/60">
                체크인 시간: {new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <Button
                loading={checkInMutation.isPending}
                onClick={() => checkInMutation.mutate()}
              >
                <PlayCircle className="h-4 w-4" />
                체크인
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl bg-secondary/5 p-4">
                <CheckCircle2 className="h-5 w-5 text-secondary" />
                <div>
                  <p className="text-sm font-medium text-secondary">체크인 완료</p>
                  {visit.checkin_at && (
                    <p className="text-xs text-on-surface-variant">
                      {new Date(visit.checkin_at).toLocaleString('ko-KR')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'vitals' && (
        <Card>
          <CardHeader>
            <CardTitle>
              <Heart className="mr-2 inline h-5 w-5 text-on-surface-variant" />
              바이탈 측정
            </CardTitle>
          </CardHeader>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-on-surface">
                <Heart className="h-4 w-4 text-error" />
                혈압 (mmHg)
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="수축기"
                  type="number"
                  value={systolicBp}
                  onChange={(e) => setSystolicBp(e.target.value)}
                />
                <span className="text-on-surface-variant">/</span>
                <Input
                  placeholder="이완기"
                  type="number"
                  value={diastolicBp}
                  onChange={(e) => setDiastolicBp(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-on-surface">
                <Activity className="h-4 w-4 text-secondary" />
                심박수 (bpm)
              </div>
              <Input
                placeholder="심박수"
                type="number"
                value={heartRate}
                onChange={(e) => setHeartRate(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-on-surface">
                <Thermometer className="h-4 w-4 text-tertiary" />
                체온 (°C)
              </div>
              <Input
                placeholder="체온"
                type="number"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-on-surface">
                <Droplets className="h-4 w-4 text-primary" />
                산소포화도 (%)
              </div>
              <Input
                placeholder="SpO2"
                type="number"
                value={spo2}
                onChange={(e) => setSpo2(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              loading={saveVitalsMutation.isPending}
              onClick={() => saveVitalsMutation.mutate()}
              disabled={!systolicBp && !heartRate && !temperature && !spo2}
            >
              바이탈 저장
            </Button>
          </div>

          {saveVitalsMutation.isSuccess && (
            <div className="mt-4 rounded-xl bg-secondary/10 p-3 text-sm text-secondary">
              바이탈 데이터가 저장되었습니다.
            </div>
          )}
        </Card>
      )}

      {activeTab === 'checklist' && (
        <Card>
          <CardHeader>
            <CardTitle>
              <ClipboardCheck className="mr-2 inline h-5 w-5 text-on-surface-variant" />
              케어 체크리스트
            </CardTitle>
          </CardHeader>

          <div className="space-y-2">
            {Object.entries(checklist).map(([item, checked]) => (
              <label
                key={item}
                className={clsx(
                  'flex cursor-pointer items-center gap-3 rounded-xl p-3.5 transition-all',
                  checked ? 'bg-secondary/5' : 'bg-surface-container-low hover:bg-surface-container-high/50'
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    setChecklist((prev) => ({ ...prev, [item]: !prev[item] }))
                  }
                  className="h-4 w-4 rounded-md accent-secondary"
                />
                <span
                  className={clsx(
                    'text-sm',
                    checked ? 'text-secondary font-medium' : 'text-on-surface'
                  )}
                >
                  {item}
                </span>
                {checked && <CheckCircle2 className="ml-auto h-4 w-4 text-secondary" />}
              </label>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-on-surface-variant">
              {Object.values(checklist).filter(Boolean).length}/{Object.keys(checklist).length} 완료
            </span>
            <Button
              size="sm"
              variant="secondary"
              loading={saveChecklistMutation.isPending}
              onClick={() => saveChecklistMutation.mutate()}
            >
              저장
            </Button>
          </div>

          {saveChecklistMutation.isSuccess && (
            <div className="mt-3 rounded-xl bg-secondary/10 p-3 text-sm text-secondary">
              체크리스트가 저장되었습니다.
            </div>
          )}
        </Card>
      )}

      {activeTab === 'notes' && (
        <Card>
          <CardHeader>
            <CardTitle>
              <FileText className="mr-2 inline h-5 w-5 text-on-surface-variant" />
              메모/노트
            </CardTitle>
          </CardHeader>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="방문 중 특이사항, 환자 상태 변화, 보호자 전달사항 등을 기록하세요..."
            rows={8}
            className="block w-full rounded-xl bg-surface-container-highest px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
          />

          <div className="mt-4 flex justify-end">
            <Button
              size="sm"
              variant="secondary"
              loading={saveNotesMutation.isPending}
              onClick={() => saveNotesMutation.mutate()}
            >
              메모 저장
            </Button>
          </div>

          {saveNotesMutation.isSuccess && (
            <div className="mt-3 rounded-xl bg-secondary/10 p-3 text-sm text-secondary">
              메모가 저장되었습니다.
            </div>
          )}
        </Card>
      )}

      {activeTab === 'checkout' && (
        <Card>
          <CardHeader>
            <CardTitle>
              <LogOut className="mr-2 inline h-5 w-5 text-on-surface-variant" />
              체크아웃
            </CardTitle>
          </CardHeader>

          {visit.status === 'completed' ? (
            <div className="space-y-3 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-secondary" />
              <p className="text-sm font-medium text-secondary">방문이 완료되었습니다.</p>
              {visit.actual_duration_min && (
                <p className="text-xs text-on-surface-variant">
                  총 소요시간: {visit.actual_duration_min}분
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <div className="rounded-xl bg-surface-container-low p-4">
                <h4 className="text-sm font-semibold text-on-surface">방문 요약</h4>
                <div className="mt-3 space-y-2 text-sm text-on-surface-variant">
                  <p>
                    체크리스트:{' '}
                    <span className="font-medium text-on-surface">
                      {Object.values(checklist).filter(Boolean).length}/{Object.keys(checklist).length} 완료
                    </span>
                  </p>
                  <p>
                    메모: {notes ? '작성됨' : '없음'}
                  </p>
                  {visit.checkin_at && (
                    <p>
                      체크인 시간:{' '}
                      {new Date(visit.checkin_at).toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>
              </div>

              <div className="text-center">
                <p className="mb-4 text-xs text-on-surface-variant">
                  체크아웃 시간: {new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <Button
                  loading={checkOutMutation.isPending}
                  onClick={() => checkOutMutation.mutate()}
                  disabled={visit.status === 'scheduled'}
                >
                  <LogOut className="h-4 w-4" />
                  체크아웃
                </Button>
                {visit.status === 'scheduled' && (
                  <p className="mt-2 text-xs text-error">먼저 체크인을 완료해주세요.</p>
                )}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
