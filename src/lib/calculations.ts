import type { FinancialAssumptions, ComputedFinancials } from '@/types';

/**
 * Monthly mortgage payment (principal + interest only)
 * P = principal, r = monthly rate, n = total payments
 */
export function calcMortgagePayment(
  principal: number,
  annualRatePct: number,
  termYears: number
): number {
  if (principal <= 0) return 0;
  if (annualRatePct <= 0) {
    return principal / (termYears * 12);
  }
  const r = annualRatePct / 100 / 12;
  const n = termYears * 12;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

/**
 * Core financial calculator — all monthly values unless noted
 */
export function computeFinancials(
  listPrice: number,
  fmr: number,
  propTaxesMonthly: number | undefined,
  assumptions: FinancialAssumptions
): ComputedFinancials {
  const {
    propMgmtPct,
    insuranceMonthly,
    utilitiesMonthly,
    vacancyReservePct,
    maintenanceReservePct,
    downPaymentPct,
    closingCostsPct,
    interestRatePct,
    loanTermYears,
    fmrPct,
  } = assumptions;

  // Effective rent (FMR × fmrPct%)
  const grossRent = fmr * (fmrPct / 100);

  // ── Expense calculations ────────────────────────────────────────────────
  const propMgmtAmt = grossRent * (propMgmtPct / 100);
  const propTaxesAmt =
    propTaxesMonthly != null && propTaxesMonthly > 0
      ? propTaxesMonthly
      : (assumptions.propTaxesMonthly ?? listPrice * 0.01 / 12); // fallback: 1% of price / 12
  const insuranceAmt = insuranceMonthly;
  const utilitiesAmt = utilitiesMonthly;
  const vacancyReserveAmt = grossRent * (vacancyReservePct / 100);
  const maintenanceReserveAmt = grossRent * (maintenanceReservePct / 100);

  const totalOperatingExpenses =
    propMgmtAmt +
    propTaxesAmt +
    insuranceAmt +
    utilitiesAmt +
    vacancyReserveAmt +
    maintenanceReserveAmt;

  // ── NOI ─────────────────────────────────────────────────────────────────
  const monthlyNOI = grossRent - totalOperatingExpenses;
  const annualNOI = monthlyNOI * 12;
  const capRate = listPrice > 0 ? (annualNOI / listPrice) * 100 : 0;

  // ── Financing ────────────────────────────────────────────────────────────
  const downPaymentAmt = listPrice * (downPaymentPct / 100);
  const closingCostsAmt = listPrice * (closingCostsPct / 100);
  const propertyValue = listPrice;
  const principal = listPrice - downPaymentAmt;
  const ltv = listPrice > 0 ? (principal / listPrice) * 100 : 0;
  const mortgagePayment = calcMortgagePayment(principal, interestRatePct, loanTermYears);

  // ── Cashflow ─────────────────────────────────────────────────────────────
  const monthlyCashflow = monthlyNOI - mortgagePayment;
  const annualCashflow = monthlyCashflow * 12;
  const totalCashIn = downPaymentAmt + closingCostsAmt;
  const annualizedROI = totalCashIn > 0 ? (annualCashflow / totalCashIn) * 100 : 0;

  return {
    propMgmtAmt,
    propTaxesAmt,
    insuranceAmt,
    utilitiesAmt,
    vacancyReserveAmt,
    maintenanceReserveAmt,
    totalOperatingExpenses,
    grossRent,
    monthlyNOI,
    annualNOI,
    capRate,
    downPaymentAmt,
    closingCostsAmt,
    propertyValue,
    ltv,
    principal,
    mortgagePayment,
    monthlyCashflow,
    annualCashflow,
    annualizedROI,
  };
}

/**
 * Compute financials for S8 FMR + (optionally) market rent variants
 */
export function computeAllFinancials(
  listPrice: number,
  fmr: number,
  propTaxesMonthly: number | undefined,
  assumptions: FinancialAssumptions,
  marketRent?: { low?: number; avg?: number; high?: number }
): ComputedFinancials {
  const base = computeFinancials(listPrice, fmr, propTaxesMonthly, assumptions);

  if (!marketRent) return base;

  // Market rent variants use fmrPct = 100 (it's actual market rent, not FMR)
  const marketAssumptions = { ...assumptions, fmrPct: 100 };

  base.marketRent = {
    low: marketRent.low
      ? computeFinancials(listPrice, marketRent.low, propTaxesMonthly, marketAssumptions)
      : null,
    avg: marketRent.avg
      ? computeFinancials(listPrice, marketRent.avg, propTaxesMonthly, marketAssumptions)
      : null,
    high: marketRent.high
      ? computeFinancials(listPrice, marketRent.high, propTaxesMonthly, marketAssumptions)
      : null,
  };

  return base;
}

/**
 * Quick cashflow estimate for property list cards
 */
export function quickCashflow(
  listPrice: number,
  fmr: number,
  assumptions: FinancialAssumptions
): number {
  return computeFinancials(listPrice, fmr, undefined, assumptions).monthlyCashflow;
}

/**
 * Deal Calculator row computation
 */
export interface DealCalcResult {
  mortgagePayment: number;
  monthlyCashflowCurrent: number;
  monthlyCashflowMarket: number;
  annualCashflowCurrent: number;
  annualCashflowMarket: number;
  roi: number;
}

export function computeDealCalcRow(
  currentRent: number,
  marketRent: number,
  purchasePrice: number,
  downPaymentPct: number,
  interestRatePct: number,
  termYears: number
): DealCalcResult {
  const downAmt = purchasePrice * (downPaymentPct / 100);
  const principal = purchasePrice - downAmt;
  const mortgagePayment = calcMortgagePayment(principal, interestRatePct, termYears);

  const monthlyCashflowCurrent = currentRent - mortgagePayment;
  const monthlyCashflowMarket = marketRent - mortgagePayment;
  const annualCashflowCurrent = monthlyCashflowCurrent * 12;
  const annualCashflowMarket = monthlyCashflowMarket * 12;
  const roi = downAmt > 0 ? (annualCashflowMarket / downAmt) * 100 : 0;

  return {
    mortgagePayment,
    monthlyCashflowCurrent,
    monthlyCashflowMarket,
    annualCashflowCurrent,
    annualCashflowMarket,
    roi,
  };
}
