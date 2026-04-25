import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/locations
 * Returns static US states list, or counties/cities by state using a free Census API.
 * Query: type=states | type=counties&state=TX | type=cities&state=TX&county=Harris
 */

const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' }, { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' }, { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' }, { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' }, { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' }, { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' }, { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' }, { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' }, { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
];

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const type   = searchParams.get('type') ?? 'states';
  const state  = searchParams.get('state') ?? '';
  const county = searchParams.get('county') ?? '';

  if (type === 'states') {
    return NextResponse.json({ data: US_STATES });
  }

  // Counties: use Census Geocoder API (free, no key)
  if (type === 'counties' && state) {
    try {
      const fipsRes = await fetch(
        `https://api.census.gov/data/2019/acs/acs5?get=NAME&for=county:*&in=state:*`,
        { next: { revalidate: 86400 * 30 } }
      );
      if (!fipsRes.ok) throw new Error('Census API error');
      const rows: string[][] = await fipsRes.json();
      // rows[0] = header, rest = [NAME, state_fips, county_fips]
      // Filter by state abbreviation — we need FIPS for the state
      const stateFips = STATE_FIPS[state.toUpperCase()];
      if (!stateFips) return NextResponse.json({ data: [] });

      const counties = rows.slice(1)
        .filter(row => row[1] === stateFips)
        .map(row => ({
          name: row[0].split(',')[0].replace(' County', '').replace(' Parish', '').trim(),
          fips: row[1] + row[2],
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      return NextResponse.json({ data: counties });
    } catch {
      return NextResponse.json({ data: [] });
    }
  }

  return NextResponse.json({ data: [] });
}

const STATE_FIPS: Record<string, string> = {
  AL: '01', AK: '02', AZ: '04', AR: '05', CA: '06', CO: '08', CT: '09',
  DE: '10', FL: '12', GA: '13', HI: '15', ID: '16', IL: '17', IN: '18',
  IA: '19', KS: '20', KY: '21', LA: '22', ME: '23', MD: '24', MA: '25',
  MI: '26', MN: '27', MS: '28', MO: '29', MT: '30', NE: '31', NV: '32',
  NH: '33', NJ: '34', NM: '35', NY: '36', NC: '37', ND: '38', OH: '39',
  OK: '40', OR: '41', PA: '42', RI: '44', SC: '45', SD: '46', TN: '47',
  TX: '48', UT: '49', VT: '50', VA: '51', WA: '53', WV: '54', WI: '55',
  WY: '56',
};
