'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Bell, Search, Building2, Users } from 'lucide-react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

interface AdminTopBarProps {
  title: string;
  subtitle?: string;
}

export default function AdminTopBar({ title, subtitle }: AdminTopBarProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  // 미처리 민원 수 조회 (관리자 알림 대용)
  const { data: pendingCount } = useQuery({
    queryKey: ['admin-pending-count'],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const [
        { count: pendingOrgs },
        { count: pendingAds },
      ] = await Promise.all([
        supabase.from('organizations').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending'),
        supabase.from('advertisements').select('*', { count: 'exact', head: true }).eq('review_status', 'pending'),
      ]);
      return (pendingOrgs ?? 0) + (pendingAds ?? 0);
    },
    refetchInterval: 60000,
  });

  // 검색 (기관 + 사용자)
  const { data: searchResults } = useQuery({
    queryKey: ['admin-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return { orgs: [], users: [] };
      const supabase = createBrowserSupabaseClient();

      const [{ data: orgs }, { data: users }] = await Promise.all([
        supabase
          .from('organizations')
          .select('id, name, org_type, verification_status')
          .ilike('name', `%${searchQuery}%`)
          .limit(5),
        supabase
          .from('profiles')
          .select('id, full_name, role')
          .ilike('full_name', `%${searchQuery}%`)
          .limit(5),
      ]);

      return { orgs: orgs ?? [], users: users ?? [] };
    },
    enabled: searchQuery.length >= 2,
  });

  return (
    <header className="sticky top-0 z-20 glass px-8 py-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-primary-900 tracking-tight">{title}</h2>
          {subtitle && (
            <p className="text-sm text-primary-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-300" />
            <input
              type="text"
              placeholder="기관, 사용자 검색..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchOpen(e.target.value.length >= 2);
              }}
              onFocus={() => searchQuery.length >= 2 && setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
              className="w-64 pl-10 pr-4 py-2.5 text-sm bg-primary-50/60 rounded-xl text-primary-700 placeholder-primary-300 focus:outline-none focus:ring-2 focus:ring-secondary-500/30 transition-all"
            />
            {searchOpen && searchResults && (searchResults.orgs.length > 0 || searchResults.users.length > 0) && (
              <div className="absolute right-0 top-full mt-2 w-80 overflow-hidden rounded-2xl bg-white py-2 shadow-[0_10px_40px_rgba(0,32,69,0.12)] z-50">
                {searchResults.orgs.length > 0 && (
                  <>
                    <p className="px-4 py-1.5 text-[11px] font-semibold text-primary-400 uppercase tracking-wider">기관</p>
                    {searchResults.orgs.map((org: { id: string; name: string; org_type: string }) => (
                      <button
                        key={org.id}
                        onMouseDown={() => { router.push(`/organizations/${org.id}`); setSearchOpen(false); setSearchQuery(''); }}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-primary-700 hover:bg-primary-50"
                      >
                        <Building2 className="h-4 w-4 text-primary-400" />
                        {org.name}
                      </button>
                    ))}
                  </>
                )}
                {searchResults.users.length > 0 && (
                  <>
                    <p className="px-4 py-1.5 text-[11px] font-semibold text-primary-400 uppercase tracking-wider">사용자</p>
                    {searchResults.users.map((user: { id: string; full_name: string; role: string }) => (
                      <button
                        key={user.id}
                        onMouseDown={() => setSearchOpen(false)}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-primary-700 hover:bg-primary-50"
                      >
                        <Users className="h-4 w-4 text-primary-400" />
                        {user.full_name}
                        <span className="text-[11px] text-primary-300 ml-auto">{user.role}</span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Notifications */}
          <button
            onClick={() => router.push('/organizations')}
            className="relative p-2.5 text-primary-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
          >
            <Bell className="w-5 h-5" />
            {(pendingCount ?? 0) > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger-500 text-[10px] font-bold text-white ring-2 ring-white">
                {(pendingCount ?? 0) > 9 ? '9+' : pendingCount}
              </span>
            )}
          </button>

          {/* Admin Avatar */}
          <div className="flex items-center gap-3 pl-3">
            <div className="w-9 h-9 gradient-teal rounded-full flex items-center justify-center shadow-sm">
              <span className="text-white text-xs font-bold">A</span>
            </div>
            <div className="hidden md:block">
              <p className="text-[13px] font-semibold text-primary-800">관리자</p>
              <p className="text-[11px] text-primary-400">Super Admin</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
