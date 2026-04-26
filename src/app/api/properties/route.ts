import { NextRequest, NextResponse } from 'next/server';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY ?? '';
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST ?? 'real-time-real-estate-data.p.rapidapi.com';

/**
 * GET /api/properties
 * Query params: state, county, city, priceMin, priceMax, beds, page, limit
 *
 * Uses RapidAPI "Real-Time Real-Estate Data" by OpenWeb Ninja.
 * Endpoint: GET /search
 * Docs: https://rapidapi.com/openwebninaapi/api/real-time-real-estate-data
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const state    = searchParams.get('state') ?? '';
  const county   = searchParams.get('county') ?? '';
  const city     = searchParams.get('city') ?? '';
  const priceMin = searchParams.get('priceMin') ?? '';
  const priceMax = searchParams.get('priceMax') ?? '';
  const beds     = searchParams.get('beds') ?? '';
  const page     = parseInt(searchParams.get('page') ?? '1');

  if (!state) {
    return NextResponse.json({ error: 'state is required' }, { status: 400 });
  }

  if (!RAPIDAPI_KEY || RAPIDAPI_KEY === 'YOUR_RAPIDAPI_KEY_HERE') {
    return NextResponse.json(
      { error: 'RAPIDAPI_KEY not configured', properties: [], totalCount: 0 },
      { status: 200 }
    );
  }

  try {
    // Build location string — most specific first
    const locationParts = [city, county, state].filter(Boolean).join(', ');

    const params = new URLSearchParams({
      location: locationParts,
      listing_type: 'for_sale',
      page: String(page),
      sort_by: 'price_low_to_high',
    });

    if (priceMin && priceMin !== '0') params.set('price_min', priceMin);
    if (priceMax) params.set('price_max', priceMax);
    if (beds) params.set('bedrooms_min', beds);

    // Correct endpoint: /search (not /search-properties)
    const url = `https://${RAPIDAPI_HOST}/search?${params.toString()}`;

    const res = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('RapidAPI /search error:', res.status, text);
      return NextResponse.json(
        { error: `Upstream error ${res.status}`, properties: [], totalCount: 0 },
        { status: 200 }
      );
    }

    const raw = await res.json();

    // OpenWeb Ninja wraps results in `data` array
    const listings = (raw?.data ?? raw?.properties ?? raw?.results ?? []) as Record<string, unknown>[];

    const properties = listings.map(normalizeProperty);

    return NextResponse.json({
      properties,
      totalCount: raw?.total_count ?? raw?.totalCount ?? listings.length,
      page,
    });
  } catch (err) {
    console.error('Properties API error:', err);
    return NextResponse.json(
      { error: 'Internal error', properties: [], totalCount: 0 },
      { status: 500 }
    );
  }
}

// Normalize OpenWeb Ninja property → our PropertyListItem shape
// Field names from their documented response schema
function normalizeProperty(p: Record<string, unknown>) {
  const address = [
    p.full_address ?? [p.street, p.city, p.state, p.zip_code].filter(Boolean).join(', ')
  ][0] as string ?? '';

  return {
    id: p.property_id ?? p.zpid ?? p.id,
    zpid: String(p.zpid ?? p.property_id ?? ''),
    address,
    city: (p.city ?? '') as string,
    state: (p.state ?? '') as string,
    zipCode: String(p.zip_code ?? p.zipcode ?? ''),
    listPrice: Number(p.list_price ?? p.price ?? 0),
    bedrooms: Number(p.beds ?? p.bedrooms ?? 0),
    bathrooms: Number(p.baths ?? p.bathrooms ?? 0),
    sqft: Number(p.sqft ?? p.living_area ?? 0) || undefined,
    yearBuilt: Number(p.year_built ?? p.yearBuilt ?? 0) || undefined,
    primaryImageUrl: (p.primary_photo ?? p.imgSrc ?? '') as string,
    imageUrls: Array.isArray(p.photos) ? (p.photos as string[]) : undefined,
    status: 'FOR_SALE' as const,
    latitude: Number(p.latitude ?? p.lat ?? 0) || undefined,
    longitude: Number(p.longitude ?? p.lng ?? p.lon ?? 0) || undefined,
    daysOnMarket: Number(p.days_on_market ?? p.daysOnMarket ?? 0) || undefined,
    zillowUrl: (p.permalink ?? p.detail_url ?? p.detailUrl ?? '') as string,
    isSellerFinanceAvailable: Boolean(p.seller_financed ?? false),
  };
}
