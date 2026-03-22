'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import {
  getPatientsByGuardian,
  getServiceRequests,
  createMatchingRequest,
} from '@homecare/supabase-client';
import {
  formatDate,
  formatRequestStatus,
  formatServiceType,
  formatRelativeTime,
  getTimeSlotLabel,
} from '@homecare/shared-utils';

type ServiceType = 'nursing' | 'physio' | 'bath' | 'care' | 'doctor_visit';

const SERVICE_OPTIONS: { value: ServiceType; label: string }[] = [
  { value: 'nursing', label: '방문간호' },
  { value: 'physio', label: '방문재활' },
  { value: 'bath', label: '방문목욕' },
  { value: 'care', label: '방문요양' },
  { value: 'doctor_visit', label: '의사방문' },
];

const TIME_OPTIONS = [
  { value: 'morning', label: '오전' },
  { value: 'afternoon', label: '오후' },
  { value: 'any', label: '시간 무관' },
];

const SEOUL_DISTRICTS = [
  '강남구', '강동구', '강북구', '강서구', '관악구',
  '광진구', '구로구', '금천구', '노원구', '도봉구',
  '동대문구', '동작구', '마포구', '서대문구', '서초구',
  '성동구', '성북구', '송파구', '양천구', '영등포구',
  '용산구', '은평구', '종로구', '중구', '중랑구',
];

