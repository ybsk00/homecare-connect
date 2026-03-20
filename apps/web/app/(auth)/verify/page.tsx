'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ShieldCheck, Building2, CheckCircle2 } from 'lucide-react';

export default function VerifyPage() {
  const router = useRouter();
  const [licenseNumber, setLicenseNumber] = useState('');
  const [orgCode, setOrgCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ orgName: string } | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('로그인이 필요합니다.');
        return;
      }

      // Look up organization by business_number
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('business_number', orgCode)
        .single();

      if (orgError || !org) {
        setError('유효한 기관 코드를 찾을 수 없습니다. 사업자등록번호를 확인해주세요.');
        return;
      }

      // Check if staff record already exists
      const { data: existingStaff } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existingStaff) {
        // Update existing staff record
        const { error: updateError } = await supabase
          .from('staff')
          .update({
            org_id: org.id,
            license_number: licenseNumber,
            staff_type: 'nurse',
            is_active: true,
          } as never)
          .eq('id', existingStaff.id);

        if (updateError) {
          setError('직원 정보 업데이트 중 오류가 발생했습니다.');
          return;
        }
      } else {
        // Create new staff record
        const { error: insertError } = await supabase
          .from('staff')
          .insert({
            user_id: user.id,
            org_id: org.id,
            license_number: licenseNumber,
            staff_type: 'nurse',
            specialties: [],
            is_active: true,
          } as never);

        if (insertError) {
          setError('직원 등록 중 오류가 발생했습니다.');
          return;
        }
      }

      // Update profile role to nurse
      await supabase
        .from('profiles')
        .update({ role: 'nurse' } as never)
        .eq('id', user.id);

      setSuccess({ orgName: org.name });

      // Redirect after delay
      setTimeout(() => {
        router.push('/nurse');
        router.refresh();
      }, 2000);
    } catch {
      setError('인증 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-[0_10px_40px_rgba(24,28,30,0.05)]">
        <div className="flex flex-col items-center py-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10">
            <CheckCircle2 className="h-8 w-8 text-secondary" />
          </div>
          <h2 className="mt-5 text-xl font-bold text-on-surface">인증 완료</h2>
          <p className="mt-2 text-center text-sm text-on-surface-variant">
            <span className="font-semibold text-secondary">{success.orgName}</span>
            에 간호사로 등록되었습니다.
          </p>
          <p className="mt-1 text-xs text-on-surface-variant">
            잠시 후 대시보드로 이동합니다...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-8 shadow-[0_10px_40px_rgba(24,28,30,0.05)]">
      <h2 className="text-center text-xl font-bold text-on-surface">간호사 인증</h2>
      <p className="mt-1 text-center text-sm text-on-surface-variant">
        면허번호와 소속 기관을 인증하세요
      </p>

      <form onSubmit={handleVerify} className="mt-8 space-y-5">
        <div className="relative">
          <ShieldCheck className="absolute left-4 top-[42px] h-4 w-4 text-on-surface-variant/50" />
          <Input
            label="간호사 면허번호"
            type="text"
            placeholder="면허번호를 입력하세요"
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
            required
            className="pl-11"
          />
        </div>

        <div className="relative">
          <Building2 className="absolute left-4 top-[42px] h-4 w-4 text-on-surface-variant/50" />
          <Input
            label="소속 기관 코드"
            type="text"
            placeholder="사업자등록번호 (예: 123-45-67890)"
            value={orgCode}
            onChange={(e) => setOrgCode(e.target.value)}
            required
            className="pl-11"
            helperText="소속 기관의 사업자등록번호를 입력하세요"
          />
        </div>

        {error && (
          <div className="rounded-xl bg-error/5 p-3.5 text-sm text-error">
            {error}
          </div>
        )}

        <Button type="submit" loading={loading} className="w-full">
          인증하기
        </Button>
      </form>
    </div>
  );
}
