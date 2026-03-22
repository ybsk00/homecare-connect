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
    <div className="space-y-12">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight text-primary">설정</h1>
        <p className="mt-2 text-base leading-relaxed text-on-surface-variant">
          내 정보 및 알림 설정을 관리합니다.
        </p>
      </div>

      {/* Profile info */}
      <div className="rounded-3xl bg-surface-container-lowest p-8 shadow-[0_10px_40px_rgba(46,71,110,0.06)]">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-extrabold tracking-tight text-on-surface">내 정보</h2>
          </div>
          <Badge variant={staffInfo?.is_active ? 'success' : 'warning'}>
            {staffInfo?.is_active ? '활성' : '비활성'}
          </Badge>
        </div>

        <div className="flex items-start gap-6">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-primary-container shadow-[0_8px_24px_rgba(0,32,69,0.15)]">
            <User className="h-10 w-10 text-white" />
          </div>
          <div className="flex-1 space-y-5">
            <div>
              <p className="text-xl font-extrabold tracking-tight text-on-surface">
                {profile?.full_name || '이름 없음'}
              </p>
              <p className="mt-1 text-sm text-on-surface-variant">
                {staffInfo?.staff_type === 'nurse' ? '간호사' : staffInfo?.staff_type || '직원'}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {profile?.phone && (
                <div className="flex items-center gap-3 rounded-xl bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
                  <Phone className="h-4 w-4 text-secondary" />
                  {profile.phone}
                </div>
              )}
              <div className="flex items-center gap-3 rounded-xl bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
                <ShieldCheck className="h-4 w-4 text-secondary" />
                <span>면허번호: <span className="font-bold text-on-surface">{staffInfo?.license_number || '-'}</span></span>
              </div>
            </div>

            {/* Specialties */}
            {staffInfo?.specialties && staffInfo.specialties.length > 0 && (
              <div>
                <p className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  <Award className="h-3.5 w-3.5 text-secondary" />
                  전문 분야
                </p>
                <div className="flex flex-wrap gap-2">
                  {staffInfo.specialties.map((spec) => (
                    <span
                      key={spec}
                      className="rounded-full bg-secondary/10 px-4 py-1.5 text-xs font-bold text-on-secondary-container"
                    >
                      {specialtyLabels[spec] || spec}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Organization info */}
      {org && (
        <div className="rounded-3xl bg-surface-container-lowest p-8 shadow-[0_10px_40px_rgba(46,71,110,0.06)]">
          <div className="mb-6 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-extrabold tracking-tight text-on-surface">소속 기관</h2>
          </div>

          <div className="space-y-5">
            <div>
              <p className="text-lg font-extrabold tracking-tight text-on-surface">{org.name}</p>
              <p className="mt-1 text-sm text-on-surface-variant">
                {orgTypeLabels[org.org_type] || org.org_type}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {org.phone && (
                <div className="flex items-center gap-3 rounded-xl bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
                  <Phone className="h-4 w-4 text-secondary" />
                  {org.phone}
                </div>
              )}
              {org.email && (
                <div className="flex items-center gap-3 rounded-xl bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
                  <Mail className="h-4 w-4 text-secondary" />
                  {org.email}
                </div>
              )}
              {org.address && (
                <div className="flex items-center gap-3 rounded-xl bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant sm:col-span-2">
                  <MapPin className="h-4 w-4 shrink-0 text-secondary" />
                  {org.address}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notification settings */}
      <div className="rounded-3xl bg-surface-container-lowest p-8 shadow-[0_10px_40px_rgba(46,71,110,0.06)]">
        <div className="mb-6 flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-extrabold tracking-tight text-on-surface">알림 설정</h2>
        </div>

        <div className="space-y-3">
          {[
            { label: '새로운 방문 배정 알림', key: 'visit_assigned', defaultOn: true },
            { label: '레드플래그 알림', key: 'red_flag', defaultOn: true },
            { label: '스케줄 변경 알림', key: 'schedule_change', defaultOn: true },
            { label: '환자 메시지 알림', key: 'patient_message', defaultOn: false },
          ].map((item) => (
            <label
              key={item.key}
              className="flex cursor-pointer items-center justify-between rounded-2xl bg-surface-container-low p-5 transition-all duration-200 hover:bg-surface-container-high/40"
            >
              <span className="text-sm font-semibold text-on-surface">{item.label}</span>
              <div className="relative">
                <input
                  type="checkbox"
                  defaultChecked={item.defaultOn}
                  className="peer sr-only"
                />
                <div className="h-6 w-11 rounded-full bg-surface-container-high transition-colors peer-checked:bg-secondary" />
                <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Logout */}
      <div className="flex justify-center pb-10">
        <Button variant="danger" onClick={handleLogout} className="rounded-2xl px-8 py-3 active:scale-95 transition-transform">
          <LogOut className="h-4 w-4" />
          로그아웃
        </Button>
      </div>
    </div>
  );
}
