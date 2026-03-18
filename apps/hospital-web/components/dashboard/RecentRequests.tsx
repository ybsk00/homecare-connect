'use client';

import { useQuery } from '@tanstack/react-query';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge, getStatusBadgeVariant } from '@/components/ui/Badge';
import { FileText, Clock } from 'lucide-react';
import type { Tables } from '@homecare/shared-types';

const statusLabels: Record<string, string> = {
  matching: '매칭중',
  waiting_selection: '선택 대기',
  sent_to_org: '수신',
  org_accepted: '수락',
  org_rejected: '거절',
  assessment_scheduled: '방문평가 예정',
  service_started: '서비스 시작',
  cancelled: '취소',
  expired: '만료',
};

const avatarColors = [
  'from-secondary to-secondary/70',
  'from-primary to-primary-container',
  'from-tertiary to-tertiary/70',
  'from-error to-error/70',
];

export function RecentRequests() {
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['recent-requests'],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase
        .from('service_requests')
        .select('*, patients(full_name)')
        .order('created_at', { ascending: false })
        .limit(5);
      return (data || []) as (Tables<'service_requests'> & {
        patients: { full_name: string } | null;
      })[];
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>신규 서비스 요청</CardTitle>
        <FileText className="h-5 w-5 text-on-surface-variant" />
      </CardHeader>

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <div
            className="h-6 w-6 animate-spin rounded-full bg-gradient-to-r from-primary to-secondary"
            style={{
              mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 0)',
              WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 0)',
            }}
          />
        </div>
      ) : requests.length === 0 ? (
        <p className="py-10 text-center text-sm text-on-surface-variant">
          최근 서비스 요청이 없습니다.
        </p>
      ) : (
        <div className="space-y-2">
          {requests.map((req, idx) => {
            const name = req.patients?.full_name || '환자';
            const initial = name.charAt(0);
            return (
              <div
                key={req.id}
                className="flex items-center justify-between rounded-xl bg-surface-container-low/50 px-4 py-3 transition-colors hover:bg-surface-container-low"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${avatarColors[idx % avatarColors.length]} text-sm font-bold text-white`}
                  >
                    {initial}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-on-surface">
                      {name}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-on-surface-variant">
                      <span>{req.requested_services.join(', ')}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(req.created_at).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {req.urgency === 'urgent' && (
                    <Badge variant="danger">긴급</Badge>
                  )}
                  <Badge variant={getStatusBadgeVariant(req.status)}>
                    {statusLabels[req.status] || req.status}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
