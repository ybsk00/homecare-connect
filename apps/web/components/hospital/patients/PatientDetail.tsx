'use client';

import { Badge, getStatusBadgeVariant } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { User, MapPin, Phone, Heart, FileText, Activity } from 'lucide-react';
import type { Tables } from '@homecare/shared-types';

const statusLabels: Record<string, string> = {
  active: '활성',
  paused: '일시중지',
  discharged: '퇴원',
};

const careGradeLabels: Record<string, string> = {
  '1': '1등급',
  '2': '2등급',
  '3': '3등급',
  '4': '4등급',
  '5': '5등급',
  cognitive: '인지지원',
};

const mobilityLabels: Record<string, string> = {
  bedridden: '와상',
  wheelchair: '휠체어',
  walker: '보행기',
  independent: '독립보행',
};

interface PatientDetailProps {
  patient: Tables<'patients'>;
  servicePlan?: Tables<'service_plans'> | null;
}

export function PatientDetail({ patient, servicePlan }: PatientDetailProps) {
  return (
    <div className="space-y-8">
      {/* Basic info */}
      <Card>
        <CardHeader>
          <CardTitle>환자 정보</CardTitle>
          <Badge variant={getStatusBadgeVariant(patient.status)}>
            {statusLabels[patient.status]}
          </Badge>
        </CardHeader>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          <InfoRow icon={User} label="이름" value={patient.full_name} />
          <InfoRow
            icon={User}
            label="생년월일"
            value={`${patient.birth_date} (${patient.gender === 'male' ? '남' : '여'})`}
          />
          <InfoRow icon={Phone} label="연락처" value={patient.phone || '-'} />
          <InfoRow
            icon={MapPin}
            label="주소"
            value={`${patient.address} ${patient.address_detail || ''}`}
          />
          <InfoRow
            icon={Heart}
            label="요양등급"
            value={
              patient.care_grade
                ? careGradeLabels[patient.care_grade]
                : '미설정'
            }
          />
          <InfoRow
            icon={Activity}
            label="이동능력"
            value={
              patient.mobility
                ? mobilityLabels[patient.mobility]
                : '미설정'
            }
          />
          <InfoRow
            icon={FileText}
            label="주 진단명"
            value={patient.primary_diagnosis || '-'}
          />
        </div>

        {patient.needed_services.length > 0 && (
          <div className="mt-6">
            <p className="mb-2.5 text-sm font-medium text-on-surface">
              필요 서비스
            </p>
            <div className="flex flex-wrap gap-2">
              {patient.needed_services.map((s) => (
                <Badge key={s} variant="success">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {patient.special_notes && (
          <div className="mt-6 rounded-xl bg-tertiary-container/30 p-4">
            <p className="text-xs font-semibold text-tertiary">특이사항</p>
            <p className="mt-1.5 text-sm text-on-surface">
              {patient.special_notes}
            </p>
          </div>
        )}
      </Card>

      {/* Active service plan */}
      {servicePlan && (
        <Card>
          <CardHeader>
            <CardTitle>서비스 계획서</CardTitle>
            <Badge variant={getStatusBadgeVariant(servicePlan.status)}>
              {servicePlan.status === 'active' ? '활성' : servicePlan.status}
            </Badge>
          </CardHeader>
          <div className="grid grid-cols-2 gap-5">
            <div>
              <p className="text-xs text-on-surface-variant">방문 빈도</p>
              <p className="mt-1 text-sm font-medium text-on-surface">
                {servicePlan.visit_frequency}
              </p>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant">시작일</p>
              <p className="mt-1 text-sm font-medium text-on-surface">
                {servicePlan.start_date || '-'}
              </p>
            </div>
            {servicePlan.goals && (
              <div className="col-span-2">
                <p className="text-xs text-on-surface-variant">목표</p>
                <p className="mt-1 text-sm text-on-surface">{servicePlan.goals}</p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-surface-container-low">
        <Icon className="h-4 w-4 text-on-surface-variant" />
      </div>
      <div>
        <p className="text-xs text-on-surface-variant">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-on-surface">{value}</p>
      </div>
    </div>
  );
}
