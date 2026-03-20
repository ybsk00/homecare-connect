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

export default function MatchingPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedServices, setSelectedServices] = useState<ServiceType[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>('any');
  const [selectedPatient, setSelectedPatient] = useState<string>('');
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

  // 첫 환자 자동 선택
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
        return 'bg-[#006A63]/10 text-[#006A63]';
      case 'org_accepted':
      case 'service_started':
        return 'bg-[#22C55E]/10 text-[#22C55E]';
      case 'org_rejected':
      case 'cancelled':
      case 'expired':
        return 'bg-[#EF4444]/10 text-[#EF4444]';
      default:
        return 'bg-[#002045]/10 text-[#002045]';
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#002045]">매칭</h1>
        <p className="mt-1 text-[#002045]/60">
          AI가 최적의 방문간호 기관을 찾아드립니다
        </p>
      </div>

      {/* CTA 카드 */}
      {!showForm && (
        <div className="rounded-2xl bg-gradient-to-br from-[#006A63] to-[#004D47] p-6 text-white">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-white/10 p-3">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold">AI 매칭으로 최적의 간호사를 찾아보세요</h2>
              <p className="mt-1 text-sm text-white/70">
                환자 정보와 위치를 기반으로 가장 적합한 기관을 추천해드립니다
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="mt-5 w-full rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#006A63] transition-colors hover:bg-white/90"
          >
            매칭 요청하기
          </button>
        </div>
      )}

      {/* 매칭 요청 폼 */}
      {showForm && (
        <div className="rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg font-semibold text-[#002045]">새 매칭 요청</h2>

          {/* 환자 선택 */}
          {patients.length > 1 && (
            <div className="mt-5">
              <label className="text-sm font-medium text-[#002045]/70">환자 선택</label>
              <select
                value={effectivePatient}
                onChange={(e) => setSelectedPatient(e.target.value)}
                className="mt-1.5 w-full rounded-xl bg-[#F7FAFC] px-4 py-3 text-sm text-[#002045] outline-none focus:ring-2 focus:ring-[#006A63]/30"
              >
                {patients.map((p) => (
                  <option key={p!.id} value={p!.id}>
                    {p!.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 서비스 유형 */}
          <div className="mt-5">
            <label className="text-sm font-medium text-[#002045]/70">필요한 서비스</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {SERVICE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => toggleService(opt.value)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    selectedServices.includes(opt.value)
                      ? 'bg-[#006A63] text-white'
                      : 'bg-[#F7FAFC] text-[#002045]/60 hover:bg-[#006A63]/10'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 선호 시간 */}
          <div className="mt-5">
            <label className="text-sm font-medium text-[#002045]/70">선호 시간</label>
            <div className="mt-2 flex gap-2">
              {TIME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedTime(opt.value)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    selectedTime === opt.value
                      ? 'bg-[#002045] text-white'
                      : 'bg-[#F7FAFC] text-[#002045]/60 hover:bg-[#002045]/10'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 긴급도 */}
          <div className="mt-5">
            <label className="text-sm font-medium text-[#002045]/70">긴급도</label>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => setUrgency('normal')}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  urgency === 'normal'
                    ? 'bg-[#006A63] text-white'
                    : 'bg-[#F7FAFC] text-[#002045]/60'
                }`}
              >
                일반
              </button>
              <button
                onClick={() => setUrgency('urgent')}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  urgency === 'urgent'
                    ? 'bg-[#EF4444] text-white'
                    : 'bg-[#F7FAFC] text-[#002045]/60'
                }`}
              >
                긴급
              </button>
            </div>
          </div>

          {/* 메모 */}
          <div className="mt-5">
            <label className="text-sm font-medium text-[#002045]/70">요청 사항</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="특별히 요청하실 사항이 있으면 입력해주세요"
              rows={3}
              className="mt-1.5 w-full resize-none rounded-xl bg-[#F7FAFC] px-4 py-3 text-sm text-[#002045] outline-none focus:ring-2 focus:ring-[#006A63]/30"
            />
          </div>

          {/* 버튼 */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 rounded-xl bg-[#F7FAFC] px-6 py-3 text-sm font-medium text-[#002045]/60 transition-colors hover:bg-[#002045]/10"
            >
              취소
            </button>
            <button
              onClick={() => createMutation.mutate()}
              disabled={selectedServices.length === 0 || createMutation.isPending}
              className="flex-1 rounded-xl bg-gradient-to-r from-[#006A63] to-[#004D47] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {createMutation.isPending ? '요청 중...' : '매칭 요청'}
            </button>
          </div>

          {createMutation.isError && (
            <p className="mt-3 text-center text-sm text-[#EF4444]">
              요청에 실패했습니다. 다시 시도해주세요.
            </p>
          )}
        </div>
      )}

      {/* 요청 이력 */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-[#002045]">요청 이력</h2>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-[#002045]/5" />
            ))}
          </div>
        ) : !requests || requests.length === 0 ? (
          <div className="rounded-2xl bg-[#002045]/5 p-8 text-center">
            <p className="text-[#002045]/40">매칭 요청 이력이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div
                key={req.id}
                className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#002045]">
                      {(req.patient as any)?.full_name ?? '환자'}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {(req.requested_services as string[])?.map((svc: string) => (
                        <span
                          key={svc}
                          className="rounded-full bg-[#006A63]/10 px-2.5 py-0.5 text-xs text-[#006A63]"
                        >
                          {formatServiceType(svc)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeStyle(req.status)}`}
                  >
                    {formatRequestStatus(req.status)}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-[#002045]/50">
                  <span>{formatDate(req.created_at)}</span>
                  {(req.selected_org as any)?.name && (
                    <span className="font-medium text-[#002045]/70">
                      {(req.selected_org as any).name}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
