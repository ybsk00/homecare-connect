'use client';

import { useRouter } from 'next/navigation';
import { Table, type Column } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import type { StaffRow } from '@homecare/shared-types';

export type { StaffRow };

const staffTypeLabels: Record<string, string> = {
  nurse: '간호사',
  doctor: '의사',
  physio: '물리치료사',
  caregiver: '요양보호사',
};

interface StaffTableProps {
  staff: StaffRow[];
  loading?: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function StaffTable({
  staff,
  loading,
  page,
  totalPages,
  onPageChange,
}: StaffTableProps) {
  const router = useRouter();

  const columns: Column<StaffRow>[] = [
    {
      key: 'full_name',
      header: '이름',
      render: (row) => (
        <span className="font-medium text-on-surface">{row.full_name}</span>
      ),
    },
    {
      key: 'staff_type',
      header: '직종',
      render: (row) => staffTypeLabels[row.staff_type] || row.staff_type,
    },
    {
      key: 'phone',
      header: '연락처',
      render: (row) => row.phone,
    },
    {
      key: 'specialties',
      header: '전문분야',
      render: (row) => (
        <div className="flex flex-wrap gap-1.5">
          {row.specialties.map((s) => (
            <Badge key={s} variant="success">
              {s}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'patients',
      header: '담당 환자',
      render: (row) => (
        <span className="text-on-surface">
          {row.current_patient_count}/{row.max_patients}
        </span>
      ),
    },
    {
      key: 'today_visits',
      header: '오늘 방문',
      render: (row) => <span>{row.today_visits}건</span>,
    },
    {
      key: 'is_active',
      header: '상태',
      render: (row) =>
        row.is_active ? (
          <Badge variant="success">활성</Badge>
        ) : (
          <Badge variant="default">비활성</Badge>
        ),
    },
  ];

  return (
    <Table
      columns={columns}
      data={staff}
      keyExtractor={(row) => row.id}
      onRowClick={(row) => router.push(`/hospital/staff/${row.id}`)}
      loading={loading}
      page={page}
      totalPages={totalPages}
      onPageChange={onPageChange}
      emptyMessage="등록된 직원이 없습니다."
    />
  );
}
