'use client';

import { Badge, getStatusBadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  User,
  Clock,
  AlertTriangle,
  MapPin,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import type { Tables } from '@homecare/shared-types';

const statusLabels: Record<string, string> = {
  matching: '매칭중',
  waiting_selection: '선택 대기',
  sent_to_org: '수신',
  org_accepted: '수락됨',
  org_rejected: '거절됨',
  assessment_scheduled: '방문평가 예정',
  service_started: '서비스 시작',
  cancelled: '취소',
  expired: '만료',
};

interface RequestCardProps {
  request: Tables<'service_requests'> & {
    patients?: { full_name: string; address: string } | null;
  };
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
}

export function RequestCard({ request, onAccept, onReject }: RequestCardProps) {
  const isPending = request.status === 'sent_to_org';
  const patientName = request.patients?.full_name || '환자';
  const initial = patientName.charAt(0);

  return (
    <div className="rounded-2xl bg-white p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-secondary to-secondary/70 text-sm font-bold text-white">
            {initial}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-on-surface">
              {patientName}
            </h4>
            <div className="mt-0.5 flex items-center gap-1 text-xs text-on-surface-variant">
              <MapPin className="h-3 w-3" />
              {request.patients?.address || '-'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {request.urgency === 'urgent' && (
            <Badge variant="danger">
              <AlertTriangle className="mr-1 h-3 w-3" />
              긴급
            </Badge>
          )}
          <Badge variant={getStatusBadgeVariant(request.status)}>
            {statusLabels[request.status] || request.status}
          </Badge>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <div>
          <p className="text-xs font-medium text-on-surface-variant">요청 서비스</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {request.requested_services.map((s) => (
              <span key={s} className="vitality-chip">
                {s}
              </span>
            ))}
          </div>
        </div>

        {request.preferred_time && (
          <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
            <Clock className="h-3 w-3" />
            희망시간: {request.preferred_time}
          </div>
        )}

        {request.notes && (
          <p className="text-xs text-on-surface-variant">메모: {request.notes}</p>
        )}

        <div className="flex items-center gap-1.5 text-xs text-on-surface-variant/60">
          <Clock className="h-3 w-3" />
          {new Date(request.created_at).toLocaleString('ko-KR')}
          {request.expires_at && (
            <span className="text-error">
              {' '}
              | 만료: {new Date(request.expires_at).toLocaleDateString('ko-KR')}
            </span>
          )}
        </div>
      </div>

      {isPending && (onAccept || onReject) && (
        <div className="mt-5 flex gap-3 pt-5">
          {onAccept && (
            <Button
              variant="gradient"
              size="sm"
              onClick={() => onAccept(request.id)}
            >
              <CheckCircle className="h-4 w-4" />
              수락
            </Button>
          )}
          {onReject && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReject(request.id)}
            >
              <XCircle className="h-4 w-4" />
              거절
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
