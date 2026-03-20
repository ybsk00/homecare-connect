'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import {
  getPatientsByGuardian,
  createPatient,
  updatePatient,
} from '@homecare/supabase-client';
import {
  formatCareGrade,
  formatMobility,
  formatPhoneNumber,
  formatDate,
  formatServiceType,
} from '@homecare/shared-utils';

type FormMode = 'closed' | 'create' | 'edit';

interface PatientForm {
  full_name: string;
  birth_date: string;
  gender: 'male' | 'female' | '';
  phone: string;
  address: string;
  address_detail: string;
  care_grade: string;
  mobility: string;
  primary_diagnosis: string;
  needed_services: string[];
  special_notes: string;
  relationship: string;
}

const INITIAL_FORM: PatientForm = {
  full_name: '',
  birth_date: '',
  gender: '',
  phone: '',
  address: '',
  address_detail: '',
  care_grade: '',
  mobility: '',
  primary_diagnosis: '',
  needed_services: [],
  special_notes: '',
  relationship: '',
};

const CARE_GRADES = [
  { value: '1', label: '1등급' },
  { value: '2', label: '2등급' },
  { value: '3', label: '3등급' },
  { value: '4', label: '4등급' },
  { value: '5', label: '5등급' },
  { value: 'cognitive', label: '인지지원등급' },
];

const MOBILITY_OPTIONS = [
  { value: 'independent', label: '독립보행' },
  { value: 'walker', label: '보행보조기' },
  { value: 'wheelchair', label: '휠체어' },
  { value: 'bedridden', label: '와상' },
];

const SERVICE_OPTIONS = [
  { value: 'nursing', label: '방문간호' },
  { value: 'physio', label: '방문재활' },
  { value: 'bath', label: '방문목욕' },
  { value: 'care', label: '방문요양' },
  { value: 'doctor_visit', label: '의사방문' },
];

const RELATIONSHIP_OPTIONS = ['자녀', '배우자', '부모', '형제자매', '기타'];

