'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import {
  Calendar,
  Users,
  AlertTriangle,
  BarChart3,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  HeartPulse,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useQuery } from '@tanstack/react-query';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

const navItems = [
  { href: '/dashboard', icon: Calendar, label: '오늘 일정' },
  { href: '/dashboard/patients', icon: Users, label: '담당 환자' },
  { href: '/dashboard/alerts', icon: AlertTriangle, label: '레드플래그', hasBadge: true },
  { href: '/dashboard/stats', icon: BarChart3, label: '월간 통계' },
  { href: '/dashboard/settings', icon: Settings, label: '설정' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar, staffInfo } = useAppStore();

  // Fetch red flag alert count
  const { data: alertCount } = useQuery({
    queryKey: ['red-flag-count', staffInfo?.id],
    queryFn: async () => {
      if (!staffInfo?.id) return 0;
      const supabase = createBrowserSupabaseClient();
      const { count } = await supabase
        .from('red_flag_alerts')
        .select('id', { count: 'exact', head: true })
        .eq('nurse_id', staffInfo.id)
        .in('status', ['active', 'acknowledged']);
      return count ?? 0;
    },
    enabled: !!staffInfo?.id,
    refetchInterval: 30000,
  });

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/dashboard/';
    }
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={clsx(
        'fixed inset-y-0 left-0 z-30 flex flex-col bg-gradient-to-b from-primary to-[#0D1B2A] transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-[72px]'
      )}
    >
      {/* Logo area */}
      <div className="flex h-[72px] items-center gap-3 px-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
          <HeartPulse className="h-5 w-5 text-secondary-container" />
        </div>
        {sidebarOpen && (
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">
              HomeCare Connect
            </p>
            <p className="truncate text-[11px] text-white/50">
              간호사 포털
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-6">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-white/10 text-white'
                  : 'text-white/60 hover:bg-white/5 hover:text-white/80'
              )}
              title={!sidebarOpen ? item.label : undefined}
            >
              <div className="relative shrink-0">
                <item.icon
                  className={clsx(
                    'h-5 w-5',
                    active ? 'text-secondary-container' : 'text-white/50'
                  )}
                />
                {item.hasBadge && (alertCount ?? 0) > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-error text-[9px] font-bold text-white">
                    {(alertCount ?? 0) > 9 ? '9+' : alertCount}
                  </span>
                )}
              </div>
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse button */}
      <div className="px-3 pb-4">
        <button
          onClick={toggleSidebar}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/50 transition-colors hover:bg-white/5 hover:text-white/70"
        >
          {sidebarOpen ? (
            <>
              <PanelLeftClose className="h-5 w-5 shrink-0" />
              <span>접기</span>
            </>
          ) : (
            <PanelLeftOpen className="h-5 w-5 shrink-0" />
          )}
        </button>
      </div>
    </aside>
  );
}
