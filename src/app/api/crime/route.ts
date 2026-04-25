import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/crime
 * Query: lat, lon, radius (miles, default 1), type (optional)
 *
 * Proxies SpotCrime API — free, no key required.
 * https://api.spotcrime.com/crimes?lat=X&lon=Y&radius=0.02&key=.
 *
 * SpotCrime radius is in degrees (~0.02° ≈ 1 mile at mid-latitudes).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lat    = searchParams.get('lat');
  const lon    = searchParams.get('lon');
  const miles  = parseFloat(searchParams.get('radius') ?? '1');

  if (!lat || !lon) {
    return NextResponse.json({ error: 'lat and lon required' }, { status: 400 });
  }

  // Convert miles to degrees: ~0.0145° per mile
  const radiusDeg = (miles * 0.0145).toFixed(4);

  try {
    const url = `https://api.spotcrime.com/crimes?lat=${lat}&lon=${lon}&radius=${radiusDeg}&key=.`;
    const res = await fetch(url, {
      next: { revalidate: 3600 * 24 }, // cache 24h
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) {
      return NextResponse.json({ crimes: [], error: `SpotCrime ${res.status}` });
    }

    const json = await res.json();
    const crimes: Array<Record<string, unknown>> = json?.crimes ?? [];

    // Aggregate by type
    const byType: Record<string, { count: number; lastDate: string }> = {};
    for (const c of crimes) {
      const type = String(c.type ?? 'Unknown').trim();
      const date = String(c.date ?? '');
      if (!byType[type]) {
        byType[type] = { count: 0, lastDate: date };
      }
      byType[type].count++;
      if (date > byType[type].lastDate) byType[type].lastDate = date;
    }

    return NextResponse.json({
      total: crimes.length,
      radiusMiles: miles,
      byType,
      incidents: crimes.map(c => ({
        type: c.type,
        date: c.date,
        address: c.address,
        lat: c.lat,
        lon: c.lon,
      })),
    });
  } catch (err) {
    console.error('Crime API error:', err);
    return NextResponse.json({ crimes: [], error: 'Internal error' }, { status: 500 });
  }
}
