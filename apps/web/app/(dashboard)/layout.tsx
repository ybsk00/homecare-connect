'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { useAppStore } from '@/lib/store';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const {
    sidebarOpen,
    setProfile,
    setOrganization,
    setStaffInfo,
    profile,
  } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const supabase = createBrowserSupabaseClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profileData) {
        router.push('/login');
        return;
      }

      setProfile(profileData as never);

      const role = profileData.role as string;

      // Load role-specific data
      if (role === 'org_admin') {
        // Load organization via staff table
        const { data: staffData } = await supabase
          .from('staff')
          .select('org_id')
          .eq('user_id', user.id)
          .single();

        if (staffData?.org_id) {
          const { data: orgData } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', staffData.org_id)
            .single();

          if (orgData) {
            setOrganization(orgData as never);
          }
        }
      }

      if (role === 'nurse') {
        const { data: staffData } = await supabase
          .from('staff')
          .select('id, org_id, license_number, staff_type, specialties, is_active')
          .eq('user_id', user.id)
          .single();

        if (!staffData) {
          router.push('/verify');
          return;
        }

        setStaffInfo({
          id: staffData.id,
          organization_id: staffData.org_id,
          license_number: staffData.license_number ?? '',
          staff_type: staffData.staff_type ?? 'nurse',
          specialties: (staffData.specialties as string[]) ?? [],
          is_active: staffData.is_active ?? true,
        });
      }

      setLoading(false);
    }

    init();
  }, [router, setProfile, setOrganization, setStaffInfo]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-on-surface-variant">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar />
      <TopBar />
      <main
        className={`pt-[72px] transition-all duration-300 ${
          sidebarOpen ? 'ml-64' : 'ml-[72px]'
        }`}
      >
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
