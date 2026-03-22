'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import {
  HeartPulse,
  Bell,
  LogOut,
  Home,
  Brain,
  Calendar,
  FileText,
  Users,
  Sparkles,
  AlertTriangle,
  BarChart3,
  HelpCircle,
  Plus,
  Menu,
  X,
  LayoutDashboard,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '@/lib/store';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { Tables } from '@homecare/shared-types';

type TabItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const guardianTabs: TabItem[] = [
  { label: '대시보드', href: '/patient', icon: LayoutDashboard },
  { label: '매칭 요청', href: '/patient/matching', icon: Brain },
  { label: '일정', href: '/patient/schedule', icon: Calendar },
  { label: '방문 기록', href: '/patient/records', icon: FileText },
  { label: '환자 관리', href: '/patient/patients', icon: Users },
  { label: 'AI 리포트', href: '/patient/ai-report', icon: Sparkles },
  { label: '알림', href: '/patient/notifications', icon: Bell },
  { label: 'AI 상담', href: '/patient/chat', icon: Brain },
];

const nurseTabs: TabItem[] = [
  { label: '오늘 일정', href: '/nurse', icon: Calendar },
  { label: '담당 환자', href: '/nurse/patients', icon: Users },
  { label: '레드플래그', href: '/nurse/alerts', icon: AlertTriangle },
  { label: '월간 통계', href: '/nurse/stats', icon: BarChart3 },
  { label: '알림', href: '/nurse/notifications', icon: Bell },
];

function getTabs(role: string): TabItem[] {
  switch (role) {
    case 'nurse':
      return nurseTabs;
    case 'guardian':
    default:
      return guardianTabs;
  }
}

function getRoleLabel(role: string): string {
  switch (role) {
    case 'guardian':
      return '보호자';
    case 'nurse':
      return '간호사';
    default:
      return '';
  }
}

function getRoleHome(role: string): string {
  switch (role) {
    case 'nurse':
      return '/nurse';
    case 'guardian':
    default:
      return '/patient';
  }
}

interface ContentNavProps {
  role: string;
  profile: Tables<'profiles'> | null;
}

export function ContentNav({ role, profile }: ContentNavProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const tabs = getTabs(role);
  const roleHome = getRoleHome(role);

  // Unread notification count
  const { data: unreadCount } = useQuery({
    queryKey: ['unread-notifications', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return 0;
      const supabase = createBrowserSupabaseClient();
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('read', false);
      return count ?? 0;
    },
    enabled: !!profile?.id,
    refetchInterval: 30000,
  });

  const handleLogout = async () => {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    useAppStore.getState().setProfile(null);
    useAppStore.getState().setOrganization(null);
    useAppStore.getState().setStaffInfo(null);
    window.location.href = '/login';
  };

  const isTabActive = (tab: TabItem): boolean => {
    if (tab.href === '/patient' || tab.href === '/nurse') {
      return pathname === tab.href;
    }
    return pathname === tab.href || pathname.startsWith(tab.href + '/');
  };

  return (
    <>
      {/* ── 좌측 사이드바 (lg 이상) ── */}
      <aside className="hidden lg:flex h-screen w-72 fixed left-0 top-0 z-40 bg-[#FAFBFC] flex-col p-6 space-y-6">
        {/* 로고 영역 */}
        <Link href={roleHome} className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center">
            <HeartPulse className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-lg font-bold text-on-surface tracking-tight">홈케어커넥트</p>
            <p className="text-[11px] font-medium text-on-surface-variant">
              {profile?.full_name ?? '사용자'} · {getRoleLabel(role)}
            </p>
          </div>
        </Link>

        {/* 네비게이션 링크 */}
        <nav className="flex-1 flex flex-col gap-1">
          {tabs.map((tab) => {
            const active = isTabActive(tab);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group',
                  active
                    ? 'bg-white text-on-surface font-bold shadow-[0_2px_8px_rgba(46,71,110,0.08)]'
                    : 'text-on-surface-variant hover:bg-surface-container-high/50'
                )}
              >
                <tab.icon
                  className={clsx(
                    'h-[18px] w-[18px] transition-transform duration-200',
                    active ? 'text-secondary' : 'group-hover:translate-x-0.5'
                  )}
                />
                <span className={clsx(
                  'transition-transform duration-200',
                  !active && 'group-hover:translate-x-0.5'
                )}>
                  {tab.label}
                </span>
                {/* 알림 뱃지 */}
                {tab.href.includes('notification') && (unreadCount ?? 0) > 0 && (
                  <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white">
                    {(unreadCount ?? 0) > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* 하단: CTA + 지원/로그아웃 */}
        <div className="space-y-3 pt-4 border-t border-surface-container-high/30">
          <Link
            href={role === 'nurse' ? '/nurse' : '/patient/matching'}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-br from-primary to-primary-container text-white py-3.5 px-6 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 active:scale-95 transition-transform"
          >
            <Plus className="h-4 w-4" />
            {role === 'nurse' ? '새 방문 기록' : '새 케어 요청'}
          </Link>

          <div className="flex flex-col gap-0.5">
            <button className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-on-surface-variant hover:bg-surface-container-high/50 rounded-xl transition-colors">
              <HelpCircle className="h-4 w-4" />
              <span>고객 지원</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-on-surface-variant hover:bg-error/5 hover:text-error rounded-xl transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>로그아웃</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── 모바일 상단바 (lg 미만) ── */}
      <nav className="lg:hidden fixed top-0 w-full z-50 bg-white/70 backdrop-blur-xl shadow-[0_1px_3px_rgba(46,71,110,0.04)]">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href={roleHome} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <HeartPulse className="h-4 w-4 text-white" />
            </div>
            <span className="text-[15px] font-extrabold text-on-surface tracking-tighter">
              홈케어커넥트
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href={role === 'nurse' ? '/nurse/notifications' : '/patient/notifications'}
              className="relative p-2 rounded-xl"
            >
              <Bell className="h-5 w-5 text-on-surface" />
              {(unreadCount ?? 0) > 0 && (
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white">
                  {(unreadCount ?? 0) > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
            <button
              className="p-2 rounded-xl"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* ── 모바일 메뉴 오버레이 ── */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
          <div
            className="absolute right-0 top-0 h-full w-72 bg-white shadow-2xl p-6 pt-20 space-y-2 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {tabs.map((tab) => {
              const active = isTabActive(tab);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={clsx(
                    'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                    active
                      ? 'bg-surface-container-low text-on-surface font-bold'
                      : 'text-on-surface-variant hover:bg-surface-container-low/50'
                  )}
                >
                  <tab.icon className="h-[18px] w-[18px]" />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
            <div className="pt-4 mt-4 border-t border-surface-container-high/30">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-error hover:bg-error/5 rounded-xl transition-colors w-full cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>로그아웃</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 모바일 하단 네비바 ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl flex justify-around items-center py-3 px-4 z-50 shadow-[0_-1px_3px_rgba(46,71,110,0.04)]">
        {tabs.slice(0, 4).map((tab) => {
          const active = isTabActive(tab);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={clsx(
                'flex flex-col items-center gap-1 transition-colors',
                active ? 'text-on-surface' : 'text-on-surface-variant/50'
              )}
            >
              <tab.icon className={clsx('h-5 w-5', active && 'text-secondary')} />
              <span className={clsx('text-[10px]', active ? 'font-bold' : 'font-medium')}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
