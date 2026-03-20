'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { useAppStore } from '@/lib/store';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import { Modal } from '@/components/ui/Modal';
import {
  AlertTriangle,
  AlertCircle,
  AlertOctagon,
  CheckCircle2,
  Eye,
  MessageSquare,
  User,
  Clock,
} from 'lucide-react';
import { clsx } from 'clsx';

type AlertSeverity = 'red' | 'orange' | 'yellow';

const severityConfig: Record<AlertSeverity, {
  label: string;
  icon: typeof AlertOctagon;
  iconBg: string;
  cardBg: string;
  text: string;
  badgeVariant: 'danger' | 'warning' | 'orange';
}> = {
  red: {
    label: '심각',
    icon: AlertOctagon,
    iconBg: 'bg-error/10',
    cardBg: 'bg-error/5',
    text: 'text-error',
    badgeVariant: 'danger',
  },
  orange: {
    label: '주의',
    icon: AlertTriangle,
    iconBg: 'bg-tertiary/10',
    cardBg: 'bg-tertiary/5',
    text: 'text-tertiary',
    badgeVariant: 'orange',
  },
  yellow: {
    label: '관찰',
    icon: AlertCircle,
    iconBg: 'bg-tertiary-container/60',
    cardBg: 'bg-tertiary/[0.03]',
    text: 'text-tertiary',
    badgeVariant: 'warning',
  },
};

const severityOrder: Record<string, number> = {
  red: 0,
  orange: 1,
  yellow: 2,
};

export default function AlertsPage() {
  const { staffInfo } = useAppStore();
  const queryClient = useQueryClient();
  const [resolveModal, setResolveModal] = useState<string | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['nurse-all-alerts', staffInfo?.id],
    queryFn: async () => {
      if (!staffInfo?.id) return [];
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase
        .from('red_flag_alerts')
        .select(`
          id,
          title,
          description,
          severity,
          status,
          ai_analysis,
          created_at,
          acknowledged_at,
          resolved_at,
          resolution_note,
          patient:patients(id, full_name)
        `)
        .eq('nurse_id', staffInfo.id)
        .in('status', ['active', 'acknowledged'])
        .order('created_at', { ascending: false });

      return (data ?? []) as Array<{
        id: string;
        title: string;
        description: string | null;
        severity: string;
        status: string;
        ai_analysis: string | null;
        created_at: string;
        acknowledged_at: string | null;
        resolved_at: string | null;
        resolution_note: string | null;
        patient: { id: string; full_name: string };
      }>;
    },
    enabled: !!staffInfo?.id,
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase
        .from('red_flag_alerts')
        .update({
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString(),
        } as never)
        .eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurse-all-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['red-flag-count'] });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ alertId, notes }: { alertId: string; notes: string }) => {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase
        .from('red_flag_alerts')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolution_note: notes,
        } as never)
        .eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      setResolveModal(null);
      setResolveNotes('');
      queryClient.invalidateQueries({ queryKey: ['nurse-all-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['red-flag-count'] });
    },
  });

  const sortedAlerts = [...alerts].sort(
    (a, b) => (severityOrder[a.severity] ?? 99) - (severityOrder[b.severity] ?? 99)
  );

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-on-surface">레드플래그</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          주의가 필요한 환자 알림 {alerts.length}건
        </p>
      </div>

      {sortedAlerts.length === 0 ? (
        <Card className="ambient-shadow">
          <div className="py-14 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10">
              <CheckCircle2 className="h-8 w-8 text-secondary/60" />
            </div>
            <p className="mt-5 text-sm font-medium text-on-surface-variant">
              현재 활성 레드플래그 알림이 없습니다.
            </p>
            <p className="mt-1 text-xs text-on-surface-variant/60">
              새로운 알림이 발생하면 여기에 표시됩니다.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedAlerts.map((alert) => {
            const severity = severityConfig[alert.severity as AlertSeverity] ?? severityConfig.yellow;
            const SeverityIcon = severity.icon;
            const timeAgo = getTimeAgo(alert.created_at);

            return (
              <Card key={alert.id} elevated className={clsx('rounded-2xl', severity.cardBg)}>
                <div className="flex items-start gap-4">
                  {/* Severity icon */}
                  <div className={clsx('flex h-11 w-11 shrink-0 items-center justify-center rounded-full', severity.iconBg)}>
                    <SeverityIcon className={clsx('h-5 w-5', severity.text)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={severity.badgeVariant}>{severity.label}</Badge>
                      <h3 className="font-semibold text-on-surface">{alert.title}</h3>
                      {alert.status === 'acknowledged' && (
                        <Badge variant="primary">확인됨</Badge>
                      )}
                    </div>

                    {alert.description && (
                      <p className="mt-2 text-sm text-on-surface-variant">{alert.description}</p>
                    )}

                    <div className="mt-2 flex items-center gap-3 text-xs text-on-surface-variant/70">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {alert.patient.full_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {timeAgo}
                      </span>
                    </div>

                    {/* AI Analysis */}
                    {alert.ai_analysis && (
                      <div className="mt-3 rounded-xl bg-surface-container-low p-3">
                        <p className="text-xs font-semibold text-on-surface-variant">AI 분석</p>
                        <p className="mt-1 text-xs text-on-surface-variant leading-relaxed">
                          {alert.ai_analysis}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="mt-4 flex items-center gap-2">
                      {alert.status === 'active' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={acknowledgeMutation.isPending}
                          onClick={() => acknowledgeMutation.mutate(alert.id)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          확인
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setResolveModal(alert.id);
                          setResolveNotes('');
                        }}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        해결
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Resolve modal */}
      <Modal
        open={resolveModal !== null}
        onClose={() => setResolveModal(null)}
        title="알림 해결"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-on-surface">
              해결 메모
            </label>
            <textarea
              value={resolveNotes}
              onChange={(e) => setResolveNotes(e.target.value)}
              placeholder="조치 내용을 입력하세요..."
              rows={4}
              className="block w-full rounded-xl bg-surface-container-highest px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setResolveModal(null)}>
              취소
            </Button>
            <Button
              loading={resolveMutation.isPending}
              onClick={() => {
                if (resolveModal) {
                  resolveMutation.mutate({
                    alertId: resolveModal,
                    notes: resolveNotes,
                  });
                }
              }}
            >
              해결 완료
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}
