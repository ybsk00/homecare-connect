import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '홈케어커넥트 - AI 기반 방문치료 매칭 플랫폼',
  description:
    'AI 기반 방문간호 매칭부터 실시간 건강 모니터링까지, 가족을 위한 가장 따뜻한 기술. 검증된 전문 간호사와 매칭하세요.',
  keywords: ['방문간호', '홈케어', 'AI 매칭', '건강 모니터링', '간호사 매칭'],
  openGraph: {
    title: '홈케어커넥트 - AI 기반 방문치료 매칭 플랫폼',
    description:
      'AI 기반 방문간호 매칭부터 실시간 건강 모니터링까지, 가족을 위한 가장 따뜻한 기술.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-surface text-on-surface antialiased">
        {children}
      </body>
    </html>
  );
}
