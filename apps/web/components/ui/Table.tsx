'use client';

import { clsx } from 'clsx';
import { ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import type { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  render: (row: T, index: number) => ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  emptyMessage?: string;
  loading?: boolean;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  sortKey,
  sortDir,
  onSort,
  page,
  totalPages,
  onPageChange,
  emptyMessage = '데이터가 없습니다.',
  loading = false,
}: TableProps<T>) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-surface-container-low">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={clsx(
                    'px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant',
                    col.sortable && 'cursor-pointer select-none hover:text-on-surface',
                    col.className
                  )}
                  onClick={() => col.sortable && onSort?.(col.key)}
                >
                  <div className="flex items-center gap-1.5">
                    {col.header}
                    {col.sortable && (
                      <ArrowUpDown
                        className={clsx(
                          'h-3.5 w-3.5',
                          sortKey === col.key
                            ? 'text-primary'
                            : 'text-outline-variant'
                        )}
                      />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-5 py-14 text-center text-sm text-on-surface-variant"
                >
                  <div className="flex items-center justify-center gap-2.5">
                    <div className="h-5 w-5 animate-spin rounded-full bg-gradient-to-r from-primary to-primary-container" style={{ mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 0)', WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 0)' }} />
                    불러오는 중...
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-5 py-14 text-center text-sm text-on-surface-variant"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr
                  key={keyExtractor(row)}
                  onClick={() => onRowClick?.(row)}
                  className={clsx(
                    'transition-colors duration-150',
                    i % 2 === 0 ? 'bg-white' : 'bg-surface-container-low/50',
                    onRowClick && 'cursor-pointer hover:bg-surface-container-high/40'
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={clsx(
                        'whitespace-nowrap px-5 py-3.5 text-sm text-on-surface',
                        col.className
                      )}
                    >
                      {col.render(row, i)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages !== undefined && totalPages > 1 && page !== undefined && (
        <div className="flex items-center justify-between bg-surface-container-low/30 px-5 py-3.5">
          <p className="text-sm text-on-surface-variant">
            페이지 {page} / {totalPages}
          </p>
          <div className="flex gap-1.5">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange?.(page - 1)}
              className="rounded-xl p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange?.(page + 1)}
              className="rounded-xl p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
