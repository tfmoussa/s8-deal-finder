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
    // Confirmed param name: zpid
    const url = `https://${RAPIDAPI_HOST}/property-details?zpid=${id}`;

    const res = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
      next: { revalidate: 3600 },
    });

    const raw = await res.json();

    if (raw?.status === 'ERROR') {
      return NextResponse.json({ error: raw.error?.message ?? 'API error' }, { status: 400 });
    }

    const p: Record<string, unknown> = raw?.data ?? raw;
    const rf = (p.resoFacts ?? {}) as Record<string, unknown>;

    // address field is an object: { streetAddress, city, state, zipcode }
    const addrObj = (typeof p.address === 'object' && p.address !== null)
      ? p.address as Record<string, string>
      : null;

    const address = addrObj
      ? [addrObj.streetAddress, addrObj.city, addrObj.state, addrObj.zipcode].filter(Boolean).join(', ')
      : String(p.address ?? '');

    // Photos: array of { mixedSources: { jpeg: [{ url, width }] } }
    const photos = Array.isArray(p.photos)
      ? (p.photos as Array<Record<string, unknown>>)
          .map(ph => {
            const mixed = ph?.mixedSources as Record<string, Array<{ url: string }>> | undefined;
            return mixed?.jpeg?.[0]?.url ?? (ph?.url as string) ?? null;
          })
          .filter(Boolean) as string[]
      : [];

    // Monthly property tax from resoFacts.taxAnnualAmount
    const annualTax = Number(rf.taxAnnualAmount ?? 0);
    const propTaxesMonthly = annualTax > 0 ? annualTax / 12 : undefined;

    const detail = {
      id: p.zpid ?? id,
      zpid: String(p.zpid ?? id),
      address,
      city: (addrObj?.city ?? p.city ?? '') as string,
      state: (addrObj?.state ?? p.state ?? '') as string,
      zipCode: String(addrObj?.zipcode ?? p.zipcode ?? ''),
      listPrice: Number(p.price ?? 0),
      bedrooms: Number(p.bedrooms ?? 0),
      bathrooms: Number(p.bathrooms ?? 0),
      sqft: Number(p.livingArea ?? 0) || undefined,
      yearBuilt: Number(rf.yearBuilt ?? p.yearBuilt ?? 0) || undefined,
      primaryImageUrl: photos[0] ?? '',
      imageUrls: photos,
      status: 'FOR_SALE' as const,
      latitude: Number(p.latitude ?? 0) || undefined,
      longitude: Number(p.longitude ?? 0) || undefined,
      countyName: (addrObj?.subdivision ?? '') as string,
      propTaxes: propTaxesMonthly,
      fmr: Number(p.rentZestimate ?? 0) || undefined,
      isSellerFinanceAvailable: false,
      zillowUrl: (p.url ?? p.detailUrl ?? `https://www.zillow.com/homes/${id}_zpid/`) as string,
      daysOnMarket: Number(p.daysOnZillow ?? 0) || undefined,
    };

    return NextResponse.json(detail);
  } catch (err) {
    console.error('Property detail error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
