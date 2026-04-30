import { NextRequest, NextResponse } from 'next/server';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY ?? '';
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST ?? 'real-time-real-estate-data.p.rapidapi.com';
const HUD_TOKEN = process.env.HUD_API_TOKEN ?? '';

// ── HUD FMR helpers ──────────────────────────────────────────────────────────

/** Fetch HUD FMR state data; returns map of lowercase entityname → { fmr_0..4 } */
async function fetchHudFmr(state: string): Promise<Map<string, Record<string, number>>> {
  if (!HUD_TOKEN || HUD_TOKEN.startsWith('YOUR_')) return new Map();
  try {
    const year = new Date().getFullYear();
    const url = `https://www.huduser.gov/hudapi/public/fmr/statedata/${state.toUpperCase()}?year=${year}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${HUD_TOKEN}` },
      next: { revalidate: 86400 * 30 },
    });
    if (!res.ok) return new Map();
    const json = await res.json();
    const map = new Map<string, Record<string, number>>();
    for (const item of (json?.data ?? [])) {
      const key = String(item.smallareaname ?? item.countyname ?? '').toLowerCase();
      if (key) map.set(key, item as Record<string, number>);
    }
    return map;
  } catch {
    return new Map();
  }
}

/** Pick the right HUD FMR bedroom bucket */
function hudFmrForBeds(row: Record<string, number>, beds: number): number {
  const b = Math.min(Math.max(beds, 0), 4);
  return Number(row[`fmr_${b}`] ?? row['fmr_2'] ?? 0);
}

