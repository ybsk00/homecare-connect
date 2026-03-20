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
import Link from 'next/link';

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
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-primary">설정</h1>
        <p className="mt-1 text-on-surface-variant">계정 및 서비스 설정을 관리하세요</p>
      </div>

      {/* 프로필 섹션 */}
      <section className="rounded-2xl bg-surface-container-lowest p-6 shadow-[0_10px_40px_rgba(24,28,30,0.05)]">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-primary">프로필</h2>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="rounded-lg bg-surface px-3 py-1.5 text-xs font-medium text-secondary transition-colors hover:bg-secondary/10"
            >
              수정
            </button>
          )}
        </div>

        {profileLoading ? (
          <div className="mt-4 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-xl bg-primary/5" />
            ))}
          </div>
        ) : isEditing ? (
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-on-surface-variant">이름</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1.5 w-full rounded-xl bg-surface px-4 py-3 text-sm text-primary outline-none focus:ring-2 focus:ring-secondary/30"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-on-surface-variant">이메일</label>
              <p className="mt-1.5 rounded-xl bg-primary/5 px-4 py-3 text-sm text-on-surface-variant">
                {email ?? '-'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-on-surface-variant">전화번호</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="01012345678"
                className="mt-1.5 w-full rounded-xl bg-surface px-4 py-3 text-sm text-primary outline-none focus:ring-2 focus:ring-secondary/30"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setFullName(profile?.full_name ?? '');
                  setPhone(profile?.phone ?? '');
                }}
                className="flex-1 rounded-xl bg-surface px-4 py-2.5 text-sm font-medium text-on-surface-variant"
              >
                취소
              </button>
              <button
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
                className="flex-1 rounded-xl bg-gradient-to-r from-secondary to-secondary-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {updateMutation.isPending ? '저장 중...' : '저장'}
              </button>
            </div>
            {updateMutation.isError && (
              <p className="text-center text-xs text-error">
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
      <section className="rounded-2xl bg-surface-container-lowest p-6 shadow-[0_10px_40px_rgba(24,28,30,0.05)]">
        <h2 className="text-lg font-bold text-primary">알림 설정</h2>
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
      <section className="rounded-2xl bg-surface-container-lowest p-6 shadow-[0_10px_40px_rgba(24,28,30,0.05)]">
        <h2 className="text-lg font-bold text-primary">서비스 정보</h2>
        {activePlan ? (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-on-surface-variant">현재 서비스</span>
              <span className="rounded-full bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary">
                이용 중
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-on-surface-variant">기관</span>
              <span className="text-sm font-medium text-primary">
                {(activePlan.organization as any)?.name ?? '-'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-on-surface-variant">담당 간호사</span>
              <span className="text-sm font-medium text-primary">
                {(activePlan.nurse as any)?.user?.full_name ?? '-'}
              </span>
            </div>
            {Array.isArray(activePlan.care_items) && (activePlan.care_items as string[]).length > 0 && (
              <div>
                <span className="text-sm text-on-surface-variant">케어 항목</span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(activePlan.care_items as string[]).map((item: string, i: number) => (
                    <span
                      key={i}
                      className="rounded-full bg-secondary/10 px-2.5 py-0.5 text-xs font-medium text-secondary"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 rounded-xl bg-primary/5 p-4 text-center">
            <p className="text-sm text-on-surface-variant">현재 이용 중인 서비스가 없습니다</p>
          </div>
        )}
      </section>

      {/* 기관 소통 */}
      <section className="rounded-2xl bg-surface-container-lowest p-6 shadow-[0_10px_40px_rgba(24,28,30,0.05)]">
        <h2 className="text-lg font-bold text-primary">기관 소통</h2>
        <p className="mt-1 text-xs text-on-surface-variant">담당 기관에 간단한 메시지를 전송하세요</p>
        <div className="mt-4 rounded-xl bg-surface p-4">
          <textarea
            placeholder="기관에 전달할 내용을 입력하세요 (예: 방문 시간 변경 요청, 특이사항 알림 등)"
            rows={3}
            className="w-full resize-none bg-transparent text-sm text-primary placeholder:text-on-surface-variant/40 outline-none"
          />
          <div className="mt-3 flex justify-end">
            <button
              disabled={!activePlan}
              className="rounded-xl bg-gradient-to-r from-primary to-primary-container px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              메시지 전송
            </button>
          </div>
          {!activePlan && (
            <p className="mt-2 text-xs text-on-surface-variant/50">
              이용 중인 서비스가 있을 때 메시지를 보낼 수 있습니다
            </p>
          )}
        </div>
      </section>

      {/* AI 상담 바로가기 */}
      <section className="rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-primary">AI 상담이 필요하신가요?</h3>
            <p className="mt-0.5 text-xs text-on-surface-variant">
              장기요양 제도, 비용, 서비스에 대해 AI가 안내해 드립니다
            </p>
          </div>
          <Link
            href="/patient/chat"
            className="shrink-0 rounded-xl bg-gradient-to-r from-primary to-primary-container px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            상담하기
          </Link>
        </div>
      </section>

      {/* 계정 관리 */}
      <section className="rounded-2xl bg-surface-container-lowest p-6 shadow-[0_10px_40px_rgba(24,28,30,0.05)]">
        <h2 className="text-lg font-bold text-primary">계정 관리</h2>
        <div className="mt-4 space-y-3">
          <button className="w-full rounded-xl bg-surface px-4 py-3 text-left text-sm text-on-surface-variant transition-colors hover:bg-primary/10">
            비밀번호 변경
          </button>
          <button
            onClick={handleLogout}
            className="w-full rounded-xl bg-error-container/50 px-4 py-3 text-left text-sm font-medium text-error transition-colors hover:bg-error-container"
          >
            로그아웃
          </button>
        </div>
      </section>
    </div>
  );
}

/* -- 프로필 행 -------------------------------------------- */
function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-on-surface-variant">{label}</span>
      <span className="text-sm font-medium text-primary">{value}</span>
    </div>
  );
}

/* -- 토글 행 -------------------------------------------- */
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
        <p className="text-sm font-medium text-primary">{label}</p>
        <p className="text-xs text-on-surface-variant/60">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${
          checked ? 'bg-secondary' : 'bg-primary/15'
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
