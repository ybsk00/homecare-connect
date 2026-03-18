import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HomeCare Connect - 관리자 콘솔',
  description: '홈케어커넥트 플랫폼 관리자 백오피스',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-screen bg-surface text-primary-700 antialiased">
        {children}
      </body>
    </html>
  );
}
