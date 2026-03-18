'use client';

import { useRouter } from 'next/navigation';
import { Table, type Column } from '@/components/ui/Table';
import { Badge, getStatusBadgeVariant } from '@/components/ui/Badge';
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

interface PatientTableProps {
  patients: Tables<'patients'>[];
  loading?: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string) => void;
}

export function PatientTable({
  patients,
  loading,
  page,
  totalPages,
  onPageChange,
  sortKey,
  sortDir,
  onSort,
}: PatientTableProps) {
  const router = useRouter();

  const columns: Column<Tables<'patients'>>[] = [
    {
      key: 'full_name',
      header: '이름',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-on-surface">{row.full_name}</span>
      ),
    },
    {
      key: 'birth_date',
      header: '생년월일',
      render: (row) => row.birth_date,
    },
    {
      key: 'gender',
      header: '성별',
      render: (row) => (row.gender === 'male' ? '남' : '여'),
    },
    {
      key: 'care_grade',
      header: '요양등급',
      render: (row) =>
        row.care_grade ? careGradeLabels[row.care_grade] || row.care_grade : '-',
    },
    {
      key: 'primary_diagnosis',
      header: '주 진단명',
      render: (row) => row.primary_diagnosis || '-',
    },
    {
      key: 'address',
      header: '주소',
      render: (row) => (
        <span className="max-w-[200px] truncate" title={row.address}>
          {row.address}
        </span>
      ),
    },
    {
      key: 'status',
      header: '상태',
      render: (row) => (
        <Badge variant={getStatusBadgeVariant(row.status)}>
          {statusLabels[row.status]}
        </Badge>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      data={patients}
      keyExtractor={(row) => row.id}
      onRowClick={(row) => router.push(`/patients/${row.id}`)}
      loading={loading}
      page={page}
      totalPages={totalPages}
      onPageChange={onPageChange}
      sortKey={sortKey}
      sortDir={sortDir}
      onSort={onSort}
      emptyMessage="등록된 환자가 없습니다."
    />
  );
}
