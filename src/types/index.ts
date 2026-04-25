// ─────────────────────────────────────────────
// Property types (from Zillow / our cache)
// ─────────────────────────────────────────────

export interface PropertyListItem {
  id: number;
  zpid?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  listPrice: number;
  bedrooms: number;
  bathrooms: number;
  sqft?: number;
  yearBuilt?: number;
  primaryImageUrl?: string;
  imageUrls?: string[];
  status: PropertyStatus;
  latitude?: number;
  longitude?: number;
  fmr?: number;          // HUD Fair Market Rent
  mortgage?: number;     // estimated monthly mortgage (from S8Pro cache)
  cashFlow?: number;     // estimated monthly cashflow
  isFavorite?: boolean;
  hasNotes?: boolean;
  isSuppressed?: boolean;
  suppressedUntil?: string | null;
  zillowUrl?: string;
  daysOnMarket?: number;
  isSellerFinanceAvailable?: boolean;
  propTaxes?: number;
  lastUpdated?: string;
}

export interface PropertyDetail extends PropertyListItem {
  countyName?: string;
  hudAreaName?: string;
  isParsedPropTaxes?: boolean;
  isAiAnalyzeAvailable?: boolean;
  notesCount?: number;
  imageLinks?: string[];    // Zillow listing image links
  // enriched market rent (RentCast)
  marketRentLow?: number;
  marketRentAvg?: number;
  marketRentHigh?: number;
  marketRentFetched?: boolean;
}

export type PropertyStatus = 'FOR_SALE' | 'PENDING' | 'SOLD' | 'OFF_MARKET' | 'UNKNOWN';

// ─────────────────────────────────────────────
// Financial assumptions (master + per-property)
// ─────────────────────────────────────────────

export interface FinancialAssumptions {
  // Expense inputs (monthly $)
  propMgmtPct: number;       // % of rent for prop management (default 8)
  propTaxesMonthly?: number; // override — normally sourced from listing
  insuranceMonthly: number;  // default 100
  utilitiesMonthly: number;  // default 0
  vacancyReservePct: number; // % of rent (default 5)
  maintenanceReservePct: number; // % of rent (default 5)

  // Financing inputs
  downPaymentPct: number;    // default 20
  closingCostsPct: number;   // default 3
  interestRatePct: number;   // default 7
  loanTermYears: number;     // default 30

  // FMR override
  fmrPct: number;            // % of Section 8 FMR actually received (default 100)
}

export const DEFAULT_ASSUMPTIONS: FinancialAssumptions = {
  propMgmtPct: 8,
  insuranceMonthly: 100,
  utilitiesMonthly: 0,
  vacancyReservePct: 5,
  maintenanceReservePct: 5,
  downPaymentPct: 20,
  closingCostsPct: 3,
  interestRatePct: 7,
  loanTermYears: 30,
  fmrPct: 100,
};

// ─────────────────────────────────────────────
// Computed financials
// ─────────────────────────────────────────────

export interface ComputedFinancials {
  // Expense breakdown (monthly)
  propMgmtAmt: number;
  propTaxesAmt: number;
  insuranceAmt: number;
  utilitiesAmt: number;
  vacancyReserveAmt: number;
  maintenanceReserveAmt: number;
  totalOperatingExpenses: number;
  grossRent: number;          // effective FMR (= fmr * fmrPct / 100)

  // NOI
  monthlyNOI: number;
  annualNOI: number;
  capRate: number;            // %

  // Financing
  downPaymentAmt: number;
  closingCostsAmt: number;
  propertyValue: number;      // = listPrice
  ltv: number;                // %
  principal: number;          // loan amount
  mortgagePayment: number;    // monthly P&I

  // Cashflow
  monthlyCashflow: number;
  annualCashflow: number;
  annualizedROI: number;      // %

  // Market rent variant (if available)
  marketRent?: {
    low: ComputedFinancials | null;
    avg: ComputedFinancials | null;
    high: ComputedFinancials | null;
  };
}

// ─────────────────────────────────────────────
// Search / filter state
// ─────────────────────────────────────────────

export interface SearchFilters {
  state?: string;
  county?: string;
  city?: string;
  priceMin?: number;
  priceMax?: number;
  cashflowMin?: number;
  bedroomsMin?: number;
  status?: PropertyStatus | 'ALL';
  sellerFinancing?: boolean;
  showFavoritesOnly?: boolean;
  page?: number;
  pageSize?: number;
}

