'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // 프로덕션 에러 로깅 (Sentry 설정 시 여기에 연동)
  if (typeof window !== 'undefined') {
    console.error('[GlobalError]', {
      message: error.message,
      digest: error.digest,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    });
  }

  return (
    <html lang="ko">
      <body>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          fontFamily: 'Pretendard, system-ui, sans-serif',
          color: '#002045',
          padding: '2rem',
        }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
            서비스에 문제가 발생했습니다
          </h1>
          <p style={{ color: '#666', marginBottom: '2rem', textAlign: 'center' }}>
            잠시 후 다시 시도해주세요. 문제가 지속되면 관리자에게 문의하세요.
          </p>
          <button
            onClick={reset}
            style={{
              padding: '0.75rem 2rem',
              background: '#002045',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
