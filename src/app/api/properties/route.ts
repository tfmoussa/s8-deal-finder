import { NextRequest, NextResponse } from 'next/server';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY ?? '';
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST ?? 'real-time-real-estate-data.p.rapidapi.com';

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
    // Most specific location wins — city, county, or state
    const locationParts = [city, county, state].filter(Boolean).join(', ');

    const params = new URLSearchParams({
      location: locationParts,
      listing_type: 'BY_AGENT',   // confirmed: BY_AGENT | BY_OWNER_OTHER
      page: String(page),
      sort_by: 'price_low_to_high',
    });

    if (priceMin && priceMin !== '0') params.set('price_min', priceMin);
    if (priceMax) params.set('price_max', priceMax);
    if (beds) params.set('bedrooms_min', beds);

    const url = `https://${RAPIDAPI_HOST}/search?${params}`;

    const res = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
      next: { revalidate: 3600 },
    });

    const raw = await res.json();

    if (raw?.status === 'ERROR') {
      console.error('RapidAPI error:', raw.error);
      return NextResponse.json({
        error: raw.error?.message ?? 'API error',
        properties: [],
        totalCount: 0,
      });
    }

    // data is a flat array of property objects
    const listings = (raw?.data ?? []) as Record<string, unknown>[];
    const properties = listings.map(normalizeProperty);

    return NextResponse.json({
      properties,
      totalCount: raw?.total_count ?? raw?.totalResultCount ?? listings.length,
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

function normalizeProperty(p: Record<string, unknown>) {
  // address is a flat string like "123 Main St, Houston, TX 77065"
  const address = (p.address ?? [p.streetAddress, p.city, p.state, p.zipcode].filter(Boolean).join(', ')) as string;

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
    latitude: Number(p.latitude ?? (p.latLong as Record<string, unknown>)?.latitude ?? 0) || undefined,
    longitude: Number(p.longitude ?? (p.latLong as Record<string, unknown>)?.longitude ?? 0) || undefined,
    daysOnMarket: Number(p.daysOnZillow ?? p.daysOnMarket ?? 0) || undefined,
    zillowUrl: (p.detailUrl ?? '') as string,
    // rentZestimate = Zillow's free rent estimate — use as FMR proxy
    fmr: Number(p.rentZestimate ?? 0) || undefined,
    isSellerFinanceAvailable: false,
  };
}