export default function MatchingPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedServices, setSelectedServices] = useState<ServiceType[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>('any');
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [urgency, setUrgency] = useState<'normal' | 'urgent'>('normal');
  const [notes, setNotes] = useState('');

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const userId = session?.user?.id;

  const { data: patientLinks } = useQuery({
    queryKey: ['patients', userId],
    queryFn: () => getPatientsByGuardian(supabase, userId!),
    enabled: !!userId,
  });

  const patients = useMemo(
    () => patientLinks?.map((link) => link.patient).filter(Boolean) ?? [],
    [patientLinks],
  );

  const effectivePatient = selectedPatient || patients[0]?.id || '';

  const { data: requests, isLoading } = useQuery({
    queryKey: ['service-requests', userId],
    queryFn: () => getServiceRequests(supabase, userId!),
    enabled: !!userId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return createMatchingRequest(supabase, {
        patient_id: effectivePatient,
        guardian_id: userId!,
        requested_services: selectedServices,
        preferred_time: selectedTime as any,
        urgency,
        notes: notes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-requests'] });
      setShowForm(false);
      setSelectedServices([]);
      setSelectedTime('any');
      setSelectedRegion('');
      setNotes('');
      setUrgency('normal');
    },
  });

  const toggleService = (svc: ServiceType) => {
    setSelectedServices((prev) =>
      prev.includes(svc) ? prev.filter((s) => s !== svc) : [...prev, svc],
    );
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'matching':
      case 'waiting_selection':
        return 'bg-secondary/10 text-secondary';
      case 'org_accepted':
      case 'service_started':
        return 'bg-secondary-50 text-secondary';
      case 'org_rejected':
      case 'cancelled':
      case 'expired':
        return 'bg-error-container text-error';
      default:
        return 'bg-primary/10 text-primary';
    }
  };

  return (
    <div className="space-y-12">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight text-primary">매칭</h1>
        <p className="mt-2 text-base text-on-surface-variant">
          AI가 최적의 방문간호 기관을 찾아드립니다
        </p>
      </div>

      {/* CTA Hero Card */}
      {!showForm && (
        <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-secondary via-secondary-800 to-secondary-900 p-8 text-white shadow-[0_20px_60px_rgba(0,106,99,0.25)]">
          {/* Blur orb decorations */}
          <div className="blur-orb absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="blur-orb absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-secondary-300/20 blur-3xl" />
          <div className="blur-orb absolute right-1/4 top-1/2 h-32 w-32 rounded-full bg-white/5 blur-2xl" />

          <div className="relative z-10 flex items-start gap-5">
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
              <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">AI 매칭</p>
              <h2 className="mt-1 text-xl font-bold leading-snug">AI 매칭으로 최적의 간호사를 찾아보세요</h2>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                환자 정보와 위치를 기반으로 가장 적합한 기관을 추천해드립니다
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="relative z-10 mt-6 w-full rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-secondary shadow-lg transition-all hover:bg-white/95 hover:shadow-xl active:scale-[0.98]"
          >
            매칭 요청하기
          </button>
        </div>
      )}

      {/* Matching Request Form */}
      {showForm && (
        <div className="rounded-3xl bg-surface-container-lowest p-8 shadow-[0_10px_40px_rgba(46,71,110,0.06)]">
          <p className="text-[10px] font-bold uppercase tracking-widest text-secondary">새 요청</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-primary">새 매칭 요청</h2>

          {/* Patient Selection */}
          {patients.length > 1 && (
            <div className="mt-8">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">환자 선택</label>
              <select
                value={effectivePatient}
                onChange={(e) => setSelectedPatient(e.target.value)}
                className="mt-2 w-full rounded-xl bg-surface-container-low px-4 py-3.5 text-sm text-primary outline-none transition-colors focus:bg-white focus:ring-2 focus:ring-secondary/30"
              >
                {patients.map((p) => (
                  <option key={p!.id} value={p!.id}>
                    {p!.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Region Selection */}
          <div className="mt-8">
            <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">지역 선택</label>
            <p className="mt-1 text-xs text-on-surface-variant/60">방문 치료를 받으실 지역을 선택해주세요</p>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="mt-2 w-full rounded-xl bg-surface-container-low px-4 py-3.5 text-sm text-primary outline-none transition-colors focus:bg-white focus:ring-2 focus:ring-secondary/30"
            >
              <option value="">지역을 선택해주세요</option>
              {SEOUL_DISTRICTS.map((district) => (
                <option key={district} value={district}>
                  서울특별시 {district}
                </option>
              ))}
            </select>
          </div>

          {/* Service Types */}
          <div className="mt-8">
            <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">필요한 서비스</label>
            <div className="mt-3 flex flex-wrap gap-2.5">
              {SERVICE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => toggleService(opt.value)}
                  className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all active:scale-95 ${
                    selectedServices.includes(opt.value)
                      ? 'bg-secondary text-white shadow-md shadow-secondary/20'
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-secondary/10'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preferred Time */}
          <div className="mt-8">
            <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">선호 시간</label>
            <div className="mt-3 flex gap-2.5">
              {TIME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedTime(opt.value)}
                  className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all active:scale-95 ${
                    selectedTime === opt.value
                      ? 'bg-primary text-white shadow-md shadow-primary/20'
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-primary/10'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Urgency */}
          <div className="mt-8">
            <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">긴급도</label>
            <div className="mt-3 flex gap-2.5">
              <button
                onClick={() => setUrgency('normal')}
                className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all active:scale-95 ${
                  urgency === 'normal'
                    ? 'bg-secondary text-white shadow-md shadow-secondary/20'
                    : 'bg-surface-container-low text-on-surface-variant'
                }`}
              >
                일반
              </button>
              <button
                onClick={() => setUrgency('urgent')}
                className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all active:scale-95 ${
                  urgency === 'urgent'
                    ? 'bg-error text-on-error shadow-md shadow-error/20'
                    : 'bg-surface-container-low text-on-surface-variant'
                }`}
              >
                긴급
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="mt-8">
            <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">요청 사항</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="특별히 요청하실 사항이 있으면 입력해주세요"
              rows={3}
              className="mt-2 w-full resize-none rounded-xl bg-surface-container-low px-4 py-3.5 text-sm text-primary outline-none transition-colors placeholder:text-on-surface-variant/40 focus:bg-white focus:ring-2 focus:ring-secondary/30"
            />
          </div>

          {/* Action Buttons */}
          <div className="mt-10 flex gap-3">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 rounded-xl bg-surface-container-low px-6 py-3.5 text-sm font-bold text-on-surface-variant transition-colors hover:bg-primary/10 active:scale-[0.98]"
            >
              취소
            </button>
            <button
              onClick={() => createMutation.mutate()}
              disabled={selectedServices.length === 0 || createMutation.isPending}
              className="flex-1 rounded-xl bg-gradient-to-br from-primary to-primary-container px-6 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:shadow-xl active:scale-95 disabled:opacity-50"
            >
              {createMutation.isPending ? '요청 중...' : '매칭 요청'}
            </button>
          </div>

          {createMutation.isError && (
            <p className="mt-4 text-center text-sm font-medium text-error">
              요청에 실패했습니다. 다시 시도해주세요.
            </p>
          )}
        </div>
      )}

      {/* Request History */}
      <section>
        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-widest text-secondary">이력</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-primary">요청 이력</h2>
        </div>

        {isLoading ? (
          <div className="space-y-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-3xl bg-primary/5" />
            ))}
          </div>
        ) : !requests || requests.length === 0 ? (
          <div className="rounded-3xl bg-surface-container-lowest p-14 text-center shadow-[0_10px_40px_rgba(46,71,110,0.06)]">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-secondary/10">
              <svg className="h-10 w-10 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
              </svg>
            </div>
            <p className="mt-5 text-base font-bold text-primary">아직 매칭 요청이 없습니다</p>
            <p className="mt-1.5 text-sm text-on-surface-variant">
              위의 &quot;매칭 요청하기&quot; 버튼을 눌러 첫 매칭을 시작해보세요
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-6 inline-flex rounded-xl bg-gradient-to-br from-secondary to-secondary-800 px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:shadow-xl active:scale-95"
            >
              매칭 요청하기
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {requests.map((req) => {
              const matchedOrgs = (req as any).matched_organizations as any[] | undefined;
              return (
                <div
                  key={req.id}
                  className="group rounded-3xl bg-surface-container-lowest p-8 shadow-[0_10px_40px_rgba(46,71,110,0.06)] transition-shadow hover:shadow-[0_16px_56px_rgba(46,71,110,0.1)]"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-base font-bold text-primary">
                        {(req.patient as any)?.full_name ?? '환자'}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(req.requested_services as string[])?.map((svc: string) => (
                          <span
                            key={svc}
                            className="rounded-full bg-secondary-container px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-on-secondary-container"
                          >
                            {formatServiceType(svc)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${getStatusBadgeStyle(req.status)}`}
                    >
                      {formatRequestStatus(req.status)}
                    </span>
                  </div>

                  {/* Matched Organizations */}
                  {matchedOrgs && matchedOrgs.length > 0 && (
                    <div className="mt-6 space-y-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">추천 기관</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {matchedOrgs.map((org: any, idx: number) => (
                          <div
                            key={idx}
                            className="group/org flex items-center gap-4 rounded-2xl bg-surface-container-low p-4 transition-colors hover:bg-surface"
                          >
                            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-sm font-black text-secondary">
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="truncate text-sm font-bold text-primary group-hover/org:translate-x-1 transition-transform">
                                {org.name ?? org.org_name ?? '기관'}
                              </p>
                              {org.match_score != null && (
                                <div className="mt-1 flex items-baseline gap-1.5">
                                  <span className="text-3xl font-black text-secondary">
                                    {Math.round(org.match_score)}
                                  </span>
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                                    점
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-6 flex items-center justify-between text-xs text-on-surface-variant">
                    <span className="font-medium">{formatDate(req.created_at)}</span>
                    {(req.selected_org as any)?.name && (
                      <span className="font-bold text-primary group-hover:translate-x-1 transition-transform">
                        {(req.selected_org as any).name}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
