'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import { formatOrgType, formatDate } from '@homecare/shared-utils';
import { CheckCircle2 } from 'lucide-react';
import type { OrgReviewData as Organization } from '@homecare/shared-types';

interface OrgReviewPanelProps {
  organization: Organization;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onSuspend: (id: string, reason: string) => void;
  loading?: boolean;
}

export default function OrgReviewPanel({
  organization,
  onApprove,
  onReject,
  onSuspend,
  loading = false,
}: OrgReviewPanelProps) {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showSuspendForm, setShowSuspendForm] = useState(false);
  const [checkedItems, setCheckedItems] = useState<boolean[]>(new Array(5).fill(false));

  const isPending = organization.verification_status === 'pending';
  const isVerified = organization.verification_status === 'verified';

  const checklistItems = [
    '사업자등록증 확인',
    '의료기관 개설 허가증 확인',
    '대표자 신분증 확인',
    '서비스 제공 인력 자격 확인',
    '배상책임보험 가입 확인',
  ];

  return (
    <Card>
      <h3 className="text-lg font-bold text-primary-900 mb-6">기관 심사</h3>

      {/* Basic Info */}
      <div className="space-y-3 mb-8">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-[11px] font-medium text-primary-300 uppercase tracking-wider mb-1">기관명</p>
            <p className="text-sm font-semibold text-primary-800">{organization.name}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-primary-300 uppercase tracking-wider mb-1">기관 유형</p>
            <p className="text-sm text-primary-600">{formatOrgType(organization.org_type)}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-primary-300 uppercase tracking-wider mb-1">사업자등록번호</p>
            <p className="text-sm text-primary-600">{organization.business_number}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-primary-300 uppercase tracking-wider mb-1">의료기관 허가번호</p>
            <p className="text-sm text-primary-600">
              {organization.license_number || '-'}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-primary-300 uppercase tracking-wider mb-1">연락처</p>
            <p className="text-sm text-primary-600">{organization.phone}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-primary-300 uppercase tracking-wider mb-1">이메일</p>
            <p className="text-sm text-primary-600">{organization.email || '-'}</p>
          </div>
          <div className="col-span-2">
            <p className="text-[11px] font-medium text-primary-300 uppercase tracking-wider mb-1">주소</p>
            <p className="text-sm text-primary-600">{organization.address}</p>
          </div>
          <div className="col-span-2">
            <p className="text-[11px] font-medium text-primary-300 uppercase tracking-wider mb-1">제공 서비스</p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {organization.services.map((service) => (
                <Badge key={service} color="teal">
                  {service}
                </Badge>
              ))}
            </div>
          </div>
          {organization.description && (
            <div className="col-span-2">
              <p className="text-[11px] font-medium text-primary-300 uppercase tracking-wider mb-1">소개</p>
              <p className="text-sm text-primary-600">{organization.description}</p>
            </div>
          )}
          <div>
            <p className="text-[11px] font-medium text-primary-300 uppercase tracking-wider mb-1">등록일</p>
            <p className="text-sm text-primary-600">{formatDate(organization.created_at)}</p>
          </div>
        </div>
      </div>

      {/* Document Checklist */}
      <div className="mb-8 p-6 bg-primary-50/50 rounded-2xl">
        <h4 className="text-[13px] font-bold text-primary-700 mb-4">서류 확인 체크리스트</h4>
        <div className="space-y-3">
          {checklistItems.map((item, idx) => (
            <label key={item} className="flex items-center gap-3 text-sm text-primary-600 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={checkedItems[idx]}
                  onChange={(e) => {
                    const updated = [...checkedItems];
                    updated[idx] = e.target.checked;
                    setCheckedItems(updated);
                  }}
                  className="w-5 h-5 rounded-lg bg-white text-secondary-600 focus:ring-secondary-500/30 transition-all"
                />
              </div>
              <span className="group-hover:text-primary-800 transition-colors">{item}</span>
              {checkedItems[idx] && <CheckCircle2 className="w-4 h-4 text-secondary-500 ml-auto" />}
            </label>
          ))}
        </div>
      </div>

      {/* Reject Form */}
      {showRejectForm && (
        <div className="mb-6 p-6 bg-danger-50 rounded-2xl">
          <label className="block text-[13px] font-semibold text-danger-600 mb-2">
            거절 사유
          </label>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="거절 사유를 입력하세요..."
            rows={3}
            className="w-full rounded-xl bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-danger-500/30 transition-all"
          />
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              variant="danger"
              loading={loading}
              onClick={() => {
                onReject(organization.id, rejectReason);
                setShowRejectForm(false);
                setRejectReason('');
              }}
              disabled={!rejectReason.trim()}
            >
              거절 확인
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowRejectForm(false);
                setRejectReason('');
              }}
            >
              취소
            </Button>
          </div>
        </div>
      )}

      {/* Suspend Form */}
      {showSuspendForm && (
        <div className="mb-6 p-6 bg-tertiary-50 rounded-2xl">
          <label className="block text-[13px] font-semibold text-tertiary-600 mb-2">
            정지 사유
          </label>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="정지 사유를 입력하세요..."
            rows={3}
            className="w-full rounded-xl bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-tertiary-500/30 transition-all"
          />
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              variant="danger"
              loading={loading}
              onClick={() => {
                onSuspend(organization.id, rejectReason);
                setShowSuspendForm(false);
                setRejectReason('');
              }}
              disabled={!rejectReason.trim()}
            >
              정지 확인
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowSuspendForm(false);
                setRejectReason('');
              }}
            >
              취소
            </Button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        {isPending && (
          <>
            <Button
              variant="primary"
              loading={loading}
              onClick={() => onApprove(organization.id)}
            >
              승인
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowRejectForm(true)}
            >
              거절
            </Button>
          </>
        )}
        {isVerified && (
          <Button
            variant="danger"
            onClick={() => setShowSuspendForm(true)}
          >
            기관 정지
          </Button>
        )}
      </div>
    </Card>
  );
}
