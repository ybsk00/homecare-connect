'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, ChevronDown, LogOut, User, Settings, Search } from 'lucide-react';
import { clsx } from 'clsx';
import { useAppStore } from '@/lib/store';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export function TopBar() {
  const { profile, organization, sidebarOpen } = useAppStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <header
      className={clsx(
        'fixed right-0 top-0 z-20 flex h-[72px] items-center justify-between px-8 transition-all duration-300',
        'glass',
        sidebarOpen ? 'left-64' : 'left-[72px]'
      )}
    >
      {/* Left: Search */}
      <div className="relative max-w-md flex-1">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant/50" />
        <input
          type="text"
          placeholder="환자, 간호사, 일정 검색..."
          className="w-full rounded-xl bg-surface-container-highest py-2.5 pl-10 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
        />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Notification bell */}
        <button className="relative rounded-xl p-2.5 text-on-surface-variant transition-colors hover:bg-surface-container-high/60">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-error text-[10px] font-bold text-on-error">
            3
          </span>
        </button>

        {/* User dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 transition-colors hover:bg-surface-container-high/40"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-container">
              <User className="h-4 w-4 text-white" />
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium text-on-surface">
                {profile?.full_name || '관리자'}
              </p>
              <p className="text-[11px] text-on-surface-variant">
                {organization?.name || '기관'}
              </p>
            </div>
            <ChevronDown className="h-4 w-4 text-on-surface-variant" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-2xl bg-white py-2 shadow-[0_10px_40px_rgba(24,28,30,0.1)]">
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  router.push('/settings');
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-on-surface transition-colors hover:bg-surface-container-low"
              >
                <Settings className="h-4 w-4 text-on-surface-variant" />
                설정
              </button>
              <div className="my-1 h-px bg-surface-container-high" />
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-error transition-colors hover:bg-error/5"
              >
                <LogOut className="h-4 w-4" />
                로그아웃
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
