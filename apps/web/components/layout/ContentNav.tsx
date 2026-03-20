'use client';

import { useState, useRef, useEffect } from 'react';
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
  { label: '대시보드', href: '/patient', icon: Home },
  { label: '매칭', href: '/patient/matching', icon: Brain },
  { label: '일정', href: '/patient/schedule', icon: Calendar },
  { label: '기록', href: '/patient/records', icon: FileText },
  { label: '환자관리', href: '/patient/patients', icon: Users },
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
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

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    useAppStore.getState().setProfile(null);
    useAppStore.getState().setOrganization(null);
    useAppStore.getState().setStaffInfo(null);
    window.location.href = '/login';
  };

  const isTabActive = (tab: TabItem): boolean => {
    // Exact match for root pages (dashboard / 오늘 일정)
    if (tab.href === '/patient' || tab.href === '/nurse') {
      return pathname === tab.href;
    }
    // Prefix match for sub-pages
    return pathname === tab.href || pathname.startsWith(tab.href + '/');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-surface/80 backdrop-blur-xl shadow-[0_1px_3px_rgba(24,28,30,0.04)]">
      <div className="mx-auto flex h-full max-w-[1400px] items-center justify-between px-8">
        {/* Left: Logo */}
        <Link
          href={roleHome}
          className="flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary">
            <HeartPulse className="h-[18px] w-[18px] text-white" />
          </div>
          <span className="text-[15px] font-bold tracking-tight text-primary">
            HomeCare Connect
          </span>
        </Link>

        {/* Center: Tab navigation */}
        <nav className="flex items-center gap-1">
          {tabs.map((tab) => {
            const active = isTabActive(tab);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={clsx(
                  'relative flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'text-primary font-semibold'
                    : 'text-on-surface-variant hover:text-primary'
                )}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {/* Active indicator */}
                {active && (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-secondary" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right: Notification + User + Logout */}
        <div className="flex shrink-0 items-center gap-3">
          {/* Notification bell */}
          <button className="relative rounded-xl p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high/50">
            <Bell className="h-5 w-5" />
            {(unreadCount ?? 0) > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white">
                {(unreadCount ?? 0) > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* User info */}
          <div className="flex items-center gap-2 pl-1">
            <div className="text-right">
              <p className="text-sm font-medium leading-tight text-on-surface">
                {profile?.full_name || '사용자'}
              </p>
              <p className="text-[11px] leading-tight text-on-surface-variant">
                {getRoleLabel(role)}
              </p>
            </div>
          </div>

          {/* Logout */}
          <div className="relative" ref={menuRef}>
            <button
              onMouseDown={handleLogout}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-error transition-colors hover:bg-error/5 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">로그아웃</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
