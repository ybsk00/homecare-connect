'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { clsx } from 'clsx';

const orgTypeOptions = [
  { value: 'home_nursing', label: '방문간호센터' },
  { value: 'home_care', label: '재가복지센터' },
  { value: 'rehab_center', label: '재활치료센터' },
  { value: 'clinic', label: '의원' },
  { value: 'hospital', label: '병원' },
];

const serviceOptions = [
  'nursing',
  'physio',
  'bath',
  'care',
  'doctor_visit',
];

const serviceLabels: Record<string, string> = {
  nursing: '방문간호',
  physio: '방문재활',
  bath: '방문목욕',
  care: '방문돌봄',
  doctor_visit: '방문진료',
};

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Account
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  // Location
  const [locationCoords, setLocationCoords] = useState<{lat: number, lng: number} | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const getLocation = () => {
    if (!navigator.geolocation) {
      alert('이 브라우저에서는 위치 기능을 지원하지 않습니다.');
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationLoading(false);
      },
      (error) => {
        console.error('위치 획득 실패:', error);
        alert('위치를 가져올 수 없습니다. 브라우저 위치 권한을 확인해주세요.');
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Step 2: Organization
  const [orgName, setOrgName] = useState('');
  const [businessNumber, setBusinessNumber] = useState('');
  const [orgType, setOrgType] = useState('home_nursing');
  const [orgPhone, setOrgPhone] = useState('');
  const [address, setAddress] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const toggleService = (service: string) => {
    setSelectedServices((prev) =>
      prev.includes(service)
        ? prev.filter((s) => s !== service)
        : [...prev, service]
    );
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      if (password !== confirmPassword) {
        setError('비밀번호가 일치하지 않습니다.');
        return;
      }
      if (password.length < 6) {
        setError('비밀번호는 6자 이상이어야 합니다.');
        return;
      }
      setError('');
      setStep(2);
      return;
    }

    setError('');
    setLoading(true);

    try {
      const supabase = createBrowserSupabaseClient();

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      if (!authData.user) {
        setError('회원가입에 실패했습니다.');
        return;
      }

      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        role: 'org_admin',
        full_name: fullName,
        phone,
      } as never);

      if (profileError) {
        setError('프로필 생성 실패: ' + profileError.message);
        return;
      }

      const { error: orgError } = await supabase.from('organizations').insert({
        owner_id: authData.user.id,
        name: orgName,
        business_number: businessNumber,
        org_type: orgType as 'home_nursing' | 'home_care' | 'rehab_center' | 'clinic' | 'hospital',
        phone: orgPhone,
        address,
        location: locationCoords
          ? `POINT(${locationCoords.lng} ${locationCoords.lat})`
          : 'POINT(127.0 37.5)',
        services: selectedServices,
      } as never);

      if (orgError) {
        setError('기관 등록 실패: ' + orgError.message);
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setError('등록 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white p-8 shadow-[0_10px_40px_rgba(24,28,30,0.05)]">
      <h2 className="text-center text-xl font-bold text-on-surface">
        기관 등록
      </h2>
      <p className="mt-1 text-center text-sm text-on-surface-variant">
        {step === 1 ? '관리자 계정 정보를 입력하세요' : '기관 정보를 입력하세요'}
      </p>

      {/* Step indicator */}
      <div className="mt-6 flex items-center justify-center gap-3">
        <div
          className={clsx(
            'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors',
            step >= 1
              ? 'bg-gradient-to-br from-primary to-primary-container text-white'
              : 'bg-surface-container-high text-on-surface-variant'
          )}
        >
          1
        </div>
        <div className="h-0.5 w-10 rounded-full bg-surface-container-high" />
        <div
          className={clsx(
            'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors',
            step >= 2
              ? 'bg-gradient-to-br from-primary to-primary-container text-white'
              : 'bg-surface-container-high text-on-surface-variant'
          )}
        >
          2
        </div>
      </div>

      <form onSubmit={handleRegister} className="mt-8 space-y-5">
        {step === 1 ? (
          <>
            <Input
              label="이름"
              placeholder="홍길동"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <Input
              label="이메일"
              type="email"
              placeholder="admin@hospital.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="연락처"
              type="tel"
              placeholder="010-1234-5678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <Input
              label="비밀번호"
              type="password"
              placeholder="6자 이상 입력하세요"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Input
              label="비밀번호 확인"
              type="password"
              placeholder="비밀번호를 다시 입력하세요"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </>
        ) : (
          <>
            <Input
              label="기관명"
              placeholder="행복방문간호센터"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              required
            />
            <Input
              label="사업자등록번호"
              placeholder="123-45-67890"
              value={businessNumber}
              onChange={(e) => setBusinessNumber(e.target.value)}
              required
            />
            <Select
              label="기관 유형"
              options={orgTypeOptions}
              value={orgType}
              onChange={(e) => setOrgType(e.target.value)}
            />
            <Input
              label="기관 전화번호"
              type="tel"
              placeholder="02-1234-5678"
              value={orgPhone}
              onChange={(e) => setOrgPhone(e.target.value)}
              required
            />
            <Input
              label="주소"
              placeholder="서울시 강남구 역삼동 123"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={getLocation}
                disabled={locationLoading}
                className={clsx(
                  'rounded-full px-4 py-2 text-xs font-semibold transition-all',
                  'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest',
                  locationLoading && 'opacity-60 cursor-not-allowed'
                )}
              >
                {locationLoading ? '위치 확인 중...' : '현재 위치 사용'}
              </button>
              {locationCoords && (
                <span className="text-xs font-medium text-secondary">위치 확인됨</span>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-on-surface">
                제공 서비스
              </label>
              <div className="flex flex-wrap gap-2">
                {serviceOptions.map((service) => (
                  <button
                    key={service}
                    type="button"
                    onClick={() => toggleService(service)}
                    className={clsx(
                      'rounded-full px-4 py-2 text-xs font-semibold transition-all',
                      selectedServices.includes(service)
                        ? 'bg-gradient-to-r from-primary to-primary-container text-white'
                        : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                    )}
                  >
                    {serviceLabels[service]}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {error && (
          <div className="rounded-xl bg-error/5 p-3.5 text-sm text-error">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          {step === 2 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              className="flex-1"
            >
              이전
            </Button>
          )}
          <Button type="submit" loading={loading} className="flex-1">
            {step === 1 ? '다음' : '기관 등록'}
          </Button>
        </div>
      </form>

      <div className="mt-8 text-center">
        <p className="text-sm text-on-surface-variant">
          이미 계정이 있으신가요?{' '}
          <Link
            href="/login"
            className="font-semibold text-primary hover:text-primary-container"
          >
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
