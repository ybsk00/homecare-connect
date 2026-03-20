'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { Loading } from '@/components/ui/Loading';

export default function HomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/login');
        return;
      }

      // Check if user has staff record (nurse verified)
      const { data: staff } = await supabase
        .from('staff')
        .select('id, org_id, license_number, staff_type, specialties, is_active')
        .eq('user_id', user.id)
        .single();

      if (!staff) {
        router.replace('/verify');
        return;
      }

      router.replace('/dashboard');
    };

    check().finally(() => setChecking(false));
  }, [router]);

  if (checking) {
    return <Loading fullPage text="확인 중..." />;
  }

  return null;
}
