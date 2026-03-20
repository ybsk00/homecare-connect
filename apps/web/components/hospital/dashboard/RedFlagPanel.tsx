'use client';

import { useQuery } from '@tanstack/react-query';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, AlertCircle, ShieldAlert, Eye, CheckCircle } from 'lucide-react';
import type { Tables } from '@homecare/shared-types';

const severityConfig = {
  red: {
    icon: ShieldAlert,
    chipClass: 'vitality-chip-critical',
    label: '긴급',
    variant: 'danger' as const,
  },
  orange: {
    icon: AlertTriangle,
    chipClass: 'vitality-chip-warning',
    label: '주의',
    variant: 'warning' as const,
  },
  yellow: {
    icon: AlertCircle,
    chipClass: 'vitality-chip',
    label: '관찰',
    variant: 'success' as const,
  },
};

export function RedFlagPanel() {
  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['red-flags-active'],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase
        .from('red_flag_alerts')
        .select('*, patients(full_name)')
        .in('status', ['active', 'acknowledged'])
        .order('created_at', { ascending: false })
        .limit(5);
      return (data || []) as (Tables<'red_flag_alerts'> & {
        patients: { full_name: string } | null;
      })[];
    },
  });

  return (
    <div className="overflow-hidden rounded-2xl">
      {/* Navy gradient header */}
      <div className="bg-gradient-to-r from-primary to-primary-container px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-secondary-container" />
            <h3 className="text-sm font-semibold text-white">
              실시간 주의환자 알림
            </h3>
          </div>
          {alerts.length > 0 && (
            <span className="rounded-full bg-error/20 px-3 py-0.5 text-xs font-bold text-error-container">
              {alerts.length}건 활성
            </span>
          )}
        </div>
      </div>

      {/* Alert body */}
      <div className="bg-white p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div
              className="h-6 w-6 animate-spin rounded-full bg-gradient-to-r from-primary to-secondary"
              style={{
                mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 0)',
                WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 0)',
              }}
            />
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-on-surface-variant">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10">
              <CheckCircle className="h-6 w-6 text-secondary" />
            </div>
            <p className="text-sm font-medium">활성 알림 없음</p>
            <p className="mt-1 text-xs text-on-surface-variant/70">모든 환자 상태가 안정적입니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => {
              const config = severityConfig[alert.severity];
              const Icon = config.icon;
              return (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 rounded-xl bg-surface-container-low p-4"
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-error/10">
                    <Icon className="h-4 w-4 text-error" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-on-surface">
                        {alert.title}
                      </span>
                      <span className={config.chipClass}>
                        {config.label}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-on-surface-variant">
                      {alert.patients?.full_name || '환자'} — {alert.description}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <p className="text-[11px] text-on-surface-variant/60">
                        {new Date(alert.created_at).toLocaleString('ko-KR')}
                      </p>
                      <Button variant="ghost" size="sm" className="ml-auto text-xs">
                        <Eye className="h-3.5 w-3.5" />
                        상세보기
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
