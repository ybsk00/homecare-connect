'use client';

import { ContentNav } from './ContentNav';
import { useAppStore } from '@/lib/store';

export function ContentLayout({ children }: { children: React.ReactNode }) {
  const { profile } = useAppStore();
  const role = (profile?.role as string) ?? 'guardian';

  return (
    <div className="min-h-screen bg-surface">
      <ContentNav role={role} profile={profile} />
      <main className="lg:ml-72 pt-20 pb-12 px-6 md:px-12 bg-surface min-h-screen">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
