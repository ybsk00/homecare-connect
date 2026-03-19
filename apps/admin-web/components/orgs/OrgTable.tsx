'use client';

import { useRouter } from 'next/navigation';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { formatDate, formatOrgType } from '@homecare/shared-utils';
import type { BadgeColor, OrganizationView as Organization } from '@homecare/shared-types';

interface OrgTableProps {
  organizations: Organization[];
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onSuspend?: (id: string) => void;
  showActions?: boolean;
}

const statusConfig: Record<string, { label: string; color: BadgeColor }> = {
  pending: { label: '심사대기', color: 'yellow' },
  verified: { label: '승인', color: 'green' },
  rejected: { label: '거절', color: 'red' },
  suspended: { label: '정지', color: 'brown' },
};

const planConfig: Record<string, { label: string; color: BadgeColor }> = {
  free: { label: 'Free', color: 'gray' },
  basic: { label: 'Basic', color: 'teal' },
  pro: { label: 'Pro', color: 'navy' },
  enterprise: { label: 'Enterprise', color: 'purple' },
};

export default function OrgTable({
  organizations,
  onApprove,
  onReject,
  onSuspend,
  showActions = false,
}: OrgTableProps) {
  const router = useRouter();

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="bg-primary-50/50">
            <th className="px-6 py-4 text-left text-[11px] font-semibold text-primary-400 uppercase tracking-wider">
              기관명
            </th>
            <th className="px-6 py-4 text-left text-[11px] font-semibold text-primary-400 uppercase tracking-wider">
              사업자번호
            </th>
            <th className="px-6 py-4 text-left text-[11px] font-semibold text-primary-400 uppercase tracking-wider">
              유형
            </th>
            <th className="px-6 py-4 text-left text-[11px] font-semibold text-primary-400 uppercase tracking-wider">
              플랜
            </th>
            <th className="px-6 py-4 text-left text-[11px] font-semibold text-primary-400 uppercase tracking-wider">
              환자 수
            </th>
            <th className="px-6 py-4 text-left text-[11px] font-semibold text-primary-400 uppercase tracking-wider">
              등록일
            </th>
            <th className="px-6 py-4 text-left text-[11px] font-semibold text-primary-400 uppercase tracking-wider">
              상태
            </th>
            {showActions && (
              <th className="px-6 py-4 text-left text-[11px] font-semibold text-primary-400 uppercase tracking-wider">
                작업
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {organizations.length === 0 ? (
            <tr>
              <td
                colSpan={showActions ? 8 : 7}
                className="px-6 py-16 text-center text-sm text-primary-300"
              >
                등록된 기관이 없습니다.
              </td>
            </tr>
          ) : (
            organizations.map((org, idx) => {
              const status = statusConfig[org.verification_status] || {
                label: org.verification_status,
                color: 'gray' as BadgeColor,
              };
              const plan = planConfig[org.subscription_plan] || {
                label: org.subscription_plan,
                color: 'gray' as BadgeColor,
              };

              return (
                <tr
                  key={org.id}
                  className={`cursor-pointer transition-all duration-150 hover:bg-secondary-50/40 ${idx % 2 === 1 ? 'bg-primary-50/30' : ''}`}
                  onClick={() => router.push(`/organizations/${org.id}`)}
                >
                  <td className="px-6 py-4 text-sm font-semibold text-primary-800">
                    {org.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-primary-500">
                    {org.business_number}
                  </td>
                  <td className="px-6 py-4 text-sm text-primary-500">
                    {formatOrgType(org.org_type)}
                  </td>
                  <td className="px-6 py-4">
                    <Badge color={plan.color}>{plan.label}</Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-primary-500">
                    {org.active_patient_count}명
                  </td>
                  <td className="px-6 py-4 text-sm text-primary-500">
                    {formatDate(org.created_at)}
                  </td>
                  <td className="px-6 py-4">
                    <Badge color={status.color}>{status.label}</Badge>
                  </td>
                  {showActions && (
                    <td className="px-6 py-4">
                      <div
                        className="flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {org.verification_status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => onApprove?.(org.id)}
                            >
                              승인
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => onReject?.(org.id)}
                            >
                              거절
                            </Button>
                          </>
                        )}
                        {org.verification_status === 'verified' && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => onSuspend?.(org.id)}
                          >
                            정지
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
