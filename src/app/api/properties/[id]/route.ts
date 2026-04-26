import { NextRequest, NextResponse } from 'next/server';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY ?? '';
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST ?? 'real-time-real-estate-data.p.rapidapi.com';

/**
 * GET /api/properties/[id]
 * Calls the /property-details endpoint from OpenWeb Ninja.
 * The [id] param is the property_id returned from /search.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!RAPIDAPI_KEY || RAPIDAPI_KEY === 'YOUR_RAPIDAPI_KEY_HERE') {
    return NextResponse.json({ error: 'RAPIDAPI_KEY not configured' }, { status: 503 });
  }

  try {
    const url = `https://${RAPIDAPI_HOST}/property-details?property_id=${id}`;

    const res = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('RapidAPI /property-details error:', res.status, text);
      return NextResponse.json({ error: `Upstream ${res.status}` }, { status: res.status });
    }

    const raw = await res.json();
    const p: Record<string, unknown> = raw?.data ?? raw;

    const address = (
      p.full_address ??
      [p.street, p.city, p.state, p.zip_code].filter(Boolean).join(', ')
    ) as string;

    // Photos: the API returns an array of photo URLs or objects
    const photos = Array.isArray(p.photos)
      ? (p.photos as Array<string | Record<string, unknown>>).map(ph =>
          typeof ph === 'string' ? ph : (ph?.href ?? ph?.url ?? ph?.src ?? '') as string
        ).filter(Boolean)
      : [];

    const detail = {
      id: p.property_id ?? id,
      zpid: String(p.zpid ?? id),
      address,
      city: (p.city ?? '') as string,
      state: (p.state ?? '') as string,
      zipCode: String(p.zip_code ?? p.zipcode ?? ''),
      listPrice: Number(p.list_price ?? p.price ?? 0),
      bedrooms: Number(p.beds ?? p.bedrooms ?? 0),
      bathrooms: Number(p.baths ?? p.bathrooms ?? 0),
      sqft: Number(p.sqft ?? p.living_area ?? 0) || undefined,
      yearBuilt: Number(p.year_built ?? p.yearBuilt ?? 0) || undefined,
      primaryImageUrl: (p.primary_photo ?? photos[0] ?? '') as string,
      imageUrls: photos,
      status: 'FOR_SALE' as const,
      latitude: Number(p.latitude ?? p.lat ?? 0) || undefined,
      longitude: Number(p.longitude ?? p.lng ?? p.lon ?? 0) || undefined,
      countyName: (p.county ?? '') as string,
      propTaxes: Number(p.annual_tax ?? 0)
        ? Number(p.annual_tax) / 12
        : undefined,
      isSellerFinanceAvailable: Boolean(p.seller_financed ?? false),
      zillowUrl: (p.permalink ?? p.detail_url ?? '') as string,
      daysOnMarket: Number(p.days_on_market ?? 0) || undefined,
    };

    return NextResponse.json(detail);
  } catch (err) {
    console.error('Property detail API error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
