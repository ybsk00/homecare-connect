'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Mail, Lock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = createBrowserSupabaseClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          setError('이메일 또는 비밀번호가 올바르지 않습니다.');
        } else {
          setError(authError.message);
        }
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setError('로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white p-8 shadow-[0_10px_40px_rgba(24,28,30,0.05)]">
      <h2 className="text-center text-xl font-bold text-on-surface">로그인</h2>
      <p className="mt-1 text-center text-sm text-on-surface-variant">
        기관 관리자 계정으로 로그인하세요
      </p>

      <form onSubmit={handleLogin} className="mt-8 space-y-5">
        <div className="relative">
          <Mail className="absolute left-4 top-[42px] h-4 w-4 text-on-surface-variant/50" />
          <Input
            label="이메일"
            type="email"
            placeholder="admin@hospital.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="pl-11"
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-4 top-[42px] h-4 w-4 text-on-surface-variant/50" />
          <Input
            label="비밀번호"
            type="password"
            placeholder="비밀번호를 입력하세요"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="pl-11"
          />
        </div>

        {error && (
          <div className="rounded-xl bg-error/5 p-3.5 text-sm text-error">
            {error}
          </div>
        )}

        <Button type="submit" loading={loading} className="w-full">
          로그인
        </Button>
      </form>

      <div className="mt-8 text-center">
        <p className="text-sm text-on-surface-variant">
          아직 계정이 없으신가요?{' '}
          <Link
            href="/register"
            className="font-semibold text-primary hover:text-primary-container"
          >
            기관 등록
          </Link>
        </p>
      </div>
    </div>
  );
}
