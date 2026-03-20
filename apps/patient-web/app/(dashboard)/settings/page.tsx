'use client';

import { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import {
  getProfile,
  updateProfile,
  getPatientsByGuardian,
  getServicePlansByPatient,
} from '@homecare/supabase-client';
import {
  formatPhoneNumber,
  formatServiceType,
} from '@homecare/shared-utils';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const queryClient = useQueryClient();
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [notifPush, setNotifPush] = useState(true);
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifSms, setNotifSms] = useState(false);

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const userId = session?.user?.id;
  const email = session?.user?.email;

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => getProfile(supabase, userId!),
    enabled: !!userId,
  });

  // 환자 및 서비스 플랜 정보
  const { data: patientLinks } = useQuery({
    queryKey: ['patients', userId],
    queryFn: () => getPatientsByGuardian(supabase, userId!),
    enabled: !!userId,
  });

  const primaryPatient = patientLinks?.[0]?.patient;

  const { data: servicePlans } = useQuery({
    queryKey: ['service-plans', primaryPatient?.id],
    queryFn: () => getServicePlansByPatient(supabase, primaryPatient!.id),
    enabled: !!primaryPatient?.id,
  });

  const activePlan = servicePlans?.find((p) => p.status === 'active');

  // 프로필 데이터로 폼 초기화
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      setPhone(profile.phone ?? '');
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      return updateProfile(supabase, userId!, {
        full_name: fullName,
        phone: phone || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setIsEditing(false);
    },
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#002045]">설정</h1>
        <p className="mt-1 text-[#002045]/60">계정 및 서비스 설정을 관리하세요</p>
      </div>

      {/* 프로필 섹션 */}
      <section className="rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#002045]">프로필</h2>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="rounded-lg bg-[#F7FAFC] px-3 py-1.5 text-xs font-medium text-[#006A63] transition-colors hover:bg-[#006A63]/10"
            >
              수정
            </button>
          )}
        </div>

        {profileLoading ? (
          <div className="mt-4 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-xl bg-[#002045]/5" />
            ))}
          </div>
        ) : isEditing ? (
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-[#002045]/70">이름</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1.5 w-full rounded-xl bg-[#F7FAFC] px-4 py-3 text-sm text-[#002045] outline-none focus:ring-2 focus:ring-[#006A63]/30"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#002045]/70">이메일</label>
              <p className="mt-1.5 rounded-xl bg-[#002045]/5 px-4 py-3 text-sm text-[#002045]/50">
                {email ?? '-'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-[#002045]/70">전화번호</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="01012345678"
                className="mt-1.5 w-full rounded-xl bg-[#F7FAFC] px-4 py-3 text-sm text-[#002045] outline-none focus:ring-2 focus:ring-[#006A63]/30"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setFullName(profile?.full_name ?? '');
                  setPhone(profile?.phone ?? '');
                }}
                className="flex-1 rounded-xl bg-[#F7FAFC] px-4 py-2.5 text-sm font-medium text-[#002045]/60"
              >
                취소
              </button>
              <button
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
                className="flex-1 rounded-xl bg-gradient-to-r from-[#006A63] to-[#004D47] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {updateMutation.isPending ? '저장 중...' : '저장'}
              </button>
            </div>
            {updateMutation.isError && (
              <p className="text-center text-xs text-[#EF4444]">
                저장에 실패했습니다. 다시 시도해주세요.
              </p>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <ProfileRow label="이름" value={profile?.full_name ?? '-'} />
            <ProfileRow label="이메일" value={email ?? '-'} />
            <ProfileRow
              label="전화번호"
              value={profile?.phone ? formatPhoneNumber(profile.phone) : '-'}
            />
            <ProfileRow label="역할" value="보호자" />
          </div>
        )}
      </section>

      {/* 알림 설정 */}
      <section className="rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <h2 className="text-lg font-semibold text-[#002045]">알림 설정</h2>
        <div className="mt-4 space-y-4">
          <ToggleRow
            label="푸시 알림"
            description="방문 알림, 리포트 등을 푸시로 받습니다"
            checked={notifPush}
            onChange={setNotifPush}
          />
          <ToggleRow
            label="이메일 알림"
            description="중요한 알림을 이메일로 받습니다"
            checked={notifEmail}
            onChange={setNotifEmail}
          />
          <ToggleRow
            label="SMS 알림"
            description="긴급 알림을 SMS로 받습니다"
            checked={notifSms}
            onChange={setNotifSms}
          />
        </div>
      </section>

      {/* 서비스 플랜 정보 */}
      <section className="rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <h2 className="text-lg font-semibold text-[#002045]">서비스 정보</h2>
        {activePlan ? (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#002045]/60">현재 서비스</span>
              <span className="rounded-full bg-[#22C55E]/10 px-3 py-1 text-xs font-medium text-[#22C55E]">
                이용 중
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#002045]/60">기관</span>
              <span className="text-sm font-medium text-[#002045]">
                {(activePlan.organization as any)?.name ?? '-'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#002045]/60">담당 간호사</span>
              <span className="text-sm font-medium text-[#002045]">
                {(activePlan.nurse as any)?.user?.full_name ?? '-'}
              </span>
            </div>
            {Array.isArray(activePlan.care_items) && (activePlan.care_items as string[]).length > 0 && (
              <div>
                <span className="text-sm text-[#002045]/60">케어 항목</span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(activePlan.care_items as string[]).map((item: string, i: number) => (
                    <span
                      key={i}
                      className="rounded-full bg-[#006A63]/10 px-2.5 py-0.5 text-xs text-[#006A63]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 rounded-xl bg-[#002045]/5 p-4 text-center">
            <p className="text-sm text-[#002045]/40">현재 이용 중인 서비스가 없습니다</p>
          </div>
        )}
      </section>

      {/* 계정 관리 */}
      <section className="rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <h2 className="text-lg font-semibold text-[#002045]">계정 관리</h2>
        <div className="mt-4 space-y-3">
          <button className="w-full rounded-xl bg-[#F7FAFC] px-4 py-3 text-left text-sm text-[#002045]/70 transition-colors hover:bg-[#002045]/10">
            비밀번호 변경
          </button>
          <button
            onClick={handleLogout}
            className="w-full rounded-xl bg-[#EF4444]/5 px-4 py-3 text-left text-sm font-medium text-[#EF4444] transition-colors hover:bg-[#EF4444]/10"
          >
            로그아웃
          </button>
        </div>
      </section>
    </div>
  );
}

/* ── 프로필 행 ────────────────────────────────── */
function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-[#002045]/60">{label}</span>
      <span className="text-sm font-medium text-[#002045]">{value}</span>
    </div>
  );
}

/* ── 토글 행 ────────────────────────────────── */
function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-[#002045]">{label}</p>
        <p className="text-xs text-[#002045]/40">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${
          checked ? 'bg-[#006A63]' : 'bg-[#002045]/15'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  );
}
