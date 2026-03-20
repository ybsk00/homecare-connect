'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { useAppStore } from '@/lib/store';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { Loading } from '@/components/ui/Loading';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarOpen, setProfile, setStaffInfo } = useAppStore();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/login');
        return;
      }

      // Load profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) setProfile(profile);

      // Load staff info
      const { data: staff } = await supabase
        .from('staff')
        .select('id, org_id, license_number, staff_type, specialties, is_active')
        .eq('user_id', user.id)
        .single();

      if (!staff) {
        router.replace('/verify');
        return;
      }

      setStaffInfo({
        id: staff.id,
        organization_id: staff.org_id,
        license_number: staff.license_number ?? '',
        staff_type: staff.staff_type,
        specialties: (staff.specialties as string[]) ?? [],
        is_active: staff.is_active,
      });

      setReady(true);
    };

    loadUserData();
  }, [setProfile, setStaffInfo, router]);

  if (!ready) {
    return <Loading fullPage text="데이터를 불러오는 중..." />;
  }

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
