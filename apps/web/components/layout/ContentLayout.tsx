'use client';

import { ContentNav } from './ContentNav';
import { useAppStore } from '@/lib/store';

export function ContentLayout({ children }: { children: React.ReactNode }) {
  const { profile } = useAppStore();
  const role = (profile?.role as string) ?? 'guardian';

  return (
    <div className="min-h-screen bg-surface">
      <ContentNav role={role} profile={profile} />
      <main className="pt-20 px-8 pb-12 max-w-[1400px] mx-auto">
        {children}
      </main>
    </div>
  );
}
