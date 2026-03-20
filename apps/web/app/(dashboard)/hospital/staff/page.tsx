'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { useAppStore } from '@/lib/store';
import { StaffTable, type StaffRow } from '@/components/hospital/staff/StaffTable';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { UserPlus } from 'lucide-react';

const PAGE_SIZE = 15;

export default function StaffPage() {
  const [page, setPage] = useState(1);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteType, setInviteType] = useState('nurse');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const { organization } = useAppStore();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['staff', page],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const today = new Date().toISOString().split('T')[0];

      const { data: staffList, count } = await supabase
        .from('staff')
        .select('*, profiles!inner(full_name, phone)', { count: 'exact' })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (!staffList) return { staff: [], total: 0, totalPages: 1 };

      const staffRows: StaffRow[] = await Promise.all(
        staffList.map(async (s: Record<string, unknown>) => {
          const { count: todayVisitCount } = await supabase
            .from('visits')
            .select('*', { count: 'exact', head: true })
            .eq('nurse_id', s.id as string)
            .eq('scheduled_date', today);

          const profile = s.profiles as { full_name: string; phone: string } | null;

          return {
            id: s.id as string,
            user_id: s.user_id as string,
            staff_type: s.staff_type as string,
            full_name: profile?.full_name || '-',
            phone: profile?.phone || '-',
            specialties: (s.specialties as string[]) || [],
            current_patient_count: (s.current_patient_count as number) || 0,
            max_patients: (s.max_patients as number) || 0,
            is_active: (s.is_active as boolean) ?? true,
            today_visits: todayVisitCount || 0,
          };
        })
      );

      return {
        staff: staffRows,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / PAGE_SIZE),
      };
    },
  });

  const handleInvite = async () => {
    if (!inviteEmail || !organization) return;
    setInviteLoading(true);
    setInviteError('');
    try {
      const supabase = createBrowserSupabaseClient();

      const { data: authUserRaw } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('phone', inviteEmail)
        .maybeSingle();
      const authUser = authUserRaw as { id: string; role: string } | null;

      if (authUser) {
        const { data: existingStaff } = await supabase
          .from('staff')
          .select('id')
          .eq('user_id', authUser.id)
          .eq('org_id', organization.id)
          .maybeSingle();

        if (existingStaff) {
          setInviteError('이미 소속된 직원입니다.');
          return;
        }
      }

      if (authUser) {
        await supabase.from('staff').insert({
          user_id: authUser.id,
          org_id: organization.id,
          staff_type: inviteType as 'nurse' | 'doctor' | 'physio' | 'caregiver',
          is_active: true,
        } as never);

        await supabase.from('notifications').insert({
          user_id: authUser.id,
          type: 'staff_invite',
          title: '기관 소속 등록',
          body: `${organization.name}에 ${inviteType === 'nurse' ? '간호사' : inviteType === 'physio' ? '물리치료사' : '요양보호사'}로 등록되었습니다.`,
          data: { org_id: organization.id, staff_type: inviteType },
        } as never);
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('audit_logs').insert({
            user_id: user.id,
            action: 'staff_invite',
            resource_type: 'organization',
            resource_id: organization.id,
            details: { email: inviteEmail, staff_type: inviteType, status: 'pending' },
          } as never);
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['staff'] });
      setInviteOpen(false);
      setInviteEmail('');
    } catch (err) {
      console.error('초대 실패:', err);
      setInviteError('초대 처리 중 오류가 발생했습니다.');
    } finally {
      setInviteLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">간호사 관리</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            소속 의료진을 관리합니다. 총 {data?.total || 0}명
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4" />
          간호사 초대
        </Button>
      </div>

      <StaffTable
        staff={data?.staff || []}
        loading={isLoading}
        page={page}
        totalPages={data?.totalPages || 1}
        onPageChange={setPage}
      />

      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="간호사 초대"
      >
        <div className="space-y-5">
          <Input
            label="이메일"
            type="email"
            placeholder="nurse@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <Select
            label="직종"
            options={[
              { value: 'nurse', label: '간호사' },
              { value: 'physio', label: '물리치료사' },
              { value: 'caregiver', label: '요양보호사' },
            ]}
            value={inviteType}
            onChange={(e) => setInviteType(e.target.value)}
          />
          {inviteError && (
            <p className="text-sm text-red-600">{inviteError}</p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              취소
            </Button>
            <Button onClick={handleInvite} loading={inviteLoading}>
              초대 발송
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
