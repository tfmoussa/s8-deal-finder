import { NextRequest, NextResponse } from 'next/server';

const RENTCAST_KEY = process.env.RENTCAST_API_KEY ?? '';

/**
 * POST /api/market-rent
 * Body: { address: string, bedrooms: number, bathrooms: number }
 *
 * Calls RentCast /avm/rent/long-term endpoint.
 * 1 call per property. $0.20/call on Developer free tier after limit.
 */
export async function POST(req: NextRequest) {
  if (!RENTCAST_KEY || RENTCAST_KEY === 'YOUR_RENTCAST_API_KEY_HERE') {
    return NextResponse.json(
      { error: 'RENTCAST_API_KEY not configured', rentLow: null, rentAvg: null, rentHigh: null },
      { status: 200 }
    );
  }

  let body: { address?: string; bedrooms?: number; bathrooms?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { address, bedrooms, bathrooms } = body;
  if (!address) {
    return NextResponse.json({ error: 'address is required' }, { status: 400 });
  }

  try {
    const params = new URLSearchParams({ address });
    if (bedrooms != null) params.set('bedrooms', String(bedrooms));
    if (bathrooms != null) params.set('bathrooms', String(bathrooms));

    const res = await fetch(
      `https://api.rentcast.io/v1/avm/rent/long-term?${params.toString()}`,
      {
        headers: {
          accept: 'application/json',
          'X-Api-Key': RENTCAST_KEY,
        },
      }
    );

    if (!res.ok) {
      const txt = await res.text();
      console.error('RentCast error:', res.status, txt);
      return NextResponse.json(
        { error: `RentCast ${res.status}`, rentLow: null, rentAvg: null, rentHigh: null },
        { status: 200 }
      );
    }

    const data = await res.json();
    return NextResponse.json({
      rentLow:  data?.rentRangeLow  ?? null,
      rentAvg:  data?.rent          ?? null,
      rentHigh: data?.rentRangeHigh ?? null,
    });
  } catch (err) {
    console.error('Market rent error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
