import { NextRequest, NextResponse } from 'next/server';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY ?? '';
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST ?? 'real-time-real-estate-data.p.rapidapi.com';

/**
 * GET /api/debug?location=Houston%2C+TX
 * Returns the raw RapidAPI response so we can see the exact structure.
 * Remove this file once the field names are confirmed.
 */
export async function GET(req: NextRequest) {
  const location = req.nextUrl.searchParams.get('location') ?? 'Houston, TX';

  const params = new URLSearchParams({
    location,
    listing_type: 'for_sale',
    page: '1',
  });

  const url = `https://${RAPIDAPI_HOST}/search?${params}`;

  try {
    const res = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
    });

    const text = await res.text();
    let json: unknown;
    try { json = JSON.parse(text); } catch { json = text; }

    return NextResponse.json({
      status: res.status,
      ok: res.ok,
      url,
      // Show top-level keys + first result structure
      topLevelKeys: typeof json === 'object' && json !== null ? Object.keys(json as object) : [],
      raw: json,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
