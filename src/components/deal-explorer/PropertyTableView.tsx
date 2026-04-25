'use client';

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from '@tanstack/react-table';
import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Download, Heart } from 'lucide-react';
import type { PropertyListItem } from '@/types';
import { formatCurrency, formatPct, cashflowColor, cn } from '@/lib/utils';
import { computeFinancials } from '@/lib/calculations';
import { useAssumptions } from '@/context/AssumptionsContext';
import Button from '@/components/ui/Button';
import * as XLSX from 'xlsx';

interface PropertyTableViewProps {
  properties: PropertyListItem[];
  onSelect: (p: PropertyListItem) => void;
  onToggleFavorite?: (p: PropertyListItem) => void;
}

const col = createColumnHelper<PropertyListItem & { cashflow: number; capRate: number }>();

export default function PropertyTableView({
  properties,
  onSelect,
  onToggleFavorite,
}: PropertyTableViewProps) {
  const { assumptions } = useAssumptions();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  // Enrich with computed financials
  const enriched = useMemo(
    () =>
      properties.map(p => {
        if (!p.fmr) return { ...p, cashflow: p.cashFlow ?? 0, capRate: 0 };
        const fin = computeFinancials(p.listPrice, p.fmr, p.propTaxes, assumptions);
        return { ...p, cashflow: fin.monthlyCashflow, capRate: fin.capRate };
      }),
    [properties, assumptions]
  );

  const columns = useMemo(
    () => [
      col.accessor('isFavorite', {
        header: '',
        size: 36,
        cell: ({ row }) => (
          <button
            className="p-1 hover:text-red-500 transition-colors"
            onClick={e => {
              e.stopPropagation();
              onToggleFavorite?.(row.original);
            }}
          >
            <Heart
              className={cn(
                'w-3.5 h-3.5',
                row.original.isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-300'
              )}
            />
          </button>
        ),
        enableSorting: false,
      }),
      col.accessor('address', {
        header: 'Address',
        size: 260,
        cell: info => (
          <span className="text-blue-600 hover:underline cursor-pointer text-xs leading-tight">
            {info.getValue()}
          </span>
        ),
      }),
      col.accessor('listPrice', {
        header: 'Price',
        size: 100,
        cell: info => formatCurrency(info.getValue()),
      }),
      col.accessor('bedrooms', {
        header: 'Beds',
        size: 50,
      }),
      col.accessor('bathrooms', {
        header: 'Baths',
        size: 55,
      }),
      col.accessor('sqft', {
        header: 'Sqft',
        size: 70,
        cell: info => info.getValue()?.toLocaleString() ?? '—',
      }),
      col.accessor('fmr', {
        header: 'FMR',
        size: 80,
        cell: info => formatCurrency(info.getValue()),
      }),
      col.accessor('cashflow', {
        header: 'Cashflow/mo',
        size: 100,
        cell: info => (
          <span className={cashflowColor(info.getValue())}>
            {formatCurrency(info.getValue())}
          </span>
        ),
      }),
      col.accessor('capRate', {
        header: 'Cap Rate',
        size: 80,
        cell: info => (
          <span className={info.getValue() > 0 ? 'text-emerald-600' : 'text-red-500'}>
            {formatPct(info.getValue())}
          </span>
        ),
      }),
      col.accessor('mortgage', {
        header: 'Est. Pmt',
        size: 80,
        cell: info => (
          <span className="text-red-500">{formatCurrency(info.getValue())}</span>
        ),
      }),
      col.accessor('daysOnMarket', {
        header: 'Days',
        size: 55,
        cell: info => info.getValue() ?? '—',
      }),
    ],
    [onToggleFavorite]
  );

  const table = useReactTable({
    data: enriched,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const exportToExcel = () => {
    const rows = enriched.map(p => ({
      Address: p.address,
      Price: p.listPrice,
      Beds: p.bedrooms,
      Baths: p.bathrooms,
      Sqft: p.sqft,
      FMR: p.fmr,
      'Cashflow/mo': p.cashflow,
      'Cap Rate %': p.capRate?.toFixed(2),
      'Est. Pmt': p.mortgage,
      'Days on Market': p.daysOnMarket,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Properties');
    XLSX.writeFile(wb, 'properties.xlsx');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Table toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-[var(--border)] bg-white shrink-0">
        <input
          placeholder="Filter results…"
          value={globalFilter}
          onChange={e => setGlobalFilter(e.target.value)}
          className="h-8 text-sm px-3 border border-[var(--border)] rounded-md w-52 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        />
        <span className="text-xs text-[var(--muted-foreground)] ml-auto">
          {table.getRowModel().rows.length} properties
        </span>
        <Button variant="outline" size="sm" onClick={exportToExcel}>
          <Download className="w-3.5 h-3.5" />
          Export
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 bg-slate-50 z-10">
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id} className="border-b border-[var(--border)]">
                {hg.headers.map(header => (
                  <th
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className={cn(
                      'px-3 py-2.5 text-left text-xs font-semibold text-[var(--muted-foreground)] whitespace-nowrap',
                      header.column.getCanSort() && 'cursor-pointer select-none hover:text-[var(--foreground)]'
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <span className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <span className="text-slate-300">
                          {header.column.getIsSorted() === 'asc' ? (
                            <ChevronUp className="w-3 h-3 text-blue-600" />
                          ) : header.column.getIsSorted() === 'desc' ? (
                            <ChevronDown className="w-3 h-3 text-blue-600" />
                          ) : (
                            <ChevronsUpDown className="w-3 h-3" />
                          )}
                        </span>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, i) => (
              <tr
                key={row.id}
                onClick={() => onSelect(row.original)}
                className={cn(
                  'border-b border-[var(--border)] cursor-pointer transition-colors',
                  i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50',
                  'hover:bg-blue-50'
                )}
              >
                {row.getVisibleCells().map(cell => (
                  <td
                    key={cell.id}
                    className="px-3 py-2 text-xs text-[var(--foreground)] whitespace-nowrap overflow-hidden"
                    style={{ maxWidth: cell.column.getSize() }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {table.getRowModel().rows.length === 0 && (
          <div className="text-center py-16 text-[var(--muted-foreground)] text-sm">
            No properties to display
          </div>
        )}
      </div>
    </div>
  );
}
