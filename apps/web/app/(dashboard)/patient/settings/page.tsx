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
    <div className="space-y-12">
      {/* Header */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-secondary">Settings</p>
        <h1 className="mt-1 text-4xl font-extrabold tracking-tight text-primary">설정</h1>
        <p className="mt-2 text-on-surface-variant">계정 및 서비스 설정을 관리하세요</p>
      </div>

      {/* 프로필 섹션 */}
      <section className="rounded-2xl bg-surface-container-lowest p-8 shadow-[0_10px_40px_rgba(46,71,110,0.06)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/8">
              <svg className="h-6 w-6 text-primary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/60">Profile</p>
              <h2 className="text-xl font-bold text-primary">프로필</h2>
            </div>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="rounded-xl bg-surface-container-low px-4 py-2 text-xs font-semibold text-secondary transition-all hover:bg-secondary/10 active:scale-95"
            >
              수정
            </button>
          )}
        </div>

        {profileLoading ? (
          <div className="mt-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-primary/5" />
            ))}
          </div>
        ) : isEditing ? (
          <div className="mt-8 space-y-5">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/70">이름</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-2 w-full rounded-xl bg-surface-container-low px-4 py-3.5 text-sm text-primary outline-none transition-shadow focus:ring-2 focus:ring-secondary/30 focus:shadow-lg focus:shadow-secondary/5"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/70">이메일</label>
              <p className="mt-2 rounded-xl bg-primary/5 px-4 py-3.5 text-sm text-on-surface-variant">
                {email ?? '-'}
              </p>
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/70">전화번호</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="01012345678"
                className="mt-2 w-full rounded-xl bg-surface-container-low px-4 py-3.5 text-sm text-primary outline-none transition-shadow focus:ring-2 focus:ring-secondary/30 focus:shadow-lg focus:shadow-secondary/5"
              />
            </div>
            <div className="flex gap-3 pt-3">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setFullName(profile?.full_name ?? '');
                  setPhone(profile?.phone ?? '');
                }}
                className="flex-1 rounded-2xl bg-surface-container-low px-4 py-3 text-sm font-medium text-on-surface-variant transition-colors hover:bg-primary/5"
              >
                취소
              </button>
              <button
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
                className="flex-1 rounded-2xl bg-gradient-to-r from-secondary to-secondary-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-secondary/20 transition-all hover:shadow-xl hover:shadow-secondary/30 active:scale-95 disabled:opacity-50 disabled:shadow-none"
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
          <div className="mt-6 space-y-1">
            <ProfileRow label="이름" value={profile?.full_name ?? '-'} />
            <ProfileRow label="이메일" value={email ?? '-'} />
            <ProfileRow
              label="전화번호"
              value={profile?.phone ? formatPhoneNumber(profile.phone) : '-'}
            />
            <ProfileRow label="역할" value="보호자" badge />
          </div>
        )}
      </section>

      {/* 알림 설정 */}
      <section className="rounded-2xl bg-surface-container-lowest p-8 shadow-[0_10px_40px_rgba(46,71,110,0.06)]">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10">
            <svg className="h-6 w-6 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/60">Notifications</p>
            <h2 className="text-xl font-bold text-primary">알림 설정</h2>
          </div>
        </div>
        <div className="mt-8 space-y-2">
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
      <section className="rounded-2xl bg-surface-container-lowest p-8 shadow-[0_10px_40px_rgba(46,71,110,0.06)]">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-tertiary-50">
            <svg className="h-6 w-6 text-tertiary-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/60">Service Plan</p>
            <h2 className="text-xl font-bold text-primary">서비스 정보</h2>
          </div>
        </div>
        {activePlan ? (
          <div className="mt-8 space-y-1">
            <div className="flex items-center justify-between rounded-2xl bg-surface-container-low px-5 py-4">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/60">현재 서비스</span>
              <span className="rounded-full bg-secondary/10 px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-secondary">
                이용 중
              </span>
            </div>
            <div className="flex items-center justify-between rounded-2xl px-5 py-4 transition-colors hover:bg-surface-container-low">
              <span className="text-sm text-on-surface-variant">기관</span>
              <span className="text-sm font-bold text-primary">
                {(activePlan.organization as any)?.name ?? '-'}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-2xl px-5 py-4 transition-colors hover:bg-surface-container-low">
              <span className="text-sm text-on-surface-variant">담당 간호사</span>
              <span className="text-sm font-bold text-primary">
                {(activePlan.nurse as any)?.user?.full_name ?? '-'}
              </span>
            </div>
            {Array.isArray(activePlan.care_items) && (activePlan.care_items as string[]).length > 0 && (
              <div className="rounded-2xl px-5 py-4">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/60">케어 항목</span>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(activePlan.care_items as string[]).map((item: string, i: number) => (
                    <span
                      key={i}
                      className="rounded-full bg-secondary/8 px-3.5 py-1.5 text-xs font-medium text-secondary"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl bg-surface-container-low p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/8">
              <svg className="h-6 w-6 text-primary/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <p className="mt-4 text-sm font-medium text-on-surface-variant">현재 이용 중인 서비스가 없습니다</p>
          </div>
        )}
      </section>

      {/* 기관 소통 */}
      <section className="rounded-2xl bg-surface-container-lowest p-8 shadow-[0_10px_40px_rgba(46,71,110,0.06)]">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/60">Communication</p>
            <h2 className="text-xl font-bold text-primary">기관 소통</h2>
          </div>
        </div>
        <p className="mt-2 pl-16 text-sm text-on-surface-variant/60">담당 기관에 간단한 메시지를 전송하세요</p>
        <div className="mt-6 rounded-xl bg-surface-container-low p-5">
          <textarea
            placeholder="기관에 전달할 내용을 입력하세요 (예: 방문 시간 변경 요청, 특이사항 알림 등)"
            rows={3}
            className="w-full resize-none bg-transparent text-sm leading-relaxed text-primary placeholder:text-on-surface-variant/40 outline-none"
          />
          <div className="mt-4 flex items-center justify-between">
            {!activePlan && (
              <p className="text-[10px] font-medium text-on-surface-variant/50">
                이용 중인 서비스가 있을 때 메시지를 보낼 수 있습니다
              </p>
            )}
            <button
              disabled={!activePlan}
              className="ml-auto rounded-2xl bg-gradient-to-r from-primary to-primary-container px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 active:scale-95 disabled:opacity-40 disabled:shadow-none"
            >
              메시지 전송
            </button>
          </div>
        </div>
      </section>

      {/* AI 상담 바로가기 */}
      <section className="group rounded-2xl bg-gradient-to-br from-primary/8 to-secondary/8 p-8 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_60px_rgba(46,71,110,0.1)]">
        <div className="flex items-center gap-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary shadow-lg shadow-primary/20 transition-transform group-hover:scale-105">
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-primary">AI 상담이 필요하신가요?</h3>
            <p className="mt-1 text-sm text-on-surface-variant/60">
              장기요양 제도, 비용, 서비스에 대해 AI가 안내해 드립니다
            </p>
          </div>
          <Link
            href="/patient/chat"
            className="shrink-0 rounded-2xl bg-gradient-to-r from-primary to-primary-container px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 active:scale-95"
          >
            상담하기
          </Link>
        </div>
      </section>

      {/* 계정 관리 */}
      <section className="rounded-2xl bg-surface-container-lowest p-8 shadow-[0_10px_40px_rgba(46,71,110,0.06)]">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/8">
            <svg className="h-6 w-6 text-primary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/60">Account</p>
            <h2 className="text-xl font-bold text-primary">계정 관리</h2>
          </div>
        </div>
        <div className="mt-6 space-y-2">
          <button className="w-full rounded-2xl bg-surface-container-low px-5 py-4 text-left text-sm font-medium text-on-surface-variant transition-all hover:bg-primary/5 hover:text-primary active:scale-[0.99]">
            비밀번호 변경
          </button>
          <button
            onClick={handleLogout}
            className="w-full rounded-2xl bg-error-container/30 px-5 py-4 text-left text-sm font-bold text-error transition-all hover:bg-error-container/50 active:scale-[0.99]"
          >
            로그아웃
          </button>
        </div>
      </section>
    </div>
  );
}

/* -- 프로필 행 -------------------------------------------- */
function ProfileRow({ label, value, badge }: { label: string; value: string; badge?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-2xl px-5 py-4 transition-colors hover:bg-surface-container-low">
      <span className="text-sm text-on-surface-variant">{label}</span>
      {badge ? (
        <span className="rounded-full bg-secondary/10 px-3.5 py-1 text-xs font-bold text-secondary">
          {value}
        </span>
      ) : (
        <span className="text-sm font-bold text-primary">{value}</span>
      )}
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
    <div className="flex items-center justify-between rounded-2xl px-5 py-4 transition-colors hover:bg-surface-container-low">
      <div>
        <p className="text-sm font-bold text-primary">{label}</p>
        <p className="mt-0.5 text-xs text-on-surface-variant/60">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 rounded-full transition-colors ${
          checked ? 'bg-secondary' : 'bg-primary/15'
        }`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-transform ${
            checked ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  );
}
