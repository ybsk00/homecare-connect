import type { Metadata } from 'next';
import { QueryProvider } from '@/lib/query-provider';
import './globals.css';

export const metadata: Metadata = {
  title: '홈케어커넥트 - AI 기반 방문치료 매칭 플랫폼',
  description:
    'AI 기반 방문간호 매칭부터 실시간 건강 모니터링까지, 전문적인 케어를 경험하세요.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-surface text-on-surface antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
