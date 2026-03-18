import { clsx } from 'clsx';

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  className?: string;
}

export default function Table<T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
  emptyMessage = '데이터가 없습니다.',
  className,
}: TableProps<T>) {
  return (
    <div className={clsx('overflow-x-auto', className)}>
      <table className="min-w-full">
        <thead>
          <tr className="bg-primary-50/50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={clsx(
                  'px-6 py-4 text-left text-[11px] font-semibold text-primary-400 uppercase tracking-wider',
                  col.className,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-6 py-16 text-center text-sm text-primary-300"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr
                key={idx}
                onClick={() => onRowClick?.(row)}
                className={clsx(
                  'transition-all duration-150',
                  idx % 2 === 1 && 'bg-primary-50/30',
                  onRowClick && 'cursor-pointer hover:bg-secondary-50/40',
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={clsx(
                      'px-6 py-4 text-sm text-primary-600 whitespace-nowrap',
                      col.className,
                    )}
                  >
                    {col.render
                      ? col.render(row)
                      : (row[col.key] as React.ReactNode)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
