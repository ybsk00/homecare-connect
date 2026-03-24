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

  const handleKakaoLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (oauthError) {
        setError('카카오 로그인 요청에 실패했습니다.');
      }
    } catch {
      setError('카카오 로그인 중 오류가 발생했습니다.');
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
          onClick={handleKakaoLogin}
          disabled={loading}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
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
