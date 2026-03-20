'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Search,
  Calendar,
  FileText,
  Users,
  Brain,
  Star,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  HeartPulse,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: '홈' },
  { href: '/dashboard/matching', icon: Search, label: '매칭' },
  { href: '/dashboard/schedule', icon: Calendar, label: '일정' },
  { href: '/dashboard/records', icon: FileText, label: '기록' },
  { href: '/dashboard/patients', icon: Users, label: '환자 관리' },
  { href: '/dashboard/ai-report', icon: Brain, label: 'AI 리포트' },
  { href: '/dashboard/reviews', icon: Star, label: '리뷰' },
  { href: '/dashboard/settings', icon: Settings, label: '설정' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useAppStore();

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
              환자/보호자 포털
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
              <item.icon
                className={clsx(
                  'h-5 w-5 shrink-0',
                  active ? 'text-secondary-container' : 'text-white/50'
                )}
              />
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
