import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

interface NaverProfile {
  resultcode: string;
  message: string;
  response: {
    id: string;
    email?: string;
    name?: string;
    profile_image?: string;
    mobile?: string;
  };
}

/**
 * 네이버 OAuth 콜백
 * GET /api/auth/naver/callback?code=...&state=...
 *
 * 1. code → access_token 교환
 * 2. access_token → 네이버 프로필 조회
 * 3. Supabase에서 이메일로 기존 유저 확인
 * 4. 없으면 → 새 유저 생성 (admin API)
 * 5. signInWithPassword로 세션 생성
 * 6. 역할별 페이지로 리다이렉트
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // 에러 리다이렉트 헬퍼
  const redirectToLogin = (error: string) =>
    NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent(error)}`);

  // 1. 파라미터 검증
  if (!code || !state) {
    return redirectToLogin('naver_missing_params');
  }

  // CSRF state 검증
  const savedState = request.cookies.get('naver_oauth_state')?.value;
  if (!savedState || savedState !== state) {
    return redirectToLogin('naver_invalid_state');
  }

  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!clientId || !clientSecret) {
    console.error('네이버 OAuth 환경변수가 설정되지 않았습니다.');
    return redirectToLogin('naver_config');
  }

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Supabase 환경변수가 설정되지 않았습니다.');
    return redirectToLogin('server_config');
  }

  try {
    // 2. code → access_token 교환
    const tokenUrl = new URL('https://nid.naver.com/oauth2.0/token');
    tokenUrl.searchParams.set('grant_type', 'authorization_code');
    tokenUrl.searchParams.set('client_id', clientId);
    tokenUrl.searchParams.set('client_secret', clientSecret);
    tokenUrl.searchParams.set('code', code);
    tokenUrl.searchParams.set('state', state);

    const tokenResponse = await fetch(tokenUrl.toString(), { method: 'POST' });
    const tokenData = await tokenResponse.json();

    if (tokenData.error || !tokenData.access_token) {
      console.error('네이버 토큰 교환 실패:', tokenData);
      return redirectToLogin('naver_token_failed');
    }

    const accessToken = tokenData.access_token as string;

    // 3. 프로필 조회
    const profileResponse = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileResponse.ok) {
      console.error('네이버 프로필 조회 실패:', profileResponse.status);
      return redirectToLogin('naver_profile_failed');
    }

    const profileData: NaverProfile = await profileResponse.json();

    if (profileData.resultcode !== '00' || !profileData.response) {
      console.error('네이버 프로필 응답 오류:', profileData);
      return redirectToLogin('naver_profile_failed');
    }

    const naverUser = profileData.response;
    const naverId = naverUser.id;
    const email = naverUser.email;

    if (!email) {
      return redirectToLogin('naver_no_email');
    }

    // 4. Supabase admin 클라이언트 (service_role)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 네이버 고유 비밀번호 생성
    const naverPassword = `naver_${naverId}_${clientSecret.substring(0, 8)}`;

    // 기존 유저 확인 (이메일 기반)
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email === email
    );

    if (!existingUser) {
      // 5a. 새 유저 생성
      const { error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: naverPassword,
        email_confirm: true,
        user_metadata: {
          provider: 'naver',
          naver_id: naverId,
          full_name: naverUser.name || '',
          avatar_url: naverUser.profile_image || '',
          phone: naverUser.mobile || '',
        },
      });

      if (createError) {
        console.error('유저 생성 실패:', createError);
        return redirectToLogin('naver_create_user_failed');
      }
    } else {
      // 5b. 기존 유저 — 비밀번호 갱신 (네이버 로그인 연동)
      await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password: naverPassword,
        user_metadata: {
          ...existingUser.user_metadata,
          provider: existingUser.user_metadata?.provider || 'naver',
          naver_id: naverId,
          avatar_url: existingUser.user_metadata?.avatar_url || naverUser.profile_image || '',
        },
      });
    }

    // 6. SSR 클라이언트로 signInWithPassword → 세션 쿠키 설정
    const redirectResponse = NextResponse.redirect(`${baseUrl}/patient`);

    // state 쿠키 제거
    redirectResponse.cookies.delete('naver_oauth_state');

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              redirectResponse.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password: naverPassword,
      });

    if (signInError || !signInData.user) {
      console.error('네이버 로그인 세션 생성 실패:', signInError);
      return redirectToLogin('naver_signin_failed');
    }

    // 7. 역할 기반 리다이렉트
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', signInData.user.id)
      .single();

    if (profile?.role) {
      const roleRoutes: Record<string, string> = {
        guardian: '/patient',
        nurse: '/nurse',
        org_admin: '/hospital',
        platform_admin: '/admin',
      };
      const redirectPath = roleRoutes[profile.role as string] ?? '/patient';
      return NextResponse.redirect(`${baseUrl}${redirectPath}`, {
        headers: redirectResponse.headers,
      });
    }

    return redirectResponse;
  } catch (err) {
    console.error('네이버 OAuth 콜백 오류:', err);
    return redirectToLogin('naver_server_error');
  }
}
