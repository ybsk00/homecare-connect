'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { Badge, getStatusBadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Loading } from '@/components/ui/Loading';
import {
  ArrowLeft,
  ArrowRight,
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
  Navigation,
  Eye,
  Camera,
  Mic,
  MessageSquare,
  Weight,
  Wind,
  AlertTriangle,
  Upload,
  X,
} from 'lucide-react';
import { clsx } from 'clsx';

// ── 10단계 정의 ──
type VisitStep =
  | 'depart'
  | 'checkin'
  | 'pre_check'
  | 'vitals'
  | 'checklist'
  | 'observation'
  | 'photo'
  | 'voice_memo'
  | 'guardian_msg'
  | 'checkout';

const STEPS: { key: VisitStep; label: string; icon: typeof Clock; short: string }[] = [
  { key: 'depart', label: '출발', icon: Navigation, short: '출발' },
  { key: 'checkin', label: 'GPS 체크인', icon: MapPin, short: '체크인' },
  { key: 'pre_check', label: '방문 전 확인', icon: Eye, short: '확인' },
  { key: 'vitals', label: '바이탈 측정', icon: Heart, short: '바이탈' },
  { key: 'checklist', label: '시행 체크리스트', icon: ClipboardCheck, short: '체크' },
  { key: 'observation', label: '상태 관찰', icon: Activity, short: '관찰' },
  { key: 'photo', label: '사진 촬영', icon: Camera, short: '사진' },
  { key: 'voice_memo', label: '메모/노트', icon: FileText, short: '메모' },
  { key: 'guardian_msg', label: '보호자 메시지', icon: MessageSquare, short: '메시지' },
  { key: 'checkout', label: 'GPS 체크아웃', icon: LogOut, short: '완료' },
];

const statusLabels: Record<string, string> = {
  scheduled: '예정', en_route: '이동중', checked_in: '체크인',
  in_progress: '진행중', completed: '완료', cancelled: '취소', no_show: '미방문',
};

const defaultChecklist = [
  '환자 상태 확인', '복약 확인', '상처/피부 상태 확인',
  '영양 상태 확인', '활동/운동 상태 확인', '환경 안전 확인', '보호자 상담',
];

const CONDITION_OPTIONS = [
  { value: 'good', label: '양호', color: 'text-secondary' },
  { value: 'fair', label: '보통', color: 'text-primary' },
  { value: 'poor', label: '불량', color: 'text-error' },
];

const CONSCIOUSNESS_OPTIONS = ['명료', '졸림', '혼미', '반혼수', '혼수'];
const SKIN_OPTIONS = ['정상', '건조', '발적', '부종', '상처', '욕창'];
const MEAL_OPTIONS = [
  { value: 'full', label: '전량' },
  { value: 'half', label: '반량' },
  { value: 'little', label: '소량' },
  { value: 'none', label: '미식' },
];
const EMOTION_OPTIONS = ['안정', '불안', '우울', '초조', '기타'];

