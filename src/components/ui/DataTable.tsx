import { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  /** Width hint, e.g. 'w-32' or 'min-w-[120px]' */
  width?: string;
  align?: 'left' | 'center' | 'right';
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  className?: string;
}

const alignClass = { left: 'text-left', center: 'text-center', right: 'text-right' };

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  emptyMessage = 'No data found.',
  onRowClick,
  className = '',
}: DataTableProps<T>) {
  return (
    <div className={['bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden', className].join(' ')}>
      {loading ? (
        <div className="p-12 text-center text-gray-500 text-sm">
          <svg className="w-5 h-5 animate-spin text-[#2e6f40] mx-auto mb-3" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Loading…
        </div>
      ) : data.length === 0 ? (
        <div className="p-12 text-center text-gray-500 text-sm">{emptyMessage}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f0f9f2] border-b border-[#d1ecd7]">
                {columns.map(col => (
                  <th
                    key={col.key}
                    className={[
                      'px-4 py-3 font-semibold text-[#1f4d2b] text-xs uppercase tracking-wide',
                      alignClass[col.align ?? 'left'],
                      col.width ?? '',
                    ].join(' ')}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map(row => (
                <tr
                  key={keyExtractor(row)}
                  onClick={() => onRowClick?.(row)}
                  className={[
                    'hover:bg-[#f0f9f2] transition-colors',
                    onRowClick ? 'cursor-pointer' : '',
                  ].join(' ')}
                >
                  {columns.map(col => (
                    <td
                      key={col.key}
                      className={[
                        'px-4 py-3 text-gray-700',
                        alignClass[col.align ?? 'left'],
                      ].join(' ')}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
