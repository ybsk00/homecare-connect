'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Shield, AlertTriangle, Lock } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = createBrowserSupabaseClient();

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profileError || (profile as { role: string } | null)?.role !== 'platform_admin') {
        await supabase.auth.signOut();
        setError('플랫폼 관리자 권한이 없습니다.');
        return;
      }

      router.push('/');
    } catch {
      setError('로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center gradient-primary px-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-secondary-700/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary-700/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />

      <div className="w-full max-w-[420px] relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl gradient-teal flex items-center justify-center mb-5 shadow-[var(--shadow-glow-teal)]">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">HomeCare Connect</h1>
          <p className="text-[13px] text-white/40 mt-1 tracking-wide">관리자 콘솔</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-3xl shadow-[var(--shadow-elevated)] p-9">
          <h2 className="text-lg font-bold text-primary-900 mb-1">플랫폼 관리자 로그인</h2>
          <p className="text-[13px] text-primary-400 mb-8">
            인가된 관리자만 접근할 수 있습니다.
          </p>

          <form onSubmit={handleLogin} className="space-y-5">
            <Input
              label="이메일"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@homecare.co.kr"
              required
            />

            <Input
              label="비밀번호"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              required
            />

            {error && (
              <div className="flex items-center gap-2.5 p-4 bg-danger-50 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-danger-500 shrink-0" />
                <p className="text-[13px] text-danger-600">{error}</p>
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full" size="lg">
              로그인
            </Button>
          </form>

          {/* IP Restriction Notice */}
          <div className="mt-8 p-4 bg-tertiary-50 rounded-xl">
            <div className="flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-tertiary-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[12px] font-semibold text-tertiary-700">IP 접근 제한</p>
                <p className="text-[11px] text-tertiary-500 mt-0.5 leading-relaxed">
                  관리자 페이지는 허용된 IP에서만 접속 가능합니다.
                  접근이 불가한 경우 시스템 관리자에게 문의하세요.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom branding */}
        <p className="text-center text-[10px] text-white/20 mt-8 tracking-widest uppercase">
          Powered by Serene Care
        </p>
      </div>
    </div>
  );
}