// Pages to fetch in parallel per request (41 results/page × 15 pages = ~615 results)
const PAGES_PER_FETCH = 15;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const state        = searchParams.get('state') ?? '';
  const county       = searchParams.get('county') ?? '';
  const city         = searchParams.get('city') ?? '';
  const priceMin     = searchParams.get('priceMin') ?? '';
  const priceMax     = searchParams.get('priceMax') ?? '';
  const beds         = searchParams.get('beds') ?? '';           // exact count now
  const bedsMax      = searchParams.get('bedsMax') ?? '';        // for "5+" = bedsMax omitted
  const cashflowMin  = searchParams.get('cashflowMin') ?? '';
  const startPage    = parseInt(searchParams.get('page') ?? '1'); // batch offset (1, 2, 3…)

  if (!state) {
    return NextResponse.json({ error: 'state is required' }, { status: 400 });
  }

  if (!RAPIDAPI_KEY || RAPIDAPI_KEY === 'YOUR_RAPIDAPI_KEY_HERE') {
    return NextResponse.json(
      { error: 'RAPIDAPI_KEY not configured', properties: [], totalCount: 0 },
      { status: 200 }
    );
  }

  const locationParts = [city, county, state].filter(Boolean).join(', ');

  // Build shared params
  const makeParams = (listingType: string, page: number) => {
    const p = new URLSearchParams({
      location: locationParts,
      listing_type: listingType,
      page: String(page),
      sort_by: 'price_low_to_high',
    });
    if (priceMin && priceMin !== '0') p.set('price_min', priceMin);
    if (priceMax) p.set('price_max', priceMax);
    // Exact bedroom match: beds='' means Any; beds='0' means Studio; beds='5' means 5+
    if (beds !== '') {
      p.set('bedrooms_min', beds);
      if (bedsMax) p.set('bedrooms_max', bedsMax);
    }
    return p;
  };

  const fetchPage = async (listingType: string, page: number) => {
    const url = `https://${RAPIDAPI_HOST}/search?${makeParams(listingType, page)}`;
    try {
      const res = await fetch(url, {
        headers: {
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': RAPIDAPI_HOST,
        },
        next: { revalidate: 3600 },
      });
      const json = await res.json();
      if (json?.status === 'ERROR') return { listings: [], total: 0 };
      return {
        listings: (json?.data ?? []) as Record<string, unknown>[],
        total: json?.total_count ?? json?.totalResultCount ?? 0,
      };
    } catch {
      return { listings: [], total: 0 };
    }
  };

  try {
    // Fetch PAGES_PER_FETCH pages for each listing type in parallel
    const agentPages  = Array.from({ length: PAGES_PER_FETCH }, (_, i) => startPage + i);
    const ownerPages  = Array.from({ length: PAGES_PER_FETCH }, (_, i) => startPage + i);

    const [agentResults, ownerResults] = await Promise.all([
      Promise.all(agentPages.map(p => fetchPage('BY_AGENT', p))),
      Promise.all(ownerPages.map(p => fetchPage('BY_OWNER_OTHER', p))),
    ]);

    const agentListings  = agentResults.flatMap(r => r.listings);
    const ownerListings  = ownerResults.flatMap(r => r.listings);
    const agentTotal     = agentResults[0]?.total ?? 0;
    const ownerTotal     = ownerResults[0]?.total ?? 0;

    // Deduplicate by zpid
    const seen = new Set<string>();
    const combined = [...agentListings, ...ownerListings].filter(p => {
      const id = String(p.zpid ?? p.id ?? Math.random());
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    let properties = combined.map(normalizeProperty);

    // ── Client-side price filter (API params may be silently ignored) ─────────
    const numPriceMin = priceMin ? Number(priceMin) : 0;
    const numPriceMax = priceMax ? Number(priceMax) : Infinity;
    if (numPriceMin > 0 || numPriceMax < Infinity) {
      properties = properties.filter(p =>
        p.listPrice >= numPriceMin && p.listPrice <= numPriceMax
      );
    }

    // ── Cashflow min filter (estimated using default assumptions) ─────────────
    if (cashflowMin) {
      const minCF = Number(cashflowMin);
      // Simple mortgage: 80% LTV, 7% rate, 30yr (default assumptions)
      const estimateCashflow = (price: number, fmr?: number) => {
        if (!fmr) return null; // can't compute without FMR
        const principal = price * 0.80;
        const monthlyRate = 0.07 / 12;
        const n = 360;
        const mortgage = principal * (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
        const expenses = fmr * 0.10 + 100 + fmr * 0.05 + fmr * 0.05; // mgmt + insurance + vacancy + maint
        return fmr - mortgage - expenses;
      };
      properties = properties.filter(p => {
        const cf = estimateCashflow(p.listPrice, p.fmr);
        return cf === null || cf >= minCF; // keep if no FMR (can't filter) or meets threshold
      });
    }

    // ── HUD FMR fallback for properties missing rentZestimate ────────────────
    const missingFmr = properties.some(p => !p.fmr);
    if (missingFmr && state) {
      const hudMap = await fetchHudFmr(state);
      if (hudMap.size > 0) {
        for (const prop of properties) {
          if (prop.fmr) continue;
          // Try to match by city or county name
          const cityKey  = prop.city?.toLowerCase() ?? '';
          const stateKey = prop.state?.toLowerCase() ?? '';
          const match =
            hudMap.get(cityKey) ??
            hudMap.get(`${cityKey}, ${stateKey}`) ??
            // fallback: first entry (state-level baseline)
            hudMap.values().next().value;
          if (match) {
            prop.fmr = hudFmrForBeds(match as Record<string, number>, prop.bedrooms ?? 2) || undefined;
          }
        }
      }
    }

    // Use API-reported total when available; fall back to actual result count
    const reportedTotal = agentTotal + ownerTotal;
    return NextResponse.json({
      properties,
      totalCount: reportedTotal > 0 ? reportedTotal : properties.length,
      page: startPage,
      pagesPerFetch: PAGES_PER_FETCH,
    });
  } catch (err) {
    console.error('Properties API error:', err);
    return NextResponse.json(
      { error: 'Internal error', properties: [], totalCount: 0 },
      { status: 500 }
    );
  }
}

function normalizeProperty(p: Record<string, unknown>) {
  const address = (
    p.address ??
    [p.streetAddress, p.city, p.state, p.zipcode].filter(Boolean).join(', ')
  ) as string;

  const latLong = p.latLong as Record<string, number> | undefined;

  return {
    id: p.zpid ?? p.id,
    zpid: String(p.zpid ?? ''),
    address,
    city: (p.city ?? '') as string,
    state: (p.state ?? '') as string,
    zipCode: String(p.zipcode ?? ''),
    listPrice: Number(p.price ?? p.unformattedPrice ?? 0),
    bedrooms: Number(p.bedrooms ?? p.beds ?? 0),
    bathrooms: Number(p.bathrooms ?? p.baths ?? 0),
    sqft: Number(p.livingArea ?? p.area ?? 0) || undefined,
    yearBuilt: Number(p.yearBuilt ?? 0) || undefined,
    primaryImageUrl: (p.imgSrc ?? '') as string,
    status: 'FOR_SALE' as const,
    latitude: Number(p.latitude ?? latLong?.latitude ?? 0) || undefined,
    longitude: Number(p.longitude ?? latLong?.longitude ?? 0) || undefined,
    daysOnMarket: Number(p.daysOnZillow ?? p.daysOnMarket ?? 0) || undefined,
    zillowUrl: (p.detailUrl ?? '') as string,
    // rentZestimate = Zillow's free rent estimate, used as FMR proxy
    fmr: Number(p.rentZestimate ?? 0) || undefined,
    isSellerFinanceAvailable: String(p.listingSubType ?? '').includes('FSBO'),
    listingType: p.statusText as string ?? '',
  };
}
