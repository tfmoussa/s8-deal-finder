import { NextRequest, NextResponse } from 'next/server';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY ?? '';
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST ?? 'real-time-real-estate-data.p.rapidapi.com';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!RAPIDAPI_KEY || RAPIDAPI_KEY === 'YOUR_RAPIDAPI_KEY_HERE') {
    return NextResponse.json({ error: 'RAPIDAPI_KEY not configured' }, { status: 503 });
  }

  try {
    const url = `https://${RAPIDAPI_HOST}/property-details?zpid=${id}`;
    const res = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Upstream ${res.status}` }, { status: res.status });
    }

    const raw = await res.json();
    const p = raw?.data ?? raw;

    const detail = {
      id: p.zpid ?? id,
      zpid: String(p.zpid ?? id),
      address: [p.streetAddress, p.city, p.state, p.zipcode].filter(Boolean).join(', '),
      city: p.city ?? '',
      state: p.state ?? '',
      zipCode: String(p.zipcode ?? ''),
      listPrice: Number(p.price ?? 0),
      bedrooms: Number(p.bedrooms ?? p.beds ?? 0),
      bathrooms: Number(p.bathrooms ?? p.baths ?? 0),
      sqft: Number(p.livingArea ?? 0) || undefined,
      yearBuilt: Number(p.yearBuilt ?? 0) || undefined,
      primaryImageUrl: p.imgSrc ?? '',
      imageUrls: (p.photos ?? []).map((photo: Record<string, unknown>) => {
        const mixed = photo?.mixedSources as Record<string, Array<{url?: string}>> | undefined;
        return mixed?.jpeg?.[0]?.url ?? (photo?.url as string) ?? null;
      }).filter(Boolean),
      status: 'FOR_SALE',
      latitude: Number(p.latitude ?? 0) || undefined,
      longitude: Number(p.longitude ?? 0) || undefined,
      countyName: p.county ?? '',
      propTaxes: Number(p.propertyTaxRate
        ? (p.price as number) * (p.propertyTaxRate as number) / 100 / 12
        : 0) || undefined,
      isSellerFinanceAvailable: false,
      zillowUrl: p.hdpUrl ? `https://www.zillow.com${p.hdpUrl}` : '',
      daysOnMarket: Number(p.daysOnMarket ?? 0) || undefined,
    };

    return NextResponse.json(detail);
  } catch (err) {
    console.error('Property detail API error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
