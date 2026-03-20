'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, ChevronDown, LogOut, User } from 'lucide-react';
import { clsx } from 'clsx';
import { useAppStore } from '@/lib/store';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';

export function TopBar() {
  const { profile, sidebarOpen } = useAppStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const role = (profile?.role as string) ?? '';

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
    useAppStore.getState().setProfile(null);
    useAppStore.getState().setOrganization(null);
    useAppStore.getState().setStaffInfo(null);
    window.location.href = '/login';
  };

  const getRoleLabel = () => {
    switch (role) {
      case 'guardian': return '보호자';
      case 'nurse': return '간호사';
      case 'org_admin': return '기관 관리자';
      case 'platform_admin': return '플랫폼 관리자';
      default: return '';
    }
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
            <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white">
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
                {profile?.full_name || '사용자'}
              </p>
              <p className="text-[11px] text-on-surface-variant">
                {getRoleLabel()}
              </p>
            </div>
            <ChevronDown className="h-4 w-4 text-on-surface-variant" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-44 overflow-hidden rounded-2xl bg-white py-2 shadow-[0_10px_40px_rgba(24,28,30,0.1)] z-50">
              <button
                onMouseDown={handleLogout}
                className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-medium text-error transition-colors hover:bg-error/5 cursor-pointer"
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
