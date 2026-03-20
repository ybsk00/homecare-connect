'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { RequestCard } from '@/components/hospital/requests/RequestCard';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Loading } from '@/components/ui/Loading';
import { clsx } from 'clsx';
import type { Tables } from '@homecare/shared-types';

type TabKey = 'pending' | 'accepted' | 'rejected' | 'expired';

const tabs: { key: TabKey; label: string; statuses: string[] }[] = [
  { key: 'pending', label: '신규', statuses: ['sent_to_org'] },
  {
    key: 'accepted',
    label: '수락',
    statuses: ['org_accepted', 'assessment_scheduled', 'service_started'],
  },
  { key: 'rejected', label: '거절', statuses: ['org_rejected'] },
  { key: 'expired', label: '만료', statuses: ['expired', 'cancelled'] },
];

export default function RequestsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const [acceptModalOpen, setAcceptModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [assignNurseId, setAssignNurseId] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const currentTab = tabs.find((t) => t.key === activeTab)!;

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['requests', activeTab],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase
        .from('service_requests')
        .select('*, patients(full_name, address)')
        .in('status', currentTab.statuses as any)
        .order('created_at', { ascending: false });

      return (data || []) as (Tables<'service_requests'> & {
        patients: { full_name: string; address: string } | null;
      })[];
    },
  });

  const { data: nurses = [] } = useQuery({
    queryKey: ['available-nurses'],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase
        .from('staff')
        .select('id, profiles!inner(full_name)')
        .eq('is_active', true)
        .eq('staff_type', 'nurse');

      return (data || []).map((s: Record<string, unknown>) => ({
        value: s.id as string,
        label: (s.profiles as { full_name: string })?.full_name || '-',
      }));
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async ({
      requestId,
      nurseId,
    }: {
      requestId: string;
      nurseId: string;
    }) => {
      const supabase = createBrowserSupabaseClient();
      await supabase
        .from('service_requests')
        .update({
          status: 'org_accepted',
          assigned_nurse_id: nurseId,
          responded_at: new Date().toISOString(),
        } as never)
        .eq('id', requestId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      setAcceptModalOpen(false);
      setSelectedRequestId(null);
      setAssignNurseId('');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({
      requestId,
    }: {
      requestId: string;
      reason: string;
    }) => {
      const supabase = createBrowserSupabaseClient();
      await supabase
        .from('service_requests')
        .update({
          status: 'org_rejected',
          responded_at: new Date().toISOString(),
        } as never)
        .eq('id', requestId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      setRejectModalOpen(false);
      setSelectedRequestId(null);
      setRejectReason('');
    },
  });

  const handleAcceptClick = (id: string) => {
    setSelectedRequestId(id);
    setAcceptModalOpen(true);
  };

  const handleRejectClick = (id: string) => {
    setSelectedRequestId(id);
    setRejectModalOpen(true);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-on-surface">서비스 요청 관리</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          보호자로부터 수신된 서비스 요청을 관리합니다.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 rounded-2xl bg-surface-container-low p-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={clsx(
              'flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all',
              activeTab === tab.key
                ? 'bg-white text-on-surface shadow-[0_2px_8px_rgba(24,28,30,0.06)]'
                : 'text-on-surface-variant hover:text-on-surface'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Loading />
      ) : requests.length === 0 ? (
        <div className="py-14 text-center text-sm text-on-surface-variant">
          해당하는 서비스 요청이 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {requests.map((req) => (
            <RequestCard
              key={req.id}
              request={req}
              onAccept={
                activeTab === 'pending' ? handleAcceptClick : undefined
              }
              onReject={
                activeTab === 'pending' ? handleRejectClick : undefined
              }
            />
          ))}
        </div>
      )}

      {/* Accept Modal */}
      <Modal
        open={acceptModalOpen}
        onClose={() => setAcceptModalOpen(false)}
        title="서비스 요청 수락"
      >
        <div className="space-y-5">
          <p className="text-sm text-on-surface-variant">
            이 요청을 수락하고 담당 간호사를 배정하세요.
          </p>
          <Select
            label="담당 간호사"
            options={nurses}
            value={assignNurseId}
            onChange={(e) => setAssignNurseId(e.target.value)}
            placeholder="간호사를 선택하세요"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setAcceptModalOpen(false)}
            >
              취소
            </Button>
            <Button
              onClick={() =>
                selectedRequestId &&
                acceptMutation.mutate({
                  requestId: selectedRequestId,
                  nurseId: assignNurseId,
                })
              }
              loading={acceptMutation.isPending}
              disabled={!assignNurseId}
            >
              수락 및 배정
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal
        open={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="서비스 요청 거절"
      >
        <div className="space-y-5">
          <p className="text-sm text-on-surface-variant">
            거절 사유를 입력하세요.
          </p>
          <Input
            label="거절 사유"
            placeholder="인력 부족, 서비스 지역 외 등"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setRejectModalOpen(false)}
            >
              취소
            </Button>
            <Button
              variant="danger"
              onClick={() =>
                selectedRequestId &&
                rejectMutation.mutate({
                  requestId: selectedRequestId,
                  reason: rejectReason,
                })
              }
              loading={rejectMutation.isPending}
            >
              거절
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
