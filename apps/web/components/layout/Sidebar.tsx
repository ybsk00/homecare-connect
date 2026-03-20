'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import {
  HeartPulse,
  ChevronLeft,
  ChevronRight,
  Home,
  Users,
  Calendar,
  FileText,
  Star,
  Settings,
  Brain,
  AlertTriangle,
  BarChart3,
  Building2,
  CreditCard,
  Headphones,
  Monitor,
  Database,
  Megaphone,
  ClipboardList,
  Stethoscope,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const guardianNav: NavItem[] = [
  { label: '홈', href: '/patient', icon: Home },
  { label: '매칭', href: '/patient/matching', icon: Brain },
  { label: '일정', href: '/patient/schedule', icon: Calendar },
  { label: '기록', href: '/patient/records', icon: FileText },
  { label: '환자관리', href: '/patient/patients', icon: Users },
  { label: 'AI 리포트', href: '/patient/ai-report', icon: Sparkles },
  { label: '리뷰', href: '/patient/reviews', icon: Star },
  { label: '설정', href: '/patient/settings', icon: Settings },
];

const nurseNav: NavItem[] = [
  { label: '오늘 일정', href: '/nurse', icon: Calendar },
  { label: '담당 환자', href: '/nurse/patients', icon: Users },
  { label: '레드플래그', href: '/nurse/alerts', icon: AlertTriangle },
  { label: '월간 통계', href: '/nurse/stats', icon: BarChart3 },
  { label: '설정', href: '/nurse/settings', icon: Settings },
];

const orgAdminNav: NavItem[] = [
  { label: '대시보드', href: '/hospital', icon: Home },
  { label: '환자', href: '/hospital/patients', icon: Users },
  { label: '직원', href: '/hospital/staff', icon: UserCheck },
  { label: '일정', href: '/hospital/schedule', icon: Calendar },
  { label: '요청', href: '/hospital/requests', icon: ClipboardList },
  { label: '의사', href: '/hospital/doctor', icon: Stethoscope },
  { label: '통계', href: '/hospital/stats', icon: BarChart3 },
  { label: '수납', href: '/hospital/billing', icon: CreditCard },
  { label: '설정', href: '/hospital/settings', icon: Settings },
];

const platformAdminNav: NavItem[] = [
  { label: '대시보드', href: '/admin', icon: Home },
  { label: '기관 관리', href: '/admin/organizations', icon: Building2 },
  { label: '구독', href: '/admin/subscriptions', icon: CreditCard },
  { label: '광고', href: '/admin/ads', icon: Megaphone },
  { label: 'RAG', href: '/admin/rag', icon: Database },
  { label: '고객 지원', href: '/admin/support', icon: Headphones },
  { label: '모니터링', href: '/admin/monitoring', icon: Monitor },
];

function getNavItems(role: string | undefined): NavItem[] {
  switch (role) {
    case 'guardian':
      return guardianNav;
    case 'nurse':
      return nurseNav;
    case 'org_admin':
      return orgAdminNav;
    case 'platform_admin':
      return platformAdminNav;
    default:
      return guardianNav;
  }
}

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar, profile } = useAppStore();
  const role = (profile?.role as string) ?? 'guardian';
  const navItems = getNavItems(role);

  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 z-30 flex h-screen flex-col bg-gradient-to-b from-primary to-primary-container transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-[72px]'
      )}
    >
      {/* Logo */}
      <div className="flex h-[72px] items-center gap-3 px-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
          <HeartPulse className="h-5 w-5 text-secondary-container" />
        </div>
        {sidebarOpen && (
          <span className="text-sm font-bold text-white whitespace-nowrap">
            HomeCare Connect
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="mt-4 flex-1 space-y-1 px-3 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/' &&
              item.href !== '/patient' &&
              item.href !== '/nurse' &&
              item.href !== '/hospital' &&
              item.href !== '/admin' &&
              pathname.startsWith(item.href));

          // Exact match for root dashboard pages
          const isExactActive =
            (item.href === '/patient' ||
              item.href === '/nurse' ||
              item.href === '/hospital' ||
              item.href === '/admin') &&
            pathname === item.href;

          const active = isActive || isExactActive;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                active
                  ? 'bg-white/15 text-white'
                  : 'text-white/60 hover:bg-white/10 hover:text-white/90'
              )}
              title={!sidebarOpen ? item.label : undefined}
            >
              <item.icon
                className={clsx(
                  'h-5 w-5 shrink-0',
                  active ? 'text-secondary-container' : 'text-white/60'
                )}
              />
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse button */}
      <div className="p-3">
        <button
          onClick={toggleSidebar}
          className="flex w-full items-center justify-center rounded-xl p-2.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white/80"
        >
          {sidebarOpen ? (
            <ChevronLeft className="h-5 w-5" />
          ) : (
            <ChevronRight className="h-5 w-5" />
          )}
        </button>
      </div>
    </aside>
  );
}
