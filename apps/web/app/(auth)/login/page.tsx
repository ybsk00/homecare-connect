'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Mail, Lock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 네이버 OAuth 콜백 에러 처리
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      const errorMessages: Record<string, string> = {
        naver_config: '네이버 로그인 설정이 올바르지 않습니다.',
        naver_missing_params: '네이버 인증 파라미터가 누락되었습니다.',
        naver_invalid_state: '네이버 인증 상태가 유효하지 않습니다. 다시 시도해주세요.',
        naver_token_failed: '네이버 인증 토큰 교환에 실패했습니다.',
        naver_profile_failed: '네이버 프로필 조회에 실패했습니다.',
        naver_no_email: '네이버 계정에 이메일이 없습니다. 이메일 제공에 동의해주세요.',
        naver_create_user_failed: '네이버 계정으로 회원가입에 실패했습니다.',
        naver_signin_failed: '네이버 로그인 세션 생성에 실패했습니다.',
        naver_server_error: '네이버 로그인 중 서버 오류가 발생했습니다.',
        server_config: '서버 설정 오류입니다. 관리자에게 문의하세요.',
      };
      setError(errorMessages[errorParam] || '로그인 중 오류가 발생했습니다.');
    }
  }, [searchParams]);

  const handleSocialLogin = async (provider: 'kakao' | 'google') => {
    setError('');
    setLoading(true);
    const label = provider === 'kakao' ? '카카오' : '구글';
    try {
      const supabase = createBrowserSupabaseClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (oauthError) {
        setError(`${label} 로그인 요청에 실패했습니다.`);
      }
    } catch {
      setError(`${label} 로그인 중 오류가 발생했습니다.`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = createBrowserSupabaseClient();

      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({ email, password });

      if (authError) {
        if (authError.message.includes('Invalid login')) {
          setError('이메일 또는 비밀번호가 올바르지 않습니다.');
        } else {
          setError(authError.message);
        }
        return;
      }

      if (!authData.user) {
        setError('로그인에 실패했습니다.');
        return;
      }

      // Query profile to get role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        setError('프로필을 찾을 수 없습니다.');
        return;
      }

      const role = profile.role as string;

      // Route based on role
      if (role === 'guardian') {
        router.push('/patient');
      } else if (role === 'nurse') {
        // Check if staff record exists
        const { data: staffRecord } = await supabase
          .from('staff')
          .select('id')
          .eq('user_id', authData.user.id)
          .single();

        if (staffRecord) {
          router.push('/nurse');
        } else {
          router.push('/verify');
        }
      } else if (role === 'org_admin') {
        router.push('/hospital');
      } else if (role === 'platform_admin') {
        // Verify admin role
        const { data: adminProfile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authData.user.id)
          .eq('role', 'platform_admin')
          .single();

        if (!adminProfile) {
          setError('관리자 권한이 없습니다.');
          await supabase.auth.signOut();
          return;
        }
        router.push('/admin');
      } else {
        // Default fallback
        router.push('/patient');
      }

      router.refresh();
    } catch {
      setError('로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white p-8 shadow-[0_10px_40px_rgba(24,28,30,0.05)]">
      <h2 className="text-center text-xl font-bold text-on-surface">
        로그인
      </h2>
      <p className="mt-1 text-center text-sm text-on-surface-variant">
        계정에 로그인하세요
      </p>

      <form onSubmit={handleLogin} className="mt-8 space-y-5">
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium text-on-surface"
          >
            이메일
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant/50" />
            <input
              id="email"
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="block w-full rounded-xl bg-surface-container-highest px-4 py-2.5 pl-11 text-sm text-on-surface transition-all placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-medium text-on-surface"
          >
            비밀번호
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant/50" />
            <input
              id="password"
              type="password"
              placeholder="비밀번호를 입력하세요"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="block w-full rounded-xl bg-surface-container-highest px-4 py-2.5 pl-11 text-sm text-on-surface transition-all placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-tertiary/5 p-3.5 text-sm text-tertiary">
            {error}
          </div>
        )}

        <Button type="submit" loading={loading} className="w-full">
          로그인
        </Button>
      </form>

      {/* 소셜 로그인 */}
      <div className="mt-8">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-on-surface-variant/10" />
          <span className="text-xs font-medium text-on-surface-variant">또는</span>
          <div className="h-px flex-1 bg-on-surface-variant/10" />
        </div>

        <button
          type="button"
          onClick={() => handleSocialLogin('google')}
          disabled={loading}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-on-surface-variant/20 bg-white py-2.5 text-sm font-bold text-on-surface transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          구글로 로그인
        </button>

        <button
          type="button"
          onClick={() => handleSocialLogin('kakao')}
          disabled={loading}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: '#FEE500' }}
        >
          <span className="text-base font-extrabold">K</span>
          카카오로 로그인
        </button>

        <button
          type="button"
          onClick={() => { window.location.href = '/api/auth/naver'; }}
          disabled={loading}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: '#03C75A' }}
        >
          <span className="text-base font-extrabold">N</span>
          네이버로 로그인
        </button>
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-on-surface-variant">
          계정이 없으신가요?{' '}
          <Link
            href="/register"
            className="font-semibold text-primary hover:text-primary-container"
          >
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
