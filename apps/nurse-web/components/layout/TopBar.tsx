'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Bell, ChevronDown, LogOut, User, Settings } from 'lucide-react';
import { clsx } from 'clsx';
import { useAppStore } from '@/lib/store';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export function TopBar() {
  const { profile, sidebarOpen } = useAppStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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
        'fixed right-0 top-0 z-20 flex h-[72px] items-center justify-end px-8 transition-all duration-300',
        'glass',
        sidebarOpen ? 'left-64' : 'left-[72px]'
      )}
    >
      <div className="flex items-center gap-4">
        {/* Notification bell */}
        <button className="relative rounded-xl p-2.5 text-on-surface-variant transition-colors hover:bg-surface-container-high/60">
          <Bell className="h-5 w-5" />
          {(unreadCount ?? 0) > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-error text-[10px] font-bold text-on-error">
              {(unreadCount ?? 0) > 9 ? '9+' : unreadCount}
            </span>
          )}
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
                {profile?.full_name || '간호사'}
              </p>
            </div>
            <ChevronDown className="h-4 w-4 text-on-surface-variant" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-2xl bg-white py-2 shadow-[0_10px_40px_rgba(24,28,30,0.1)]">
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  router.push('/dashboard/settings');
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
