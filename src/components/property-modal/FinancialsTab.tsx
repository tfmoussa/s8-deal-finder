'use client';

import { useState } from 'react';
import type { PropertyDetail, ComputedFinancials } from '@/types';
import { formatCurrency, formatPct, cashflowColor } from '@/lib/utils';
import { useAssumptions } from '@/context/AssumptionsContext';
import { computeAllFinancials } from '@/lib/calculations';
import Button from '@/components/ui/Button';
import { TrendingUp, RefreshCw } from 'lucide-react';

interface FinancialsTabProps {
  detail: PropertyDetail;
  computedFin: ComputedFinancials;
  onFetchMarketRent: () => void;
  marketRentLoading: boolean;
  hasMarketRent: boolean;
}

export default function FinancialsTab({
  detail,
  computedFin,
  onFetchMarketRent,
  marketRentLoading,
  hasMarketRent,
}: FinancialsTabProps) {
  const { assumptions, updateAssumptions } = useAssumptions();
  const [localOverrides, setLocalOverrides] = useState({
    propMgmtPct: assumptions.propMgmtPct,
    propTaxesMonthly: detail.propTaxes ?? 0,
    insuranceMonthly: assumptions.insuranceMonthly,
    utilitiesMonthly: assumptions.utilitiesMonthly,
    vacancyReservePct: assumptions.vacancyReservePct,
    maintenanceReservePct: assumptions.maintenanceReservePct,
    downPaymentPct: assumptions.downPaymentPct,
    closingCostsPct: assumptions.closingCostsPct,
    interestRatePct: assumptions.interestRatePct,
    loanTermYears: assumptions.loanTermYears,
    fmrPct: assumptions.fmrPct,
  });

  const localFin = computeAllFinancials(
    detail.listPrice,
    detail.fmr ?? 0,
    localOverrides.propTaxesMonthly || undefined,
    { ...assumptions, ...localOverrides },
    computedFin.marketRent
      ? {
          low: computedFin.marketRent.low?.grossRent,
          avg: computedFin.marketRent.avg?.grossRent,
          high: computedFin.marketRent.high?.grossRent,
        }
      : undefined
  );

  const setOverride = (key: keyof typeof localOverrides, value: number) => {
    setLocalOverrides(prev => ({ ...prev, [key]: value }));
  };

  const saveAsDefault = () => {
    updateAssumptions({
      propMgmtPct: localOverrides.propMgmtPct,
      insuranceMonthly: localOverrides.insuranceMonthly,
      utilitiesMonthly: localOverrides.utilitiesMonthly,
      vacancyReservePct: localOverrides.vacancyReservePct,
      maintenanceReservePct: localOverrides.maintenanceReservePct,
      downPaymentPct: localOverrides.downPaymentPct,
      closingCostsPct: localOverrides.closingCostsPct,
      interestRatePct: localOverrides.interestRatePct,
      loanTermYears: localOverrides.loanTermYears,
      fmrPct: localOverrides.fmrPct,
    });
  };

  return (
    <div className="p-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column: Operating expenses */}
        <div>
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">
            Estimated Financials (Monthly)
          </h3>
          <div className="space-y-2">
            <FinRow
              label="FMR % Used"
              inputValue={localOverrides.fmrPct}
              onChangeInput={v => setOverride('fmrPct', v)}
              displayValue={`${localOverrides.fmrPct}%`}
              suffix="%"
            />
            <FinRowReadonly
              label="Gross Rent (FMR)"
              value={formatCurrency(localFin.grossRent)}
            />
            <div className="my-1 border-t border-[var(--border)]" />
            <FinRow
              label="Prop. Management"
              inputValue={localOverrides.propMgmtPct}
              onChangeInput={v => setOverride('propMgmtPct', v)}
              displayValue={`${localOverrides.propMgmtPct}% = ${formatCurrency(localFin.propMgmtAmt)}`}
              suffix="%"
            />
            <FinRow
              label="Prop. Taxes"
              inputValue={localOverrides.propTaxesMonthly}
              onChangeInput={v => setOverride('propTaxesMonthly', v)}
              displayValue={formatCurrency(localFin.propTaxesAmt)}
              prefix="$"
            />
            <FinRow
              label="Insurance"
              inputValue={localOverrides.insuranceMonthly}
              onChangeInput={v => setOverride('insuranceMonthly', v)}
              displayValue={formatCurrency(localFin.insuranceAmt)}
              prefix="$"
            />
            <FinRow
              label="Utilities"
              inputValue={localOverrides.utilitiesMonthly}
              onChangeInput={v => setOverride('utilitiesMonthly', v)}
              displayValue={formatCurrency(localFin.utilitiesAmt)}
              prefix="$"
            />
            <FinRow
              label="Vacancy Reserve"
              inputValue={localOverrides.vacancyReservePct}
              onChangeInput={v => setOverride('vacancyReservePct', v)}
              displayValue={`${localOverrides.vacancyReservePct}% = ${formatCurrency(localFin.vacancyReserveAmt)}`}
              suffix="%"
            />
            <FinRow
              label="Maintenance Reserve"
              inputValue={localOverrides.maintenanceReservePct}
              onChangeInput={v => setOverride('maintenanceReservePct', v)}
              displayValue={`${localOverrides.maintenanceReservePct}% = ${formatCurrency(localFin.maintenanceReserveAmt)}`}
              suffix="%"
            />
            <div className="my-1 border-t border-[var(--border)]" />
            <FinRowReadonly
              label="Total Oper. Expenses"
              value={formatCurrency(localFin.totalOperatingExpenses)}
              valueClass="text-red-500"
            />
            <FinRowReadonly
              label="Monthly NOI"
              value={formatCurrency(localFin.monthlyNOI)}
              valueClass={cashflowColor(localFin.monthlyNOI)}
              bold
            />
            <FinRowReadonly
              label="Annual NOI"
              value={formatCurrency(localFin.annualNOI)}
              valueClass={cashflowColor(localFin.annualNOI)}
            />
            <FinRowReadonly
              label="Cap Rate"
              value={formatPct(localFin.capRate)}
              valueClass={localFin.capRate > 0 ? 'text-emerald-600' : 'text-red-500'}
            />
          </div>
        </div>

        {/* Right column: Cashflow / financing */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">
              Cashflow Calculation (Monthly)
            </h3>
            <button
              onClick={saveAsDefault}
              className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
            >
              Save as default
            </button>
          </div>
          <div className="space-y-2">
            <FinRow
              label="Down Payment"
              inputValue={localOverrides.downPaymentPct}
              onChangeInput={v => setOverride('downPaymentPct', v)}
              displayValue={`${localOverrides.downPaymentPct}% = ${formatCurrency(localFin.downPaymentAmt)}`}
              suffix="%"
            />
            <FinRow
              label="Closing Costs"
              inputValue={localOverrides.closingCostsPct}
              onChangeInput={v => setOverride('closingCostsPct', v)}
              displayValue={`${localOverrides.closingCostsPct}% = ${formatCurrency(localFin.closingCostsAmt)}`}
              suffix="%"
            />
            <FinRow
              label="Interest Rate"
              inputValue={localOverrides.interestRatePct}
              onChangeInput={v => setOverride('interestRatePct', v)}
              displayValue={`${localOverrides.interestRatePct}%`}
              suffix="%"
            />
            <FinRow
              label="Term (years)"
              inputValue={localOverrides.loanTermYears}
              onChangeInput={v => setOverride('loanTermYears', v)}
              displayValue={`${localOverrides.loanTermYears} yrs`}
            />
            <div className="my-1 border-t border-[var(--border)]" />
            <FinRowReadonly label="Property Value" value={formatCurrency(localFin.propertyValue)} />
            <FinRowReadonly label="LTV" value={formatPct(localFin.ltv)} />
            <FinRowReadonly label="Principal" value={formatCurrency(localFin.principal)} />
            <FinRowReadonly
              label="Mortgage Payment"
              value={formatCurrency(localFin.mortgagePayment)}
              valueClass="text-red-500"
            />
            <div className="my-1 border-t border-[var(--border)]" />
            <FinRowReadonly
              label="Monthly Cashflow"
              value={formatCurrency(localFin.monthlyCashflow)}
              valueClass={cashflowColor(localFin.monthlyCashflow)}
              bold
            />
            <FinRowReadonly
              label="Annual Cashflow"
              value={formatCurrency(localFin.annualCashflow)}
              valueClass={cashflowColor(localFin.annualCashflow)}
            />
            <FinRowReadonly
              label="Annualized ROI"
              value={formatPct(localFin.annualizedROI)}
              valueClass={localFin.annualizedROI > 0 ? 'text-emerald-600' : 'text-red-500'}
            />
          </div>

          {/* Market Rent section */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                Market Rent (RentCast)
              </h4>
              <Button
                size="sm"
                variant="outline"
                onClick={onFetchMarketRent}
                loading={marketRentLoading}
              >
                <RefreshCw className="w-3 h-3" />
                {hasMarketRent ? 'Refresh' : 'Fetch'}
              </Button>
            </div>
            {localFin.marketRent ? (
              <div className="grid grid-cols-3 gap-2">
                {(['low', 'avg', 'high'] as const).map(k => {
                  const mf = localFin.marketRent![k];
                  return (
                    <div key={k} className="bg-slate-50 border border-[var(--border)] rounded-lg p-2.5 text-center">
                      <p className="text-[10px] text-[var(--muted-foreground)] uppercase mb-1">{k}</p>
                      <p className="text-xs font-semibold">{formatCurrency(mf?.grossRent)}</p>
                      <p className={`text-xs font-bold mt-1 ${cashflowColor(mf?.monthlyCashflow)}`}>
                        {formatCurrency(mf?.monthlyCashflow)}/mo
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-[var(--muted-foreground)]">
                Fetch RentCast data to compare market rent vs. Section 8 FMR
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Editable row with +/- buttons
function FinRow({
  label,
  inputValue,
  onChangeInput,
  displayValue,
  prefix,
  suffix,
}: {
  label: string;
  inputValue: number;
  onChangeInput: (v: number) => void;
  displayValue: string;
  prefix?: string;
  suffix?: string;
}) {
  const step = suffix === '%' ? 0.5 : 10;
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-[var(--muted-foreground)] flex-1">{label}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChangeInput(Math.max(0, inputValue - step))}
          className="w-5 h-5 rounded flex items-center justify-center text-xs bg-slate-100 hover:bg-slate-200 transition-colors font-bold"
        >
          −
        </button>
        <span className="text-xs font-medium text-right min-w-[90px] text-[var(--foreground)]">
          {displayValue}
        </span>
        <button
          onClick={() => onChangeInput(inputValue + step)}
          className="w-5 h-5 rounded flex items-center justify-center text-xs bg-slate-100 hover:bg-slate-200 transition-colors font-bold"
        >
          +
        </button>
      </div>
    </div>
  );
}

function FinRowReadonly({
  label,
  value,
  valueClass,
  bold,
}: {
  label: string;
  value: string;
  valueClass?: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-[var(--muted-foreground)]">{label}</span>
      <span className={`text-xs ${bold ? 'font-bold' : 'font-medium'} ${valueClass ?? 'text-[var(--foreground)]'}`}>
        {value}
      </span>
    </div>
  );
}
