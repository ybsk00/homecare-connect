'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Megaphone,
  HeadphonesIcon,
  BookOpen,
  Activity,
  LogOut,
  Shield,
} from 'lucide-react';

const navigation = [
  { name: '대시보드', href: '/', icon: LayoutDashboard },
  { name: '기관 관리', href: '/organizations', icon: Building2 },
  { name: '구독 관리', href: '/subscriptions', icon: CreditCard },
  { name: '광고 관리', href: '/ads', icon: Megaphone },
  { name: '민원 처리', href: '/support', icon: HeadphonesIcon },
  { name: 'RAG 관리', href: '/rag', icon: BookOpen },
  { name: 'AI 모니터링', href: '/monitoring', icon: Activity },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-30 w-72 gradient-primary flex flex-col">
      {/* Branding */}
      <div className="px-8 pt-8 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-secondary-400" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-white tracking-tight">
              HomeCare Connect
            </h1>
            <p className="text-[11px] text-white/50 font-medium tracking-wide">
              관리자 콘솔
            </p>
          </div>
        </div>
      </div>

      {/* Admin Avatar */}
      <div className="mx-6 mb-6 px-4 py-3 rounded-2xl bg-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full gradient-teal flex items-center justify-center shadow-lg">
            <span className="text-white text-xs font-bold">A</span>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-white/90">플랫폼 관리자</p>
            <p className="text-[11px] text-white/40">admin@homecare.co.kr</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-5 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-medium transition-all duration-200',
                active
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]',
              )}
            >
              <item.icon className={clsx('w-[18px] h-[18px] shrink-0', active && 'text-secondary-400')} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="px-5 pb-6 space-y-4">
        <button className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-[13px] font-medium text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-all duration-200">
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          로그아웃
        </button>

        {/* Serene Care Branding */}
        <div className="px-4 pt-4">
          <p className="text-[10px] text-white/20 tracking-widest uppercase">
            Powered by Serene Care
          </p>
        </div>
      </div>
    </aside>
  );
}