// ─────────────────────────────────────────────
// Notes & suppression
// ─────────────────────────────────────────────

export interface PropertyNote {
  id: string;
  propertyId: number;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export type SuppressionDays = 30 | 60 | 90;

export interface SuppressedProperty {
  propertyId: number;
  userId: string;
  suppressedUntil: string;   // ISO date
  createdAt: string;
}

// ─────────────────────────────────────────────
// FMR data
// ─────────────────────────────────────────────

export interface FMRData {
  countyFips: string;
  countyName: string;
  state: string;
  year: number;
  efficiency: number;
  oneBr: number;
  twoBr: number;
  threeBr: number;
  fourBr: number;
  medianListPrice?: number;
  avgListingAgeDays?: number;
  activeListings?: number;
  fmrPriceRatio?: number;     // twoBr FMR / median price * 1000 (proxy metric)
  population?: number;
}

// ─────────────────────────────────────────────
// Crime data (SpotCrime)
// ─────────────────────────────────────────────

export interface CrimeIncident {
  type: string;
  date: string;
  address: string;
  lat: number;
  lon: number;
}

export interface CrimeReport {
  radiusMiles: 1 | 5;
  total: number;
  byType: Record<string, { count: number; lastDate: string }>;
  incidents: CrimeIncident[];
}

// ─────────────────────────────────────────────
// City Research
// ─────────────────────────────────────────────

export type CrimeLevel = 'HIGHEST' | 'ABOVE_AVERAGE' | 'AVERAGE' | 'LOW';

export interface CityCrimeStats {
  overall: CrimeLevel;
  violent: CrimeLevel;
  property: CrimeLevel;
  murder: CrimeLevel;
  burglary: CrimeLevel;
  rape: CrimeLevel;
  larceny: CrimeLevel;
  robbery: CrimeLevel;
  motorVehicleTheft: CrimeLevel;
  assault: CrimeLevel;
  arson: CrimeLevel;
  raw?: Record<string, number>;
}

export interface CityResearchResult {
  city: string;
  state: string;
  crimeStats?: CityCrimeStats;
  fmr?: {
    efficiency: number;
    oneBr: number;
    twoBr: number;
    threeBr: number;
    fourBr: number;
  };
}

// ─────────────────────────────────────────────
// Property Lookup
// ─────────────────────────────────────────────

export interface PropertyLookupResult {
  address: string;
  bedrooms?: number;
  bathrooms?: number;
  apn?: string;
  propertySqft?: number;
  buildingSqft?: number;
  yearBuilt?: number;
  hasFireplace?: boolean;
  assessedValue?: number;
  marketValue?: number;
  taxAmount?: number;
  lastSaleDate?: string;
  lastSalePrice?: number;
  taxRateCode?: string;
  crimeStats?: CityCrimeStats;
  fmr?: {
    efficiency: number;
    oneBr: number;
    twoBr: number;
    threeBr: number;
    fourBr: number;
  };
}

// ─────────────────────────────────────────────
// Deal Calculator
// ─────────────────────────────────────────────

export interface DealCalcRow {
  id: string;
  propertyName: string;
  currentRent: number;
  marketRent: number;
  purchasePrice: number;
  downPaymentPct: number;
  interestRatePct: number;
  termYears: number;
}

// ─────────────────────────────────────────────
// View modes
// ─────────────────────────────────────────────

export type ViewMode = 'grid' | 'table' | 'map';

// ─────────────────────────────────────────────
// Supabase DB row types
// ─────────────────────────────────────────────

export interface DBUserAssumptions {
  id: string;
  user_id: string;
  assumptions: FinancialAssumptions;
  created_at: string;
  updated_at: string;
}

export interface DBPropertyNote {
  id: string;
  user_id: string;
  property_id: number;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface DBSuppressedProperty {
  id: string;
  user_id: string;
  property_id: number;
  suppressed_until: string;
  created_at: string;
}

export interface DBFavoriteProperty {
  id: string;
  user_id: string;
  property_id: number;
  created_at: string;
}

export interface DBPropertyCache {
  id: number;           // zpid / internal property ID
  data: PropertyDetail;
  fetched_at: string;
  search_state?: string;
  search_county?: string;
  search_city?: string;
}

export interface DBMarketRentCache {
  id: string;
  property_id: number;
  address: string;
  rent_low: number;
  rent_avg: number;
  rent_high: number;
  fetched_at: string;
}
