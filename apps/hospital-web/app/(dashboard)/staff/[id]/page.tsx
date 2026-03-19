'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { StaffDetail } from '@/components/staff/StaffDetail';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge, getStatusBadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import { ArrowLeft, Clock, User } from 'lucide-react';
import type { StaffRow } from '@/components/staff/StaffTable';
import type { Tables } from '@homecare/shared-types';

export default function StaffDetailPage() {
  const params = useParams();
  const router = useRouter();
  const staffId = params.id as string;

  const { data: staff, isLoading } = useQuery({
    queryKey: ['staff-detail', staffId],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const today = new Date().toISOString().split('T')[0];

      const { data } = await supabase
        .from('staff')
        .select('*, profiles!inner(full_name, phone)')
        .eq('id', staffId)
        .single();

      if (!data) return null;

      const staffData = data as Tables<'staff'> & { profiles: { full_name: string; phone: string } | null };

      const { count: todayVisitCount } = await supabase
        .from('visits')
        .select('*', { count: 'exact', head: true })
        .eq('nurse_id', staffId)
        .eq('scheduled_date', today);

      return {
        id: staffData.id,
        user_id: staffData.user_id,
        staff_type: staffData.staff_type,
        full_name: staffData.profiles?.full_name || '-',
        phone: staffData.profiles?.phone || '-',
        specialties: staffData.specialties || [],
        current_patient_count: staffData.current_patient_count || 0,
        max_patients: staffData.max_patients || 0,
        is_active: staffData.is_active ?? true,
        today_visits: todayVisitCount || 0,
      } as StaffRow;
    },
  });

  const { data: recentVisits = [] } = useQuery({
    queryKey: ['staff-visits', staffId],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase
        .from('visits')
        .select('*, patients(full_name)')
        .eq('nurse_id', staffId)
        .order('scheduled_date', { ascending: false })
        .limit(10);
      return (data || []) as (Tables<'visits'> & {
        patients: { full_name: string } | null;
      })[];
    },
  });

  const visitStatusLabels: Record<string, string> = {
    scheduled: '예정',
    en_route: '이동중',
    checked_in: '도착',
    in_progress: '진행중',
    completed: '완료',
    cancelled: '취소',
    no_show: '미방문',
  };

  if (isLoading) return <Loading />;
  if (!staff) {
    return (
      <div className="py-14 text-center text-on-surface-variant">
        직원을 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          뒤로
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-on-surface">
          {staff.full_name}
        </h1>
      </div>

      <StaffDetail staff={staff} />

      <Card>
        <CardHeader>
          <CardTitle>최근 방문 기록</CardTitle>
        </CardHeader>
        {recentVisits.length === 0 ? (
          <p className="py-8 text-center text-sm text-on-surface-variant">
            방문 기록이 없습니다.
          </p>
        ) : (
          <div className="space-y-2">
            {recentVisits.map((visit, idx) => (
              <div
                key={visit.id}
                className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                  idx % 2 === 0 ? 'bg-surface-container-low/50' : 'bg-white'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="text-sm text-on-surface-variant">
                    <Clock className="mb-0.5 mr-1 inline h-3.5 w-3.5" />
                    {visit.scheduled_date}
                    {visit.scheduled_time && ` ${visit.scheduled_time.slice(0, 5)}`}
                  </div>
                  <div className="text-sm text-on-surface">
                    <User className="mb-0.5 mr-1 inline h-3.5 w-3.5 text-on-surface-variant" />
                    {visit.patients?.full_name || '-'}
                  </div>
                </div>
                <Badge variant={getStatusBadgeVariant(visit.status)}>
                  {visitStatusLabels[visit.status] || visit.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
