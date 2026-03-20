'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { useAppStore } from '@/lib/store';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import {
  User,
  Building2,
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
  Award,
  LogOut,
  Bell,
} from 'lucide-react';

const specialtyLabels: Record<string, string> = {
  nursing: '방문간호',
  physio: '방문재활',
  bath: '방문목욕',
  care: '방문돌봄',
  wound: '상처 관리',
  diabetes: '당뇨 관리',
  dementia: '치매 관리',
  palliative: '완화 케어',
};

export default function SettingsPage() {
  const { profile, staffInfo } = useAppStore();
  const router = useRouter();

  // Organization info
  const { data: org, isLoading } = useQuery({
    queryKey: ['nurse-org', staffInfo?.organization_id],
    queryFn: async () => {
      if (!staffInfo?.organization_id) return null;
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase
        .from('organizations')
        .select('id, name, org_type, phone, email, address')
        .eq('id', staffInfo.organization_id)
        .single();
      return data as {
        id: string;
        name: string;
        org_type: string;
        phone: string;
        email: string | null;
        address: string;
      } | null;
    },
    enabled: !!staffInfo?.organization_id,
  });

  const handleLogout = async () => {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (isLoading) return <Loading />;

  const orgTypeLabels: Record<string, string> = {
    home_nursing: '방문간호센터',
    home_care: '재가복지센터',
    rehab_center: '재활치료센터',
    clinic: '의원',
    hospital: '병원',
  };

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-on-surface">설정</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          내 정보 및 알림 설정을 관리합니다.
        </p>
      </div>

      {/* Profile info */}
      <Card elevated className="ambient-shadow">
        <CardHeader>
          <CardTitle>
            <User className="mr-2 inline h-5 w-5 text-primary" />
            내 정보
          </CardTitle>
          <Badge variant={staffInfo?.is_active ? 'success' : 'warning'}>
            {staffInfo?.is_active ? '활성' : '비활성'}
          </Badge>
        </CardHeader>

        <div className="flex items-start gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-container">
            <User className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <p className="text-lg font-bold text-on-surface">
                {profile?.full_name || '이름 없음'}
              </p>
              <p className="text-sm text-on-surface-variant">
                {staffInfo?.staff_type === 'nurse' ? '간호사' : staffInfo?.staff_type || '직원'}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {profile?.phone && (
                <div className="flex items-center gap-2 rounded-xl bg-surface-container-low px-3 py-2.5 text-sm text-on-surface-variant">
                  <Phone className="h-4 w-4 text-secondary" />
                  {profile.phone}
                </div>
              )}
              <div className="flex items-center gap-2 rounded-xl bg-surface-container-low px-3 py-2.5 text-sm text-on-surface-variant">
                <ShieldCheck className="h-4 w-4 text-secondary" />
                <span>면허번호: <span className="font-semibold text-on-surface">{staffInfo?.license_number || '-'}</span></span>
              </div>
            </div>

            {/* Specialties */}
            {staffInfo?.specialties && staffInfo.specialties.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1 text-xs font-medium text-on-surface-variant">
                  <Award className="h-3.5 w-3.5 text-secondary" />
                  전문 분야
                </p>
                <div className="flex flex-wrap gap-2">
                  {staffInfo.specialties.map((spec) => (
                    <span
                      key={spec}
                      className="rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-on-secondary-container"
                    >
                      {specialtyLabels[spec] || spec}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Organization info */}
      {org && (
        <Card className="ambient-shadow">
          <CardHeader>
            <CardTitle>
              <Building2 className="mr-2 inline h-5 w-5 text-primary" />
              소속 기관
            </CardTitle>
          </CardHeader>

          <div className="space-y-4">
            <div>
              <p className="text-base font-semibold text-on-surface">{org.name}</p>
              <p className="mt-0.5 text-sm text-on-surface-variant">
                {orgTypeLabels[org.org_type] || org.org_type}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {org.phone && (
                <div className="flex items-center gap-2 rounded-xl bg-surface-container-low px-3 py-2.5 text-sm text-on-surface-variant">
                  <Phone className="h-4 w-4 text-secondary" />
                  {org.phone}
                </div>
              )}
              {org.email && (
                <div className="flex items-center gap-2 rounded-xl bg-surface-container-low px-3 py-2.5 text-sm text-on-surface-variant">
                  <Mail className="h-4 w-4 text-secondary" />
                  {org.email}
                </div>
              )}
              {org.address && (
                <div className="flex items-center gap-2 rounded-xl bg-surface-container-low px-3 py-2.5 text-sm text-on-surface-variant sm:col-span-2">
                  <MapPin className="h-4 w-4 shrink-0 text-secondary" />
                  {org.address}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Notification settings */}
      <Card className="ambient-shadow">
        <CardHeader>
          <CardTitle>
            <Bell className="mr-2 inline h-5 w-5 text-primary" />
            알림 설정
          </CardTitle>
        </CardHeader>

        <div className="space-y-4">
          {[
            { label: '새로운 방문 배정 알림', key: 'visit_assigned', defaultOn: true },
            { label: '레드플래그 알림', key: 'red_flag', defaultOn: true },
            { label: '스케줄 변경 알림', key: 'schedule_change', defaultOn: true },
            { label: '환자 메시지 알림', key: 'patient_message', defaultOn: false },
          ].map((item) => (
            <label
              key={item.key}
              className="flex cursor-pointer items-center justify-between rounded-xl bg-surface-container-low p-4 transition-colors hover:bg-surface-container-high/50"
            >
              <span className="text-sm font-medium text-on-surface">{item.label}</span>
              <input
                type="checkbox"
                defaultChecked={item.defaultOn}
                className="h-4 w-4 rounded accent-secondary"
              />
            </label>
          ))}
        </div>
      </Card>

      {/* Logout */}
      <div className="flex justify-center pb-8">
        <Button variant="danger" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          로그아웃
        </Button>
      </div>
    </div>
  );
}
