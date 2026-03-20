'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import OrgReviewPanel from '@/components/admin/orgs/OrgReviewPanel';
import Card from '@/components/admin/ui/Card';
import Badge from '@/components/admin/ui/Badge';
import Button from '@/components/admin/ui/Button';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { formatDate, formatOrgType } from '@homecare/shared-utils';
import { ArrowLeft, Users, Calendar, MapPin } from 'lucide-react';
import type { OrgDetail, StaffMember, ServiceStats } from '@homecare/shared-types';

export default function OrgDetailClient() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.id as string;

  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [serviceStats, setServiceStats] = useState<ServiceStats>({
    totalPatients: 0,
    activeVisitsThisMonth: 0,
    completedVisitsThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function fetchOrgDetail() {
      try {
        const supabase = createBrowserSupabaseClient();

        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', orgId)
          .single();

        if (orgError) throw orgError;
        setOrg(orgData as OrgDetail);

        const { data: staffData } = await supabase
          .from('staff')
          .select(`
            id, staff_type, license_number, specialties,
            current_patient_count, max_patients, is_active,
            user:profiles (full_name, phone)
          `)
          .eq('org_id', orgId)
          .order('is_active', { ascending: false });

        setStaff((staffData as unknown as StaffMember[]) || []);

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

        const { count: patientCount } = await supabase
          .from('service_plans')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .eq('status', 'active');

        const { count: activeVisits } = await supabase
          .from('visits')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .gte('scheduled_date', monthStart)
          .lte('scheduled_date', monthEnd)
          .in('status', ['scheduled', 'en_route', 'checked_in', 'in_progress']);

        const { count: completedVisits } = await supabase
          .from('visits')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .gte('scheduled_date', monthStart)
          .lte('scheduled_date', monthEnd)
          .eq('status', 'completed');

        setServiceStats({
          totalPatients: patientCount ?? 0,
          activeVisitsThisMonth: activeVisits ?? 0,
          completedVisitsThisMonth: completedVisits ?? 0,
        });
      } catch (err) {
        console.error('기관 상세 조회 실패:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchOrgDetail();
  }, [orgId]);

  async function handleApprove(id: string) {
    setActionLoading(true);
    try {
      const supabase = createBrowserSupabaseClient();
      await supabase
        .from('organizations')
        .update({ verification_status: 'verified', verified_at: new Date().toISOString() } as never)
        .eq('id', id);
      setOrg((prev) => prev ? { ...prev, verification_status: 'verified' } : prev);
    } catch (err) {
      console.error('승인 실패:', err);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject(id: string, reason: string) {
    setActionLoading(true);
    try {
      const supabase = createBrowserSupabaseClient();
      await supabase
        .from('organizations')
        .update({ verification_status: 'rejected' } as never)
        .eq('id', id);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'org_rejected',
          resource_type: 'organization',
          resource_id: id,
          details: { reason, previous_status: org?.verification_status },
        } as never);
      }

      setOrg((prev) => prev ? { ...prev, verification_status: 'rejected' } : prev);
    } catch (err) {
      console.error('거절 실패:', err);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSuspend(id: string, reason: string) {
    setActionLoading(true);
    try {
      const supabase = createBrowserSupabaseClient();
      await supabase
        .from('organizations')
        .update({ verification_status: 'suspended' } as never)
        .eq('id', id);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'org_suspended',
          resource_type: 'organization',
          resource_id: id,
          details: { reason, previous_status: org?.verification_status },
        } as never);
      }

      setOrg((prev) => prev ? { ...prev, verification_status: 'suspended' } : prev);
    } catch (err) {
      console.error('정지 실패:', err);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading || !org) {
    return (
      <div>
        <div className="p-8 flex items-center justify-center py-24">
          <div className="w-8 h-8 border-[3px] border-primary-100 border-t-secondary-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const staffTypeLabels: Record<string, string> = {
    nurse: '간호사',
    doctor: '의사',
    physio: '물리치료사',
    caregiver: '요양보호사',
  };

  return (
    <div>
      <div className="p-8 space-y-8">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/organizations')}>
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          목록으로
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <OrgReviewPanel
              organization={org}
              onApprove={handleApprove}
              onReject={handleReject}
              onSuspend={handleSuspend}
              loading={actionLoading}
            />
          </div>

          <div className="space-y-6">
            <Card>
              <h3 className="text-[15px] font-bold text-primary-900 mb-5">서비스 현황</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-secondary-50/60 rounded-xl">
                  <div className="flex items-center gap-2.5">
                    <Users className="w-5 h-5 text-secondary-600" />
                    <span className="text-sm text-primary-600">총 환자 수</span>
                  </div>
                  <span className="text-lg font-bold text-secondary-700">
                    {serviceStats.totalPatients}명
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-success-50/60 rounded-xl">
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-5 h-5 text-success-600" />
                    <span className="text-sm text-primary-600">이번 달 완료</span>
                  </div>
                  <span className="text-lg font-bold text-success-600">
                    {serviceStats.completedVisitsThisMonth}건
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-primary-50/60 rounded-xl">
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-5 h-5 text-primary-500" />
                    <span className="text-sm text-primary-600">서비스 반경</span>
                  </div>
                  <span className="text-lg font-bold text-primary-700">
                    {org.service_area_km}km
                  </span>
                </div>
              </div>
            </Card>

            <Card>
              <h3 className="text-[15px] font-bold text-primary-900 mb-4">구독 정보</h3>
              <div className="flex items-center gap-2 mb-3">
                <Badge
                  color={
                    org.subscription_plan === 'enterprise'
                      ? 'purple'
                      : org.subscription_plan === 'pro'
                        ? 'navy'
                        : org.subscription_plan === 'basic'
                          ? 'teal'
                          : 'gray'
                  }
                >
                  {org.subscription_plan.toUpperCase()}
                </Badge>
              </div>
              <p className="text-sm text-primary-500">
                평점: {org.rating_avg.toFixed(1)} / 5.0 ({org.review_count}개 리뷰)
              </p>
            </Card>
          </div>
        </div>

        <Card padding={false}>
          <div className="p-7 pb-0">
            <h3 className="text-[15px] font-bold text-primary-900 mb-6">소속 의료진</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-primary-50/50">
                  <th className="px-6 py-4 text-left text-[11px] font-semibold text-primary-400 uppercase tracking-wider">이름</th>
                  <th className="px-6 py-4 text-left text-[11px] font-semibold text-primary-400 uppercase tracking-wider">직종</th>
                  <th className="px-6 py-4 text-left text-[11px] font-semibold text-primary-400 uppercase tracking-wider">면허번호</th>
                  <th className="px-6 py-4 text-left text-[11px] font-semibold text-primary-400 uppercase tracking-wider">전문분야</th>
                  <th className="px-6 py-4 text-left text-[11px] font-semibold text-primary-400 uppercase tracking-wider">담당 환자</th>
                  <th className="px-6 py-4 text-left text-[11px] font-semibold text-primary-400 uppercase tracking-wider">상태</th>
                </tr>
              </thead>
              <tbody>
                {staff.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-primary-300">
                      등록된 의료진이 없습니다.
                    </td>
                  </tr>
                ) : (
                  staff.map((member, idx) => (
                    <tr key={member.id} className={`transition-all duration-150 hover:bg-secondary-50/40 ${idx % 2 === 1 ? 'bg-primary-50/30' : ''}`}>
                      <td className="px-6 py-4 text-sm font-semibold text-primary-800">
                        {member.user?.full_name || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-primary-500">
                        {staffTypeLabels[member.staff_type] || member.staff_type}
                      </td>
                      <td className="px-6 py-4 text-sm text-primary-500">
                        {member.license_number || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {member.specialties.map((spec) => (
                            <Badge key={spec} color="teal">{spec}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-primary-500">
                        {member.current_patient_count} / {member.max_patients}
                      </td>
                      <td className="px-6 py-4">
                        <Badge color={member.is_active ? 'green' : 'gray'}>
                          {member.is_active ? '활동중' : '비활성'}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
