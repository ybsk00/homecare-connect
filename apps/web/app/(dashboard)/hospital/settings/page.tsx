'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/ui/Loading';
import { useAppStore } from '@/lib/store';
import { Save, Building2, Clock, MapPin, Wrench } from 'lucide-react';
import { clsx } from 'clsx';
import type { Tables } from '@homecare/shared-types';

const orgTypeOptions = [
  { value: 'home_nursing', label: '방문간호센터' },
  { value: 'home_care', label: '재가복지센터' },
  { value: 'rehab_center', label: '재활치료센터' },
  { value: 'clinic', label: '의원' },
  { value: 'hospital', label: '병원' },
];

const serviceOptions = [
  { key: 'nursing', label: '방문간호' },
  { key: 'physio', label: '방문재활' },
  { key: 'bath', label: '방문목욕' },
  { key: 'care', label: '방문돌봄' },
  { key: 'doctor_visit', label: '방문진료' },
];

const dayLabels = ['월', '화', '수', '목', '금', '토', '일'];
const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { setOrganization } = useAppStore();

  const [name, setName] = useState('');
  const [orgType, setOrgType] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [serviceAreaKm, setServiceAreaKm] = useState('10');
  const [services, setServices] = useState<string[]>([]);
  const [operatingHours, setOperatingHours] = useState<
    Record<string, { start: string; end: string }>
  >({});

  const { data: org, isLoading } = useQuery({
    queryKey: ['org-settings'],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data } = await supabase
        .from('organizations')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      return data as Tables<'organizations'> | null;
    },
  });

  useEffect(() => {
    if (org) {
      setName(org.name);
      setOrgType(org.org_type);
      setPhone(org.phone);
      setEmail(org.email || '');
      setAddress(org.address);
      setAddressDetail(org.address_detail || '');
      setWebsite(org.website || '');
      setDescription(org.description || '');
      setServiceAreaKm(String(org.service_area_km));
      setServices(org.services);
      if (org.operating_hours) {
        setOperatingHours(
          org.operating_hours as Record<string, { start: string; end: string }>
        );
      } else {
        const defaults: Record<string, { start: string; end: string }> = {};
        dayKeys.forEach((key) => {
          defaults[key] = { start: '09:00', end: '18:00' };
        });
        setOperatingHours(defaults);
      }
    }
  }, [org]);

  const toggleService = (svc: string) => {
    setServices((prev) =>
      prev.includes(svc) ? prev.filter((s) => s !== svc) : [...prev, svc]
    );
  };

  const updateHours = (
    day: string,
    field: 'start' | 'end',
    value: string
  ) => {
    setOperatingHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!org) return;
      const supabase = createBrowserSupabaseClient();

      const { data, error } = await supabase
        .from('organizations')
        .update({
          name,
          org_type: orgType as 'home_nursing' | 'home_care' | 'rehab_center' | 'clinic' | 'hospital',
          phone,
          email: email || null,
          address,
          address_detail: addressDetail || null,
          website: website || null,
          description: description || null,
          service_area_km: Number(serviceAreaKm),
          services,
          operating_hours: operatingHours,
        } as never)
        .eq('id', org.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data) {
        setOrganization(data as Tables<'organizations'>);
      }
      queryClient.invalidateQueries({ queryKey: ['org-settings'] });
    },
  });

  if (isLoading) return <Loading />;

  if (!org) {
    return (
      <div className="py-14 text-center text-on-surface-variant">
        기관 정보를 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">기관 설정</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            기관 정보를 수정합니다.
          </p>
        </div>
        <Button
          onClick={() => saveMutation.mutate()}
          loading={saveMutation.isPending}
        >
          <Save className="h-4 w-4" />
          저장
        </Button>
      </div>

      {saveMutation.isSuccess && (
        <div className="rounded-xl bg-secondary/10 p-4 text-sm text-secondary">
          설정이 저장되었습니다.
        </div>
      )}

      {saveMutation.isError && (
        <div className="rounded-xl bg-error/5 p-4 text-sm text-error">
          저장 중 오류가 발생했습니다.
        </div>
      )}

      {/* Organization info */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Building2 className="mr-2 inline h-5 w-5 text-on-surface-variant" />
            기관 정보
          </CardTitle>
          <Badge variant={org.verification_status === 'verified' ? 'success' : 'warning'}>
            {org.verification_status === 'verified' ? '인증완료' : '인증대기'}
          </Badge>
        </CardHeader>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Input
            label="기관명"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Select
            label="기관 유형"
            options={orgTypeOptions}
            value={orgType}
            onChange={(e) => setOrgType(e.target.value)}
          />
          <Input
            label="전화번호"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Input
            label="이메일"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="주소"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <Input
            label="상세 주소"
            value={addressDetail}
            onChange={(e) => setAddressDetail(e.target.value)}
          />
          <Input
            label="웹사이트"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
          <Input
            label="사업자등록번호"
            value={org.business_number}
            disabled
            helperText="사업자등록번호는 변경할 수 없습니다."
          />
        </div>

        <div className="mt-5">
          <Input
            label="기관 소개"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="기관에 대한 간단한 소개를 입력하세요."
          />
        </div>
      </Card>

      {/* Operating hours */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Clock className="mr-2 inline h-5 w-5 text-on-surface-variant" />
            운영 시간
          </CardTitle>
        </CardHeader>

        <div className="space-y-3">
          {dayKeys.map((key, i) => (
            <div key={key} className="flex items-center gap-4">
              <span className="w-8 text-center text-sm font-semibold text-on-surface">
                {dayLabels[i]}
              </span>
              <input
                type="time"
                value={operatingHours[key]?.start || '09:00'}
                onChange={(e) => updateHours(key, 'start', e.target.value)}
                className="rounded-xl bg-surface-container-highest px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
              <span className="text-sm text-on-surface-variant">~</span>
              <input
                type="time"
                value={operatingHours[key]?.end || '18:00'}
                onChange={(e) => updateHours(key, 'end', e.target.value)}
                className="rounded-xl bg-surface-container-highest px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Service area */}
      <Card>
        <CardHeader>
          <CardTitle>
            <MapPin className="mr-2 inline h-5 w-5 text-on-surface-variant" />
            서비스 지역
          </CardTitle>
        </CardHeader>

        <div className="max-w-xs">
          <Input
            label="서비스 반경 (km)"
            type="number"
            value={serviceAreaKm}
            onChange={(e) => setServiceAreaKm(e.target.value)}
            helperText="기관 주소를 기준으로 서비스 가능한 반경"
          />
        </div>
      </Card>

      {/* Service types */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Wrench className="mr-2 inline h-5 w-5 text-on-surface-variant" />
            제공 서비스
          </CardTitle>
        </CardHeader>

        <div className="flex flex-wrap gap-2.5">
          {serviceOptions.map((svc) => (
            <button
              key={svc.key}
              type="button"
              onClick={() => toggleService(svc.key)}
              className={clsx(
                'rounded-full px-5 py-2.5 text-sm font-semibold transition-all',
                services.includes(svc.key)
                  ? 'bg-gradient-to-r from-primary to-primary-container text-white'
                  : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
              )}
            >
              {svc.label}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
