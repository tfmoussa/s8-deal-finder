import { NextRequest, NextResponse } from 'next/server';

const HUD_TOKEN = process.env.HUD_API_TOKEN ?? '';

/**
 * GET /api/fmr
 * Query: state (2-letter), county (optional FIPS), year (optional, default current)
 *
 * Returns HUD Fair Market Rents for a county or all counties in a state.
 * HUD API docs: https://www.huduser.gov/portal/dataset/fmr-api.html
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const state  = searchParams.get('state')?.toUpperCase() ?? '';
  const fips   = searchParams.get('fips') ?? '';
  const year   = searchParams.get('year') ?? new Date().getFullYear().toString();

  if (!state && !fips) {
    return NextResponse.json({ error: 'state or fips required' }, { status: 400 });
  }

  // If no HUD token, return empty (will use cached Supabase data)
  if (!HUD_TOKEN || HUD_TOKEN === 'YOUR_HUD_TOKEN_HERE') {
    return NextResponse.json({ data: [], message: 'HUD token not configured' });
  }

  try {
    let url: string;
    if (fips) {
      url = `https://www.huduser.gov/hudapi/public/fmr/listCounties/${fips}?year=${year}`;
    } else {
      url = `https://www.huduser.gov/hudapi/public/fmr/listStates?year=${year}`;
    }

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${HUD_TOKEN}` },
      next: { revalidate: 86400 * 30 }, // cache 30 days
    });

    if (!res.ok) {
      return NextResponse.json({ error: `HUD API error ${res.status}`, data: [] });
    }

    const json = await res.json();
    return NextResponse.json({ data: json?.data ?? json });
  } catch (err) {
    console.error('FMR API error:', err);
    return NextResponse.json({ error: 'Internal error', data: [] }, { status: 500 });
  }
}