export default function VisitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [currentStep, setCurrentStep] = useState(0);

  // ── Form states ──
  // Vitals
  const [systolicBp, setSystolicBp] = useState('');
  const [diastolicBp, setDiastolicBp] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [temperature, setTemperature] = useState('');
  const [spo2, setSpo2] = useState('');
  const [bloodSugar, setBloodSugar] = useState('');
  const [weight, setWeight] = useState('');
  const [respiratoryRate, setRespiratoryRate] = useState('');

  // Checklist
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  // Observation
  const [generalCondition, setGeneralCondition] = useState('');
  const [consciousness, setConsciousness] = useState('');
  const [skinCondition, setSkinCondition] = useState('');
  const [mealAmount, setMealAmount] = useState('');
  const [painScore, setPainScore] = useState(0);
  const [emotionState, setEmotionState] = useState('');
  // Notes & messages
  const [notes, setNotes] = useState('');
  const [guardianMessage, setGuardianMessage] = useState('');
  // Photos
  const [photos, setPhotos] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // GPS
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'fetching' | 'success' | 'error'>('idle');
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);

  // ── Visit data ──
  const { data: visit, isLoading } = useQuery({
    queryKey: ['visit-detail', id],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase
        .from('visits')
        .select(`
          id, scheduled_date, scheduled_time, estimated_duration_min, status,
          checkin_at, checkout_at, actual_duration_min, service_type,
          patient:patients(id, full_name, care_grade, primary_diagnosis, address, phone),
          visit_record:visit_records(id, vitals, performed_items, nurse_note, general_condition, message_to_guardian, photos)
        `)
        .eq('id', id)
        .single();
      return data as {
        id: string; scheduled_date: string; scheduled_time: string | null;
        estimated_duration_min: number | null; status: string; service_type: string | null;
        checkin_at: string | null; checkout_at: string | null; actual_duration_min: number | null;
        patient: { id: string; full_name: string; care_grade: string | null; primary_diagnosis: string | null; address: string | null; phone: string | null; };
        visit_record: { id: string; vitals: Record<string, unknown>; performed_items: unknown[]; nurse_note: string | null; general_condition: string | null; message_to_guardian: string | null; photos: string[] | null; } | null;
      } | null;
    },
  });

  // Previous visit for pre-check
  const { data: prevVisit } = useQuery({
    queryKey: ['prev-visit', visit?.patient?.id],
    queryFn: async () => {
      if (!visit?.patient?.id) return null;
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase
        .from('visits')
        .select('id, scheduled_date, visit_record:visit_records(nurse_note, vitals, general_condition)')
        .eq('patient_id', visit.patient.id)
        .eq('status', 'completed')
        .neq('id', id)
        .order('scheduled_date', { ascending: false })
        .limit(1)
        .single();
      return data;
    },
    enabled: !!visit?.patient?.id,
  });

  // Red flags for patient
  const { data: patientRedFlags = [] } = useQuery({
    queryKey: ['patient-red-flags-visit', visit?.patient?.id],
    queryFn: async () => {
      if (!visit?.patient?.id) return [];
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase
        .from('red_flag_alerts')
        .select('id, title, severity')
        .eq('patient_id', visit.patient.id)
        .in('status', ['active', 'acknowledged'])
        .limit(5);
      return (data ?? []) as Array<{ id: string; title: string; severity: string }>;
    },
    enabled: !!visit?.patient?.id,
  });

  // Initialize form from visit data
  useEffect(() => {
    if (!visit) return;
    setNotes(visit.visit_record?.nurse_note || '');
    setGuardianMessage((visit.visit_record as any)?.message_to_guardian || '');
    setGeneralCondition(visit.visit_record?.general_condition || '');
    const performedItems = (visit.visit_record?.performed_items ?? []) as Array<{ item?: string; done?: boolean }>;
    const initial: Record<string, boolean> = {};
    defaultChecklist.forEach((item) => {
      const found = performedItems.find((pi) => pi.item === item);
      initial[item] = found?.done ?? false;
    });
    setChecklist(initial);
    // Set initial step based on visit status
    if (visit.status === 'completed') setCurrentStep(9);
    else if (visit.status === 'in_progress' || visit.status === 'checked_in') setCurrentStep(3);
    else if (visit.status === 'en_route') setCurrentStep(1);
  }, [visit]);

  // ── Mutations ──
  const departMutation = useMutation({
    mutationFn: async () => {
      const supabase = createBrowserSupabaseClient();
      await supabase.from('visits').update({ status: 'en_route', updated_at: new Date().toISOString() } as never).eq('id', id);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['visit-detail', id] }); setCurrentStep(1); },
  });

  const getGPS = () => {
    setGpsStatus('fetching');
    if (!navigator.geolocation) { setGpsStatus('error'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsStatus('success'); },
      () => { setGpsStatus('error'); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const checkInMutation = useMutation({
    mutationFn: async () => {
      const supabase = createBrowserSupabaseClient();
      await supabase.from('visits').update({
        status: 'checked_in', checkin_at: new Date().toISOString(),
        checkin_location: gpsCoords ? `POINT(${gpsCoords.lng} ${gpsCoords.lat})` : null,
        updated_at: new Date().toISOString(),
      } as never).eq('id', id);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['visit-detail', id] }); setCurrentStep(2); },
  });

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
      if (bloodSugar) vitals.blood_sugar = Number(bloodSugar);
      if (weight) vitals.weight = Number(weight);
      if (respiratoryRate) vitals.respiratory_rate = Number(respiratoryRate);

      await supabase.from('visit_records').upsert({
        visit_id: visit.id, nurse_id: visit.patient.id, patient_id: visit.patient.id, vitals,
      } as never, { onConflict: 'visit_id' });

      if (visit.status === 'checked_in') {
        await supabase.from('visits').update({ status: 'in_progress', updated_at: new Date().toISOString() } as never).eq('id', id);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['visit-detail', id] }),
  });

  const saveAllMutation = useMutation({
    mutationFn: async () => {
      if (!visit) return;
      const supabase = createBrowserSupabaseClient();
      const performedItems = Object.entries(checklist).map(([item, done]) => ({ item, done }));
      await supabase.from('visit_records').upsert({
        visit_id: visit.id, nurse_id: visit.patient.id, patient_id: visit.patient.id,
        nurse_note: notes, performed_items: performedItems, general_condition: generalCondition,
        message_to_guardian: guardianMessage,
      } as never, { onConflict: 'visit_id' });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['visit-detail', id] }),
  });

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      if (!visit) return;
      const supabase = createBrowserSupabaseClient();
      const now = new Date().toISOString();
      let actualDurationMin: number | undefined;
      if (visit.checkin_at) {
        actualDurationMin = Math.round((new Date(now).getTime() - new Date(visit.checkin_at).getTime()) / 60000);
      }
      // Save everything
      const performedItems = Object.entries(checklist).map(([item, done]) => ({ item, done }));
      await supabase.from('visit_records').upsert({
        visit_id: visit.id, nurse_id: visit.patient.id, patient_id: visit.patient.id,
        nurse_note: notes, performed_items: performedItems, general_condition: generalCondition,
        message_to_guardian: guardianMessage,
      } as never, { onConflict: 'visit_id' });
      // Complete visit
      await supabase.from('visits').update({
        status: 'completed', checkout_at: now, actual_duration_min: actualDurationMin, updated_at: now,
      } as never).eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visit-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['nurse-visits-today'] });
    },
  });

  if (isLoading) return <Loading />;
  if (!visit) return <div className="py-14 text-center text-on-surface-variant">방문 정보를 찾을 수 없습니다.</div>;

  const step = STEPS[currentStep];
  const isCompleted = visit.status === 'completed';
  const canGoNext = currentStep < STEPS.length - 1;
  const canGoPrev = currentStep > 0;

  return (
    <div className="space-y-6 pb-8">
      {/* ── 뒤로가기 + 환자 헤더 ── */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="rounded-xl p-2 text-on-surface-variant hover:bg-surface-container-high transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-on-surface">{visit.patient.full_name}</h1>
            {visit.patient.care_grade && <Badge variant="primary">{visit.patient.care_grade}등급</Badge>}
            <Badge variant={getStatusBadgeVariant(visit.status)}>{statusLabels[visit.status]}</Badge>
          </div>
          <p className="mt-0.5 flex items-center gap-2 text-xs text-on-surface-variant">
            <Clock className="h-3 w-3" /> {visit.scheduled_date} {visit.scheduled_time?.slice(0, 5)}
            {visit.patient.address && <><MapPin className="ml-2 h-3 w-3" /> {visit.patient.address}</>}
          </p>
        </div>
      </div>

      {/* ── 스텝 인디케이터 ── */}
      <div className="flex gap-1 overflow-x-auto rounded-2xl bg-surface-container-low p-1.5">
        {STEPS.map((s, idx) => {
          const StepIcon = s.icon;
          const isCurrent = idx === currentStep;
          const isDone = idx < currentStep || isCompleted;
          return (
            <button
              key={s.key}
              onClick={() => !isCompleted && setCurrentStep(idx)}
              className={clsx(
                'flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium transition-all',
                isCurrent ? 'bg-white text-primary shadow-sm' : isDone ? 'text-secondary' : 'text-on-surface-variant hover:bg-white/50',
              )}
            >
              {isDone && !isCurrent ? <CheckCircle2 className="h-3.5 w-3.5" /> : <StepIcon className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{s.short}</span>
            </button>
          );
        })}
      </div>

      {/* ── 스텝 콘텐츠 ── */}
      <div className="rounded-2xl bg-surface-container-lowest p-6 shadow-[0_10px_40px_rgba(24,28,30,0.05)]">
        <div className="mb-5 flex items-center gap-2">
          <step.icon className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-on-surface">{step.label}</h2>
          <span className="ml-auto text-xs text-on-surface-variant">{currentStep + 1} / {STEPS.length}</span>
        </div>

        {/* Step 1: 출발 */}
        {step.key === 'depart' && (
          <div className="space-y-4 text-center">
            {visit.status === 'en_route' || visit.status === 'checked_in' || visit.status === 'in_progress' || isCompleted ? (
              <div className="flex items-center justify-center gap-3 rounded-xl bg-secondary/5 p-4">
                <CheckCircle2 className="h-5 w-5 text-secondary" />
                <p className="text-sm font-medium text-secondary">출발 완료</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-on-surface-variant">출발 버튼을 누르면 보호자에게 이동중 알림이 전송됩니다.</p>
                <Button loading={departMutation.isPending} onClick={() => departMutation.mutate()}>
                  <Navigation className="h-4 w-4" /> 출발
                </Button>
              </>
            )}
          </div>
        )}

        {/* Step 2: GPS 체크인 */}
        {step.key === 'checkin' && (
          <div className="space-y-4">
            {visit.checkin_at ? (
              <div className="flex items-center gap-3 rounded-xl bg-secondary/5 p-4">
                <CheckCircle2 className="h-5 w-5 text-secondary" />
                <div>
                  <p className="text-sm font-medium text-secondary">체크인 완료</p>
                  <p className="text-xs text-on-surface-variant">{new Date(visit.checkin_at).toLocaleString('ko-KR')}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                <p className="text-sm text-on-surface-variant">환자 주소 근처에서 체크인해주세요.</p>
                {gpsStatus === 'idle' && (
                  <Button variant="secondary" onClick={getGPS}><MapPin className="h-4 w-4" /> GPS 위치 확인</Button>
                )}
                {gpsStatus === 'fetching' && <p className="text-xs text-on-surface-variant animate-pulse">위치 확인 중...</p>}
                {gpsStatus === 'success' && gpsCoords && (
                  <div className="space-y-2">
                    <p className="text-xs text-secondary">위치 확인됨: {gpsCoords.lat.toFixed(4)}, {gpsCoords.lng.toFixed(4)}</p>
                    <Button loading={checkInMutation.isPending} onClick={() => checkInMutation.mutate()}>
                      <PlayCircle className="h-4 w-4" /> 체크인
                    </Button>
                  </div>
                )}
                {gpsStatus === 'error' && (
                  <div className="space-y-2">
                    <p className="text-xs text-error">GPS를 사용할 수 없습니다. 수동 체크인합니다.</p>
                    <Button loading={checkInMutation.isPending} onClick={() => checkInMutation.mutate()}>
                      수동 체크인
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 3: 방문 전 확인 */}
        {step.key === 'pre_check' && (
          <div className="space-y-4">
            {patientRedFlags.length > 0 && (
              <div className="rounded-xl bg-error/5 p-4">
                <p className="mb-2 text-sm font-bold text-error">⚠ 레드플래그 이력</p>
                {patientRedFlags.map((rf) => (
                  <p key={rf.id} className="text-xs text-error/80">• {rf.title}</p>
                ))}
              </div>
            )}
            <div className="rounded-xl bg-surface-container-low p-4">
              <p className="mb-2 text-sm font-bold text-on-surface">환자 정보</p>
              <div className="space-y-1 text-sm text-on-surface-variant">
                <p>진단: {visit.patient.primary_diagnosis ?? '없음'}</p>
                <p>주소: {visit.patient.address ?? '-'}</p>
                <p>연락처: {visit.patient.phone ?? '-'}</p>
              </div>
            </div>
            {prevVisit && (
              <div className="rounded-xl bg-surface-container-low p-4">
                <p className="mb-2 text-sm font-bold text-on-surface">이전 방문 기록</p>
                <p className="text-xs text-on-surface-variant">날짜: {(prevVisit as any).scheduled_date}</p>
                {(prevVisit as any).visit_record?.nurse_note && (
                  <p className="mt-1 text-xs text-on-surface-variant line-clamp-3">{(prevVisit as any).visit_record.nurse_note}</p>
                )}
              </div>
            )}
            {!prevVisit && !patientRedFlags.length && (
              <p className="text-center text-sm text-on-surface-variant">이전 기록이 없습니다. 첫 방문입니다.</p>
            )}
          </div>
        )}

        {/* Step 4: 바이탈 측정 */}
        {step.key === 'vitals' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-sm font-medium text-on-surface"><Heart className="h-4 w-4 text-error" /> 혈압 (mmHg)</label>
                <div className="flex items-center gap-2">
                  <Input placeholder="수축기" type="number" value={systolicBp} onChange={(e) => setSystolicBp(e.target.value)} />
                  <span className="text-on-surface-variant">/</span>
                  <Input placeholder="이완기" type="number" value={diastolicBp} onChange={(e) => setDiastolicBp(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-sm font-medium text-on-surface"><Activity className="h-4 w-4 text-secondary" /> 심박수 (bpm)</label>
                <Input placeholder="심박수" type="number" value={heartRate} onChange={(e) => setHeartRate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-sm font-medium text-on-surface"><Thermometer className="h-4 w-4 text-tertiary" /> 체온 (°C)</label>
                <Input placeholder="체온" type="number" step="0.1" value={temperature} onChange={(e) => setTemperature(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-sm font-medium text-on-surface"><Droplets className="h-4 w-4 text-primary" /> SpO2 (%)</label>
                <Input placeholder="산소포화도" type="number" value={spo2} onChange={(e) => setSpo2(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-sm font-medium text-on-surface"><Droplets className="h-4 w-4 text-tertiary" /> 혈당 (mg/dL) <span className="text-xs text-on-surface-variant">(선택)</span></label>
                <Input placeholder="혈당" type="number" value={bloodSugar} onChange={(e) => setBloodSugar(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-sm font-medium text-on-surface"><Weight className="h-4 w-4 text-on-surface-variant" /> 체중 (kg) <span className="text-xs text-on-surface-variant">(선택)</span></label>
                <Input placeholder="체중" type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-sm font-medium text-on-surface"><Wind className="h-4 w-4 text-secondary" /> 호흡수 (/분) <span className="text-xs text-on-surface-variant">(선택)</span></label>
                <Input placeholder="호흡수" type="number" value={respiratoryRate} onChange={(e) => setRespiratoryRate(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button loading={saveVitalsMutation.isPending} onClick={() => saveVitalsMutation.mutate()} disabled={!systolicBp && !heartRate && !temperature && !spo2}>
                바이탈 저장
              </Button>
            </div>
            {saveVitalsMutation.isSuccess && <p className="rounded-xl bg-secondary/10 p-3 text-sm text-secondary">저장 완료</p>}
          </div>
        )}

        {/* Step 5: 시행 체크리스트 */}
        {step.key === 'checklist' && (
          <div className="space-y-3">
            {Object.entries(checklist).map(([item, checked]) => (
              <label key={item} className={clsx('flex cursor-pointer items-center gap-3 rounded-xl p-3.5 transition-all', checked ? 'bg-secondary/5' : 'bg-surface-container-low hover:bg-surface-container-high/50')}>
                <input type="checkbox" checked={checked} onChange={() => setChecklist((prev) => ({ ...prev, [item]: !prev[item] }))} className="h-4 w-4 rounded-md accent-secondary" />
                <span className={clsx('text-sm', checked ? 'text-secondary font-medium' : 'text-on-surface')}>{item}</span>
                {checked && <CheckCircle2 className="ml-auto h-4 w-4 text-secondary" />}
              </label>
            ))}
            <p className="text-xs text-on-surface-variant">{Object.values(checklist).filter(Boolean).length}/{Object.keys(checklist).length} 완료</p>
          </div>
        )}

        {/* Step 6: 상태 관찰 */}
        {step.key === 'observation' && (
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-on-surface">전반적 상태</label>
              <div className="flex gap-2">
                {CONDITION_OPTIONS.map((opt) => (
                  <button key={opt.value} onClick={() => setGeneralCondition(opt.value)}
                    className={clsx('rounded-xl px-4 py-2 text-sm font-medium transition-all', generalCondition === opt.value ? `bg-primary/10 ${opt.color} ring-1 ring-primary/20` : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high')}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-on-surface">의식 상태</label>
              <div className="flex flex-wrap gap-2">
                {CONSCIOUSNESS_OPTIONS.map((opt) => (
                  <button key={opt} onClick={() => setConsciousness(opt)}
                    className={clsx('rounded-lg px-3 py-1.5 text-xs font-medium transition-all', consciousness === opt ? 'bg-primary/10 text-primary' : 'bg-surface-container-low text-on-surface-variant')}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-on-surface">피부 상태</label>
              <div className="flex flex-wrap gap-2">
                {SKIN_OPTIONS.map((opt) => (
                  <button key={opt} onClick={() => setSkinCondition(opt)}
                    className={clsx('rounded-lg px-3 py-1.5 text-xs font-medium transition-all', skinCondition === opt ? 'bg-primary/10 text-primary' : 'bg-surface-container-low text-on-surface-variant')}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-on-surface">식사량</label>
              <div className="flex gap-2">
                {MEAL_OPTIONS.map((opt) => (
                  <button key={opt.value} onClick={() => setMealAmount(opt.value)}
                    className={clsx('rounded-lg px-3 py-1.5 text-xs font-medium transition-all', mealAmount === opt.value ? 'bg-primary/10 text-primary' : 'bg-surface-container-low text-on-surface-variant')}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-on-surface">통증 점수 (0-10): <span className="text-primary font-bold">{painScore}</span></label>
              <input type="range" min="0" max="10" value={painScore} onChange={(e) => setPainScore(Number(e.target.value))}
                className="w-full accent-primary" />
              <div className="flex justify-between text-[10px] text-on-surface-variant"><span>없음</span><span>극심</span></div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-on-surface">정서 상태</label>
              <div className="flex flex-wrap gap-2">
                {EMOTION_OPTIONS.map((opt) => (
                  <button key={opt} onClick={() => setEmotionState(opt)}
                    className={clsx('rounded-lg px-3 py-1.5 text-xs font-medium transition-all', emotionState === opt ? 'bg-primary/10 text-primary' : 'bg-surface-container-low text-on-surface-variant')}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 7: 사진 촬영 */}
        {step.key === 'photo' && (
          <div className="space-y-4">
            <p className="text-sm text-on-surface-variant">상처 경과, 피부 상태 등을 사진으로 기록하세요. (선택)</p>
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" multiple className="hidden"
              onChange={(e) => { if (e.target.files) setPhotos((prev) => [...prev, ...Array.from(e.target.files!)]); }} />
            <button onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-outline-variant/30 py-8 text-sm text-on-surface-variant hover:bg-surface-container-low transition-colors">
              <Camera className="h-5 w-5" /> 사진 촬영 / 업로드
            </button>
            {photos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {photos.map((photo, idx) => (
                  <div key={idx} className="relative h-20 w-20 rounded-lg overflow-hidden bg-surface-container-low">
                    <img src={URL.createObjectURL(photo)} alt="" className="h-full w-full object-cover" />
                    <button onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute top-0.5 right-0.5 rounded-full bg-error/80 p-0.5 text-white"><X className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 8: 메모/노트 (음성메모 포함) */}
        {step.key === 'voice_memo' && (
          <div className="space-y-4">
            <label className="text-sm font-medium text-on-surface">간호사 소견</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="방문 중 특이사항, 환자 상태 변화 등을 기록하세요..." rows={6}
              className="block w-full rounded-xl bg-surface-container-highest px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-1 focus:ring-primary/40" />
            <div className="flex justify-end">
              <Button size="sm" variant="secondary" loading={saveAllMutation.isPending} onClick={() => saveAllMutation.mutate()}>메모 저장</Button>
            </div>
          </div>
        )}

        {/* Step 9: 보호자 메시지 */}
        {step.key === 'guardian_msg' && (
          <div className="space-y-4">
            <p className="text-sm text-on-surface-variant">보호자에게 전달할 내용을 입력하세요. (선택)</p>
            <textarea value={guardianMessage} onChange={(e) => setGuardianMessage(e.target.value)}
              placeholder="보호자에게 전달할 특이사항, 주의사항 등..." rows={4}
              className="block w-full rounded-xl bg-surface-container-highest px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-1 focus:ring-primary/40" />
          </div>
        )}

        {/* Step 10: 체크아웃 */}
        {step.key === 'checkout' && (
          <div className="space-y-4">
            {isCompleted ? (
              <div className="space-y-3 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-secondary" />
                <p className="text-sm font-medium text-secondary">방문이 완료되었습니다.</p>
                {visit.actual_duration_min && <p className="text-xs text-on-surface-variant">총 소요시간: {visit.actual_duration_min}분</p>}
                <Button variant="ghost" onClick={() => router.push('/nurse')}>오늘 일정으로 돌아가기</Button>
              </div>
            ) : (
              <>
                <div className="rounded-xl bg-surface-container-low p-4">
                  <h4 className="mb-3 text-sm font-bold text-on-surface">방문 요약</h4>
                  <div className="space-y-1 text-sm text-on-surface-variant">
                    <p>체크리스트: <span className="font-medium text-on-surface">{Object.values(checklist).filter(Boolean).length}/{Object.keys(checklist).length}</span></p>
                    <p>바이탈: {systolicBp ? `${systolicBp}/${diastolicBp}` : '미입력'} · 심박 {heartRate || '-'} · 체온 {temperature || '-'}</p>
                    <p>상태: {generalCondition ? CONDITION_OPTIONS.find((o) => o.value === generalCondition)?.label : '미입력'}</p>
                    <p>메모: {notes ? '작성됨' : '없음'}</p>
                    <p>보호자 메시지: {guardianMessage ? '작성됨' : '없음'}</p>
                    {visit.checkin_at && <p>체크인: {new Date(visit.checkin_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</p>}
                  </div>
                </div>
                <div className="text-center">
                  <Button loading={checkOutMutation.isPending} onClick={() => checkOutMutation.mutate()} disabled={visit.status === 'scheduled'}>
                    <LogOut className="h-4 w-4" /> 체크아웃 및 방문 완료
                  </Button>
                  {visit.status === 'scheduled' && <p className="mt-2 text-xs text-error">먼저 체크인을 완료해주세요.</p>}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── 이전/다음 네비게이션 ── */}
      {!isCompleted && (
        <div className="flex items-center justify-between">
          <Button variant="ghost" disabled={!canGoPrev} onClick={() => setCurrentStep((s) => s - 1)}>
            <ArrowLeft className="h-4 w-4" /> 이전
          </Button>
          <Button variant="ghost" disabled={!canGoNext} onClick={() => setCurrentStep((s) => s + 1)}>
            다음 <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
