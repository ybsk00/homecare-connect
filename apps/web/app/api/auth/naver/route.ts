import { NextResponse } from 'next/server';

/**
 * 네이버 OAuth 인증 시작
 * GET /api/auth/naver
 * → 네이버 로그인 페이지로 리다이렉트
 */
export async function GET() {
  const clientId = process.env.NAVER_CLIENT_ID;

  if (!clientId) {
    console.error('NAVER_CLIENT_ID 환경변수가 설정되지 않았습니다.');
    return NextResponse.redirect(
      new URL('/login?error=naver_config', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const redirectUri = `${baseUrl}/api/auth/naver/callback`;

  // CSRF 방지용 state 토큰 생성
  const state = crypto.randomUUID();

  const naverAuthUrl = new URL('https://nid.naver.com/oauth2.0/authorize');
  naverAuthUrl.searchParams.set('response_type', 'code');
  naverAuthUrl.searchParams.set('client_id', clientId);
  naverAuthUrl.searchParams.set('redirect_uri', redirectUri);
  naverAuthUrl.searchParams.set('state', state);

  const response = NextResponse.redirect(naverAuthUrl.toString());

  // state를 쿠키에 저장하여 콜백에서 검증
  response.cookies.set('naver_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10분
    path: '/',
  });

  return response;
}
