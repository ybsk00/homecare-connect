'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { PatientTable } from '@/components/patients/PatientTable';
import { Search } from 'lucide-react';
import { clsx } from 'clsx';
import type { Tables } from '@homecare/shared-types';

const PAGE_SIZE = 15;

const statusFilters = [
  { value: '', label: '전체' },
  { value: 'active', label: '활성' },
  { value: 'paused', label: '일시중지' },
  { value: 'discharged', label: '퇴원' },
];

export default function PatientsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState('full_name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const { data, isLoading } = useQuery({
    queryKey: ['patients', search, statusFilter, page, sortKey, sortDir],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();

      let query = supabase
        .from('patients')
        .select('*', { count: 'exact' });

      if (search) {
        query = query.or(
          `full_name.ilike.%${search}%,address.ilike.%${search}%,primary_diagnosis.ilike.%${search}%`
        );
      }

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      query = query
        .order(sortKey, { ascending: sortDir === 'asc' })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      const { data: patients, count } = await query;

      return {
        patients: (patients || []) as Tables<'patients'>[],
        total: count || 0,
        totalPages: Math.ceil((count || 0) / PAGE_SIZE),
      };
    },
  });

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-on-surface">환자 관리</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          등록된 환자 목록을 관리합니다. 총 {data?.total || 0}명
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative min-w-[280px] flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant/50" />
          <input
            type="text"
            placeholder="이름, 주소, 진단명으로 검색..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl bg-surface-container-highest py-2.5 pl-11 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>
        <div className="flex gap-2">
          {statusFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => {
                setStatusFilter(f.value);
                setPage(1);
              }}
              className={clsx(
                'rounded-full px-4 py-2 text-xs font-semibold transition-all',
                statusFilter === f.value
                  ? 'bg-gradient-to-r from-primary to-primary-container text-white'
                  : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <PatientTable
        patients={data?.patients || []}
        loading={isLoading}
        page={page}
        totalPages={data?.totalPages || 1}
        onPageChange={setPage}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
      />
    </div>
  );
}