export default function PatientsPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const queryClient = useQueryClient();
  const [formMode, setFormMode] = useState<FormMode>('closed');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PatientForm>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof PatientForm, string>>>({});

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const userId = session?.user?.id;

  const { data: patientLinks, isLoading } = useQuery({
    queryKey: ['patients', userId],
    queryFn: () => getPatientsByGuardian(supabase, userId!),
    enabled: !!userId,
  });

  const patients = useMemo(
    () => patientLinks?.map((link) => ({ ...link.patient!, relationship: link.relationship })) ?? [],
    [patientLinks],
  );

  const updateField = <K extends keyof PatientForm>(key: K, value: PatientForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const toggleService = (svc: string) => {
    setForm((prev) => ({
      ...prev,
      needed_services: prev.needed_services.includes(svc)
        ? prev.needed_services.filter((s) => s !== svc)
        : [...prev.needed_services, svc],
    }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof PatientForm, string>> = {};
    if (form.full_name.length < 2) newErrors.full_name = '이름은 2자 이상 입력해주세요';
    if (!form.birth_date) newErrors.birth_date = '생년월일을 입력해주세요';
    if (!form.gender) newErrors.gender = '성별을 선택해주세요';
    if (form.address.length < 5) newErrors.address = '주소를 입력해주세요';
    if (form.needed_services.length === 0)
      newErrors.needed_services = '서비스를 1개 이상 선택해주세요';
    if (formMode === 'create' && !form.relationship)
      newErrors.relationship = '관계를 선택해주세요';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      return createPatient(
        supabase,
        {
          primary_guardian_id: userId!,
          full_name: form.full_name,
          birth_date: form.birth_date,
          gender: form.gender as 'male' | 'female',
          phone: form.phone || null,
          address: form.address,
          address_detail: form.address_detail || null,
          care_grade: (form.care_grade as any) || null,
          mobility: (form.mobility as any) || null,
          primary_diagnosis: form.primary_diagnosis || null,
          needed_services: form.needed_services,
          special_notes: form.special_notes || null,
          // 위치는 실제로 주소 API에서 받아야 하지만, 기본값으로 서울 중심 설정
          location: 'POINT(126.978 37.5665)',
        },
        userId!,
        form.relationship,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setFormMode('closed');
      setForm(INITIAL_FORM);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      return updatePatient(supabase, editingId!, {
        full_name: form.full_name,
        birth_date: form.birth_date,
        gender: form.gender as 'male' | 'female',
        phone: form.phone || null,
        address: form.address,
        address_detail: form.address_detail || null,
        care_grade: (form.care_grade as any) || null,
        mobility: (form.mobility as any) || null,
        primary_diagnosis: form.primary_diagnosis || null,
        needed_services: form.needed_services,
        special_notes: form.special_notes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setFormMode('closed');
      setForm(INITIAL_FORM);
      setEditingId(null);
    },
  });

  const handleSubmit = () => {
    if (!validate()) return;
    if (formMode === 'create') createMutation.mutate();
    else if (formMode === 'edit') updateMutation.mutate();
  };

  const openEdit = (patient: any) => {
    setEditingId(patient.id);
    setForm({
      full_name: patient.full_name ?? '',
      birth_date: patient.birth_date ?? '',
      gender: patient.gender ?? '',
      phone: patient.phone ?? '',
      address: patient.address ?? '',
      address_detail: patient.address_detail ?? '',
      care_grade: patient.care_grade ?? '',
      mobility: patient.mobility ?? '',
      primary_diagnosis: patient.primary_diagnosis ?? '',
      needed_services: patient.needed_services ?? [],
      special_notes: patient.special_notes ?? '',
      relationship: '',
    });
    setFormMode('edit');
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#002045]">환자 관리</h1>
          <p className="mt-1 text-[#002045]/60">등록된 환자를 관리하세요</p>
        </div>
        {formMode === 'closed' && (
          <button
            onClick={() => {
              setForm(INITIAL_FORM);
              setFormMode('create');
            }}
            className="rounded-xl bg-gradient-to-r from-[#006A63] to-[#004D47] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            환자 등록
          </button>
        )}
      </div>

      {/* 등록/수정 폼 */}
      {formMode !== 'closed' && (
        <div className="rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg font-semibold text-[#002045]">
            {formMode === 'create' ? '환자 등록' : '환자 정보 수정'}
          </h2>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {/* 이름 */}
            <FormField label="이름" error={errors.full_name} required>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => updateField('full_name', e.target.value)}
                placeholder="환자 이름"
                className="w-full rounded-xl bg-[#F7FAFC] px-4 py-3 text-sm text-[#002045] outline-none focus:ring-2 focus:ring-[#006A63]/30"
              />
            </FormField>

            {/* 생년월일 */}
            <FormField label="생년월일" error={errors.birth_date} required>
              <input
                type="date"
                value={form.birth_date}
                onChange={(e) => updateField('birth_date', e.target.value)}
                className="w-full rounded-xl bg-[#F7FAFC] px-4 py-3 text-sm text-[#002045] outline-none focus:ring-2 focus:ring-[#006A63]/30"
              />
            </FormField>

            {/* 성별 */}
            <FormField label="성별" error={errors.gender} required>
              <div className="flex gap-2">
                {(['male', 'female'] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => updateField('gender', g)}
                    className={`flex-1 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                      form.gender === g
                        ? 'bg-[#002045] text-white'
                        : 'bg-[#F7FAFC] text-[#002045]/60'
                    }`}
                  >
                    {g === 'male' ? '남성' : '여성'}
                  </button>
                ))}
              </div>
            </FormField>

            {/* 전화번호 */}
            <FormField label="전화번호">
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value.replace(/\D/g, ''))}
                placeholder="01012345678"
                className="w-full rounded-xl bg-[#F7FAFC] px-4 py-3 text-sm text-[#002045] outline-none focus:ring-2 focus:ring-[#006A63]/30"
              />
            </FormField>

            {/* 주소 */}
            <FormField label="주소" error={errors.address} required className="sm:col-span-2">
              <input
                type="text"
                value={form.address}
                onChange={(e) => updateField('address', e.target.value)}
                placeholder="주소를 입력해주세요"
                className="w-full rounded-xl bg-[#F7FAFC] px-4 py-3 text-sm text-[#002045] outline-none focus:ring-2 focus:ring-[#006A63]/30"
              />
            </FormField>

            {/* 상세 주소 */}
            <FormField label="상세 주소" className="sm:col-span-2">
              <input
                type="text"
                value={form.address_detail}
                onChange={(e) => updateField('address_detail', e.target.value)}
                placeholder="상세 주소"
                className="w-full rounded-xl bg-[#F7FAFC] px-4 py-3 text-sm text-[#002045] outline-none focus:ring-2 focus:ring-[#006A63]/30"
              />
            </FormField>

            {/* 장기요양등급 */}
            <FormField label="장기요양등급">
              <select
                value={form.care_grade}
                onChange={(e) => updateField('care_grade', e.target.value)}
                className="w-full rounded-xl bg-[#F7FAFC] px-4 py-3 text-sm text-[#002045] outline-none focus:ring-2 focus:ring-[#006A63]/30"
              >
                <option value="">선택 안 함</option>
                {CARE_GRADES.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </FormField>

            {/* 이동 능력 */}
            <FormField label="이동 능력">
              <select
                value={form.mobility}
                onChange={(e) => updateField('mobility', e.target.value)}
                className="w-full rounded-xl bg-[#F7FAFC] px-4 py-3 text-sm text-[#002045] outline-none focus:ring-2 focus:ring-[#006A63]/30"
              >
                <option value="">선택 안 함</option>
                {MOBILITY_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </FormField>

            {/* 주요 진단명 */}
            <FormField label="주요 진단명" className="sm:col-span-2">
              <input
                type="text"
                value={form.primary_diagnosis}
                onChange={(e) => updateField('primary_diagnosis', e.target.value)}
                placeholder="주요 진단명을 입력해주세요"
                className="w-full rounded-xl bg-[#F7FAFC] px-4 py-3 text-sm text-[#002045] outline-none focus:ring-2 focus:ring-[#006A63]/30"
              />
            </FormField>

            {/* 필요 서비스 */}
            <FormField
              label="필요 서비스"
              error={errors.needed_services}
              required
              className="sm:col-span-2"
            >
              <div className="flex flex-wrap gap-2">
                {SERVICE_OPTIONS.map((svc) => (
                  <button
                    key={svc.value}
                    onClick={() => toggleService(svc.value)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      form.needed_services.includes(svc.value)
                        ? 'bg-[#006A63] text-white'
                        : 'bg-[#F7FAFC] text-[#002045]/60 hover:bg-[#006A63]/10'
                    }`}
                  >
                    {svc.label}
                  </button>
                ))}
              </div>
            </FormField>

            {/* 보호자-환자 관계 (등록 시만) */}
            {formMode === 'create' && (
              <FormField label="환자와의 관계" error={errors.relationship} required>
                <select
                  value={form.relationship}
                  onChange={(e) => updateField('relationship', e.target.value)}
                  className="w-full rounded-xl bg-[#F7FAFC] px-4 py-3 text-sm text-[#002045] outline-none focus:ring-2 focus:ring-[#006A63]/30"
                >
                  <option value="">선택해주세요</option>
                  {RELATIONSHIP_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </FormField>
            )}

            {/* 특이사항 */}
            <FormField label="특이사항" className="sm:col-span-2">
              <textarea
                value={form.special_notes}
                onChange={(e) => updateField('special_notes', e.target.value)}
                placeholder="참고할 사항이 있으면 입력해주세요"
                rows={3}
                className="w-full resize-none rounded-xl bg-[#F7FAFC] px-4 py-3 text-sm text-[#002045] outline-none focus:ring-2 focus:ring-[#006A63]/30"
              />
            </FormField>
          </div>

          {/* 버튼 */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => {
                setFormMode('closed');
                setEditingId(null);
                setForm(INITIAL_FORM);
                setErrors({});
              }}
              className="flex-1 rounded-xl bg-[#F7FAFC] px-6 py-3 text-sm font-medium text-[#002045]/60 transition-colors hover:bg-[#002045]/10"
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="flex-1 rounded-xl bg-gradient-to-r from-[#006A63] to-[#004D47] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isPending
                ? '저장 중...'
                : formMode === 'create'
                  ? '등록'
                  : '수정'}
            </button>
          </div>

          {(createMutation.isError || updateMutation.isError) && (
            <p className="mt-3 text-center text-sm text-[#EF4444]">
              저장에 실패했습니다. 다시 시도해주세요.
            </p>
          )}
        </div>
      )}

      {/* 환자 목록 */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-[#002045]/5" />
          ))}
        </div>
      ) : patients.length === 0 ? (
        <div className="rounded-2xl bg-[#002045]/5 p-10 text-center">
          <svg
            className="mx-auto h-12 w-12 text-[#002045]/20"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z"
            />
          </svg>
          <p className="mt-3 text-sm text-[#002045]/40">등록된 환자가 없습니다</p>
          <button
            onClick={() => {
              setForm(INITIAL_FORM);
              setFormMode('create');
            }}
            className="mt-4 rounded-xl bg-gradient-to-r from-[#006A63] to-[#004D47] px-5 py-2.5 text-sm font-semibold text-white"
          >
            첫 환자 등록하기
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {patients.map((patient) => {
            const age = patient.birth_date
              ? new Date().getFullYear() - new Date(patient.birth_date).getFullYear()
              : null;

            return (
              <div
                key={patient.id}
                className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-[#002045]">
                      {patient.full_name}
                    </h3>
                    <p className="mt-1 text-sm text-[#002045]/50">
                      {patient.gender === 'male' ? '남' : '여'}
                      {age ? ` · ${age}세` : ''}
                      {patient.care_grade ? ` · ${formatCareGrade(patient.care_grade)}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => openEdit(patient)}
                    className="rounded-lg bg-[#F7FAFC] p-2 text-[#002045]/40 transition-colors hover:bg-[#002045]/10 hover:text-[#002045]"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                    </svg>
                  </button>
                </div>

                {patient.primary_diagnosis && (
                  <p className="mt-2 text-xs text-[#002045]/40">
                    진단: {patient.primary_diagnosis}
                  </p>
                )}

                {patient.needed_services && (patient.needed_services as string[]).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(patient.needed_services as string[]).map((svc: string) => (
                      <span
                        key={svc}
                        className="rounded-full bg-[#006A63]/10 px-2.5 py-0.5 text-xs text-[#006A63]"
                      >
                        {formatServiceType(svc)}
                      </span>
                    ))}
                  </div>
                )}

                {patient.mobility && (
                  <p className="mt-2 text-xs text-[#002045]/40">
                    이동: {formatMobility(patient.mobility)}
                  </p>
                )}

                <div className="mt-3 flex items-center justify-between text-xs text-[#002045]/30">
                  <span>{(patient as any).relationship ? `관계: ${(patient as any).relationship}` : ''}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 font-medium ${
                      patient.status === 'active'
                        ? 'bg-[#22C55E]/10 text-[#22C55E]'
                        : 'bg-[#002045]/10 text-[#002045]/50'
                    }`}
                  >
                    {patient.status === 'active' ? '활성' : patient.status ?? ''}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── 폼 필드 래퍼 ────────────────────────────── */
function FormField({
  label,
  error,
  required,
  className,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium text-[#002045]/70">
        {label}
        {required && <span className="ml-0.5 text-[#EF4444]">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-[#EF4444]">{error}</p>}
    </div>
  );
}
