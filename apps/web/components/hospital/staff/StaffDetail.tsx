'use client';

import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { User, Phone, Briefcase, Users, Calendar } from 'lucide-react';
import type { StaffRow } from './StaffTable';

const staffTypeLabels: Record<string, string> = {
  nurse: '간호사',
  doctor: '의사',
  physio: '물리치료사',
  caregiver: '요양보호사',
};

interface StaffDetailProps {
  staff: StaffRow;
}

export function StaffDetail({ staff }: StaffDetailProps) {
  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>직원 정보</CardTitle>
          {staff.is_active ? (
            <Badge variant="success">활성</Badge>
          ) : (
            <Badge variant="default">비활성</Badge>
          )}
        </CardHeader>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-container-low">
              <User className="h-4 w-4 text-on-surface-variant" />
            </div>
            <div>
              <p className="text-xs text-on-surface-variant">이름</p>
              <p className="mt-0.5 text-sm font-medium text-on-surface">
                {staff.full_name}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-container-low">
              <Briefcase className="h-4 w-4 text-on-surface-variant" />
            </div>
            <div>
              <p className="text-xs text-on-surface-variant">직종</p>
              <p className="mt-0.5 text-sm font-medium text-on-surface">
                {staffTypeLabels[staff.staff_type] || staff.staff_type}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-container-low">
              <Phone className="h-4 w-4 text-on-surface-variant" />
            </div>
            <div>
              <p className="text-xs text-on-surface-variant">연락처</p>
              <p className="mt-0.5 text-sm font-medium text-on-surface">
                {staff.phone}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-container-low">
              <Users className="h-4 w-4 text-on-surface-variant" />
            </div>
            <div>
              <p className="text-xs text-on-surface-variant">담당 환자</p>
              <p className="mt-0.5 text-sm font-medium text-on-surface">
                {staff.current_patient_count} / {staff.max_patients}명
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-container-low">
              <Calendar className="h-4 w-4 text-on-surface-variant" />
            </div>
            <div>
              <p className="text-xs text-on-surface-variant">오늘 방문</p>
              <p className="mt-0.5 text-sm font-medium text-on-surface">
                {staff.today_visits}건
              </p>
            </div>
          </div>
        </div>

        {staff.specialties.length > 0 && (
          <div className="mt-6">
            <p className="mb-2.5 text-sm font-medium text-on-surface">
              전문분야
            </p>
            <div className="flex flex-wrap gap-2">
              {staff.specialties.map((s) => (
                <Badge key={s} variant="success">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
