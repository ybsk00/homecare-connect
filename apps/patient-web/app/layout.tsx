import type { Metadata } from 'next';
import { QueryProvider } from '@/lib/query-provider';
import './globals.css';

export const metadata: Metadata = {
  title: '홈케어커넥트 - 환자/보호자',
  description: '방문치료 환자 및 보호자를 위한 종합 관리 시스템',
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
