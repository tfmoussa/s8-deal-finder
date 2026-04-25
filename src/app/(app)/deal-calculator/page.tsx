'use client';

import { useState } from 'react';
import { Plus, Trash2, Calculator } from 'lucide-react';
import type { DealCalcRow } from '@/types';
import { computeDealCalcRow } from '@/lib/calculations';
import { formatCurrency, formatPct, cashflowColor, cn } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

let idCounter = 1;

const DEFAULT_ROW: Omit<DealCalcRow, 'id' | 'propertyName'> = {
  currentRent: 1200,
  marketRent: 1400,
  purchasePrice: 150_000,
  downPaymentPct: 20,
  interestRatePct: 7,
  termYears: 30,
};

export default function DealCalculatorPage() {
  const [rows, setRows] = useState<DealCalcRow[]>([
    { id: String(idCounter++), propertyName: 'Example Property', ...DEFAULT_ROW },

  ]);

  const addRow = () => {
    setRows(prev => [...prev, { id: String(idCounter++), propertyName: 'New Property', ...DEFAULT_ROW }]);
  };

  const removeRow = (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const updateRow = (id: string, patch: Partial<DealCalcRow>) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
          <Calculator className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">Deal Calculator</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Manually compare multiple properties side by side
          </p>
        </div>
        <Button className="ml-auto" size="sm" onClick={addRow}>
          <Plus className="w-3.5 h-3.5" />
          Add Property
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-[var(--border)]">
              {[
                'Property', 'S8 Rent/mo', 'Market Rent/mo', 'Purchase Price',
                'Down %', 'Rate %', 'Term', 'Mortgage', 'CF (S8)', 'CF (Mkt)', 'ROI', ''
              ].map(h => (
                <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-[var(--muted-foreground)] whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const result = computeDealCalcRow(
                row.currentRent,
                row.marketRent,
                row.purchasePrice,
                row.downPaymentPct,
                row.interestRatePct,
                row.termYears
              );
              return (
                <tr
                  key={row.id}
                  className={cn(
                    'border-b border-[var(--border)]',
                    i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                  )}
                >
                  <td className="px-3 py-2">
                    <input
                      value={row.propertyName}
                      onChange={e => updateRow(row.id, { propertyName: e.target.value })}
                      placeholder="Property name"
                      className="w-36 h-8 px-2 text-xs border border-[var(--border)] rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <NumCell row={row} field="currentRent" prefix="$" update={updateRow} />
                  <NumCell row={row} field="marketRent" prefix="$" update={updateRow} />
                  <NumCell row={row} field="purchasePrice" prefix="$" update={updateRow} />
                  <NumCell row={row} field="downPaymentPct" suffix="%" update={updateRow} />
                  <NumCell row={row} field="interestRatePct" suffix="%" update={updateRow} step={0.25} />
                  <NumCell row={row} field="termYears" update={updateRow} />
                  <td className="px-3 py-2 text-xs font-medium text-red-500">
                    {formatCurrency(result.mortgagePayment)}
                  </td>
                  <td className={`px-3 py-2 text-xs font-semibold ${cashflowColor(result.monthlyCashflowCurrent)}`}>
                    {formatCurrency(result.monthlyCashflowCurrent)}
                  </td>
                  <td className={`px-3 py-2 text-xs font-semibold ${cashflowColor(result.monthlyCashflowMarket)}`}>
                    {formatCurrency(result.monthlyCashflowMarket)}
                  </td>
                  <td className={`px-3 py-2 text-xs font-semibold ${result.roi > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {formatPct(result.roi)}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => removeRow(row.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <div className="text-center py-12 text-[var(--muted-foreground)]">
          <p className="text-sm">No properties added yet.</p>
          <Button className="mt-3" size="sm" onClick={addRow}>
            <Plus className="w-3.5 h-3.5" />
            Add Property
          </Button>
        </div>
      )}
    </div>
  );
}

function NumCell({
  row,
  field,
  prefix,
  suffix,
  step = 1,
  update,
}: {
  row: DealCalcRow;
  field: keyof DealCalcRow;
  prefix?: string;
  suffix?: string;
  step?: number;
  update: (id: string, patch: Partial<DealCalcRow>) => void;
}) {
  return (
    <td className="px-3 py-2">
      <div className="relative w-24">
        {prefix && (
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted-foreground)]">
            {prefix}
          </span>
        )}
        <input
          type="number"
          value={row[field] as number}
          step={step}
          onChange={e => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) update(row.id, { [field]: v } as Partial<DealCalcRow>);
          }}
          className={cn(
            'w-full h-8 text-xs border border-[var(--border)] rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-right',
            prefix ? 'pl-4 pr-2' : suffix ? 'pl-2 pr-5' : 'px-2'
          )}
        />
        {suffix && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted-foreground)]">
            {suffix}
          </span>
        )}
      </div>
    </td>
  );
}
