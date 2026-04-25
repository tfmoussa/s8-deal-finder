import { NextRequest, NextResponse } from 'next/server';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY ?? '';
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST ?? 'real-time-real-estate-data.p.rapidapi.com';

/**
 * GET /api/properties
 * Query params: state, county, city, priceMin, priceMax, beds, page, limit
 *
 * Fetches listings from RapidAPI "Real-Time Real-Estate Data" (OpenWeb Ninja).
 * Results are returned directly; caching to Supabase is handled client-side
 * via the useDealExplorer hook (to avoid server-side Supabase auth complexity).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const state   = searchParams.get('state') ?? '';
  const county  = searchParams.get('county') ?? '';
  const city    = searchParams.get('city') ?? '';
  const priceMin = searchParams.get('priceMin') ?? '0';
  const priceMax = searchParams.get('priceMax') ?? '';
  const beds    = searchParams.get('beds') ?? '';
  const page    = parseInt(searchParams.get('page') ?? '1');
  const limit   = parseInt(searchParams.get('limit') ?? '40');

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
    // Build the location query
    const locationParts = [city, county, state].filter(Boolean).join(', ');

    const params = new URLSearchParams({
      location: locationParts,
      listing_type: 'for_sale',
      page: String(page),
      sort_by: 'price_low_to_high',
    });

    if (priceMin) params.set('price_min', priceMin);
    if (priceMax) params.set('price_max', priceMax);
    if (beds) params.set('bedrooms_min', beds);

    const url = `https://${RAPIDAPI_HOST}/search-properties?${params.toString()}`;

    const res = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
      next: { revalidate: 3600 }, // cache for 1 hour at edge
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('RapidAPI error:', res.status, text);
      return NextResponse.json(
        { error: `Upstream error ${res.status}`, properties: [], totalCount: 0 },
        { status: 200 }
      );
    }

    const raw = await res.json();

    // Normalize the response — OpenWeb Ninja returns `data` array
    const listings = (raw?.data ?? raw?.properties ?? []) as Record<string, unknown>[];

    const properties = listings.slice((page - 1) * limit, page * limit).map(normalizeProperty);

    return NextResponse.json({
      properties,
      totalCount: raw?.total_count ?? listings.length,
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

// Normalize OpenWeb Ninja property to our PropertyListItem shape
function normalizeProperty(p: Record<string, unknown>) {
  return {
    id: p.zpid ?? p.property_id ?? p.id,
    zpid: String(p.zpid ?? ''),
    address: [p.streetAddress, p.city, p.state, p.zipcode].filter(Boolean).join(', '),
    city: p.city as string ?? '',
    state: p.state as string ?? '',
    zipCode: String(p.zipcode ?? ''),
    listPrice: Number(p.price ?? p.listPrice ?? 0),
    bedrooms: Number(p.bedrooms ?? p.beds ?? 0),
    bathrooms: Number(p.bathrooms ?? p.baths ?? 0),
    sqft: Number(p.livingArea ?? p.sqft ?? 0) || undefined,
    yearBuilt: Number(p.yearBuilt ?? 0) || undefined,
    primaryImageUrl: p.imgSrc as string ?? p.primary_image as string ?? '',
    status: 'FOR_SALE',
    latitude: Number(p.latitude ?? 0) || undefined,
    longitude: Number(p.longitude ?? 0) || undefined,
    daysOnMarket: Number(p.daysOnMarket ?? 0) || undefined,
    zillowUrl: p.detailUrl as string ?? '',
  };
}
