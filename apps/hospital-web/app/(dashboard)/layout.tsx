'use client';

import { useEffect } from 'react';
import { clsx } from 'clsx';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { useAppStore } from '@/lib/store';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarOpen, setOrganization, setProfile } = useAppStore();

  useEffect(() => {
    const loadUserData = async () => {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // Load profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) setProfile(profile);

      // Load organization (owner)
      const { data: org } = await supabase
        .from('organizations')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (org) setOrganization(org);
    };

    loadUserData();
  }, [setOrganization, setProfile]);

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar />
      <TopBar />
      <main
        className={clsx(
          'min-h-screen pt-[72px] transition-all duration-300',
          sidebarOpen ? 'ml-64' : 'ml-[72px]'
        )}
      >
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
