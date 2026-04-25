'use client';

import { useAssumptions } from '@/context/AssumptionsContext';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { DEFAULT_ASSUMPTIONS } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { calcMortgagePayment } from '@/lib/calculations';
import { Settings, RotateCcw, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { assumptions, updateAssumptions, resetAssumptions, saveAssumptions, isSaving, isDirty } = useAssumptions();

  const exampleMortgage = calcMortgagePayment(
    200_000 * (1 - assumptions.downPaymentPct / 100),
    assumptions.interestRatePct,
    assumptions.loanTermYears
  );

  const handleSave = async () => {
    await saveAssumptions();
    toast.success('Assumptions saved');
  };

  const handleReset = () => {
    resetAssumptions();
    toast('Reset to defaults');
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
          <Settings className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">Master Assumptions</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Default financial inputs used across all property calculations
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </Button>
          <Button size="sm" onClick={handleSave} loading={isSaving} disabled={!isDirty}>
            <Save className="w-3.5 h-3.5" />
            Save
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 8 */}
        <AssumptionSection title="Section 8 FMR">
          <AssumptionInput
            label="% of FMR Actually Received"
            value={assumptions.fmrPct}
            onChange={v => updateAssumptions({ fmrPct: v })}
            min={50}
            max={110}
            step={5}
            suffix="%"
            hint="80% means you receive 80% of the published FMR"
          />
        </AssumptionSection>

        {/* Operating Expenses */}
        <AssumptionSection title="Operating Expenses">
          <AssumptionInput
            label="Property Management"
            value={assumptions.propMgmtPct}
            onChange={v => updateAssumptions({ propMgmtPct: v })}
            min={0}
            max={20}
            step={1}
            suffix="%"
            hint="% of gross rent"
          />
          <AssumptionInput
            label="Insurance (monthly)"
            value={assumptions.insuranceMonthly}
            onChange={v => updateAssumptions({ insuranceMonthly: v })}
            min={0}
            step={10}
            prefix="$"
          />
          <AssumptionInput
            label="Utilities (monthly)"
            value={assumptions.utilitiesMonthly}
            onChange={v => updateAssumptions({ utilitiesMonthly: v })}
            min={0}
            step={10}
            prefix="$"
          />
          <AssumptionInput
            label="Vacancy Reserve"
            value={assumptions.vacancyReservePct}
            onChange={v => updateAssumptions({ vacancyReservePct: v })}
            min={0}
            max={20}
            step={1}
            suffix="%"
            hint="% of gross rent"
          />
          <AssumptionInput
            label="Maintenance Reserve"
            value={assumptions.maintenanceReservePct}
            onChange={v => updateAssumptions({ maintenanceReservePct: v })}
            min={0}
            max={20}
            step={1}
            suffix="%"
            hint="% of gross rent"
          />
        </AssumptionSection>

        {/* Financing */}
        <AssumptionSection title="Financing">
          <AssumptionInput
            label="Down Payment"
            value={assumptions.downPaymentPct}
            onChange={v => updateAssumptions({ downPaymentPct: v })}
            min={0}
            max={100}
            step={5}
            suffix="%"
          />
          <AssumptionInput
            label="Closing Costs"
            value={assumptions.closingCostsPct}
            onChange={v => updateAssumptions({ closingCostsPct: v })}
            min={0}
            max={10}
            step={0.5}
            suffix="%"
          />
          <AssumptionInput
            label="Interest Rate"
            value={assumptions.interestRatePct}
            onChange={v => updateAssumptions({ interestRatePct: v })}
            min={0}
            max={20}
            step={0.25}
            suffix="%"
          />
          <AssumptionInput
            label="Loan Term"
            value={assumptions.loanTermYears}
            onChange={v => updateAssumptions({ loanTermYears: v })}
            min={5}
            max={30}
            step={5}
            suffix="yrs"
          />
        </AssumptionSection>

        {/* Live preview */}
        <AssumptionSection title="Live Preview (on a $200K property)">
          <div className="space-y-1.5 text-sm">
            <PreviewRow
              label="Down Payment"
              value={formatCurrency(200_000 * (assumptions.downPaymentPct / 100))}
            />
            <PreviewRow
              label="Closing Costs"
              value={formatCurrency(200_000 * (assumptions.closingCostsPct / 100))}
            />
            <PreviewRow label="Loan Amount" value={formatCurrency(200_000 * (1 - assumptions.downPaymentPct / 100))} />
            <PreviewRow
              label="Monthly P&I"
              value={formatCurrency(exampleMortgage)}
              valueClass="text-red-500 font-semibold"
            />
            <PreviewRow label="Est. Mgmt (on $1,200 FMR)" value={formatCurrency(1200 * assumptions.propMgmtPct / 100)} />
            <PreviewRow label="Est. Vacancy Reserve" value={formatCurrency(1200 * assumptions.vacancyReservePct / 100)} />
          </div>
        </AssumptionSection>
      </div>

      {isDirty && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 flex items-center justify-between">
          You have unsaved changes
          <Button size="sm" onClick={handleSave} loading={isSaving}>
            Save Now
          </Button>
        </div>
      )}
    </div>
  );
}

function AssumptionSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-[var(--border)] rounded-xl p-4">
      <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3 pb-2 border-b border-[var(--border)]">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function AssumptionInput({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  prefix,
  suffix,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  hint?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium text-[var(--muted-foreground)]">{label}</label>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onChange(Math.max(min, value - step))}
            className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-xs flex items-center justify-center font-bold transition-colors"
          >
            −
          </button>
          <div className="relative">
            {prefix && (
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-[var(--muted-foreground)]">
                {prefix}
              </span>
            )}
            <input
              type="number"
              value={value}
              min={min}
              max={max}
              step={step}
              onChange={e => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v)) onChange(v);
              }}
              className={`w-20 h-7 text-xs text-center border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${prefix ? 'pl-4' : ''} ${suffix ? 'pr-5' : ''}`}
            />
            {suffix && (
              <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-[var(--muted-foreground)]">
                {suffix}
              </span>
            )}
          </div>
          <button
            onClick={() => onChange(max != null ? Math.min(max, value + step) : value + step)}
            className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-xs flex items-center justify-center font-bold transition-colors"
          >
            +
          </button>
        </div>
      </div>
      {hint && <p className="text-[10px] text-[var(--muted-foreground)]">{hint}</p>}
    </div>
  );
}

function PreviewRow({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-[var(--muted-foreground)]">{label}</span>
      <span className={valueClass ?? 'text-[var(--foreground)]'}>{value}</span>
    </div>
  );
}
