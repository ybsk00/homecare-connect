'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Bell, ChevronDown, LogOut, User, Settings, Search } from 'lucide-react';
import { clsx } from 'clsx';
import { useAppStore } from '@/lib/store';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export function TopBar() {
  const { profile, organization, sidebarOpen } = useAppStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const role = (profile?.role as string) ?? '';

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

  // Search results
  const { data: searchResults } = useQuery({
    queryKey: ['topbar-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return { patients: [], staff: [] };
      const supabase = createBrowserSupabaseClient();

      const [{ data: patients }, { data: staffList }] = await Promise.all([
        supabase
          .from('patients')
          .select('id, full_name, care_grade')
          .ilike('full_name', `%${searchQuery}%`)
          .limit(5),
        organization?.id
          ? supabase
              .from('staff')
              .select('id, staff_type, user:profiles!inner(full_name)')
              .eq('org_id', organization.id)
              .ilike('profiles.full_name', `%${searchQuery}%`)
              .limit(5)
          : Promise.resolve({ data: [] }),
      ]);

      return {
        patients: patients ?? [],
        staff: staffList ?? [],
      };
    },
    enabled: searchQuery.length >= 2,
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

  const getRoleLabel = () => {
    switch (role) {
      case 'guardian':
        return '보호자';
      case 'nurse':
        return '간호사';
      case 'org_admin':
        return organization?.name ?? '기관 관리자';
      case 'platform_admin':
        return '플랫폼 관리자';
      default:
        return '';
    }
  };

  const getSettingsPath = () => {
    switch (role) {
      case 'guardian':
        return '/patient/settings';
      case 'nurse':
        return '/nurse/settings';
      case 'org_admin':
        return '/hospital/settings';
      default:
        return '/admin';
    }
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
          placeholder="검색..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setSearchOpen(e.target.value.length >= 2);
          }}
          onFocus={() => searchQuery.length >= 2 && setSearchOpen(true)}
          onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
          className="w-full rounded-xl bg-surface-container-highest py-2.5 pl-10 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
        />
        {searchOpen && searchResults && (searchResults.patients.length > 0 || searchResults.staff.length > 0) && (
          <div className="absolute left-0 top-full mt-2 w-full overflow-hidden rounded-2xl bg-white py-2 shadow-[0_10px_40px_rgba(24,28,30,0.12)] z-50">
            {searchResults.patients.length > 0 && (
              <>
                <p className="px-4 py-1.5 text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">환자</p>
                {searchResults.patients.map((p: { id: string; full_name: string; care_grade: string | null }) => (
                  <button
                    key={p.id}
                    onMouseDown={() => {
                      const basePath = role === 'org_admin' ? '/hospital' : role === 'nurse' ? '/nurse' : '/patient';
                      router.push(`${basePath}/patients/${p.id}`);
                      setSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container-low"
                  >
                    <User className="h-4 w-4 text-on-surface-variant" />
                    {p.full_name}
                    {p.care_grade && <span className="text-xs text-on-surface-variant">{p.care_grade}등급</span>}
                  </button>
                ))}
              </>
            )}
            {searchResults.staff.length > 0 && (
              <>
                <p className="px-4 py-1.5 text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">직원</p>
                {searchResults.staff.map((s: { id: string; staff_type: string; user: { full_name: string } | null }) => (
                  <button
                    key={s.id}
                    onMouseDown={() => {
                      router.push(`/hospital/staff/${s.id}`);
                      setSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container-low"
                  >
                    <User className="h-4 w-4 text-on-surface-variant" />
                    {(s.user as { full_name: string } | null)?.full_name ?? '-'}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Right side */}
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
                {profile?.full_name || '사용자'}
              </p>
              <p className="text-[11px] text-on-surface-variant">
                {getRoleLabel()}
              </p>
            </div>
            <ChevronDown className="h-4 w-4 text-on-surface-variant" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-2xl bg-white py-2 shadow-[0_10px_40px_rgba(24,28,30,0.1)]">
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  router.push(getSettingsPath());
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
