'use client';

import { useState } from 'react';
import { Search, AlertCircle } from 'lucide-react';
import type { CityCrimeStats, CrimeLevel } from '@/types';
import { formatCurrency, crimeLevelBg, crimeLevelColor, cn } from '@/lib/utils';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';

const CRIME_FIELDS: { key: keyof CityCrimeStats; label: string }[] = [
  { key: 'overall', label: 'Overall Crime' },
  { key: 'violent', label: 'Violent Crime' },
  { key: 'property', label: 'Property Crime' },
  { key: 'murder', label: 'Murder' },
  { key: 'rape', label: 'Rape' },
  { key: 'robbery', label: 'Robbery' },
  { key: 'assault', label: 'Assault' },
  { key: 'burglary', label: 'Burglary' },
  { key: 'larceny', label: 'Larceny' },
  { key: 'motorVehicleTheft', label: 'Motor Vehicle Theft' },
  { key: 'arson', label: 'Arson' },
];

const LEVEL_LABELS: Record<CrimeLevel, string> = {
  HIGHEST: 'Highest',
  ABOVE_AVERAGE: 'Above Average',
  AVERAGE: 'Average',
  LOW: 'Low',
};

const LEVEL_WIDTH: Record<CrimeLevel, string> = {
  HIGHEST: 'w-full',
  ABOVE_AVERAGE: 'w-3/4',
  AVERAGE: 'w-1/2',
  LOW: 'w-1/4',
};

interface SearchResult {
  city: string;
  state: string;
  crimeStats: CityCrimeStats;
  fmr?: { efficiency: number; oneBr: number; twoBr: number; threeBr: number; fourBr: number };
}

export default function CityResearchPage() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // SpotCrime geocoder — search by city name
      // For city stats, we use a geocode approach: get lat/lon for city center,
      // then aggregate SpotCrime data over a larger radius (5mi)
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const geoData = await geoRes.json();
      if (!geoData?.length) {
        setError('City not found. Try "Houston, TX" format.');
        return;
      }

      const { lat, lon, display_name } = geoData[0];
      const parts = display_name.split(', ');
      const city = parts[0];
      const state = parts[parts.length > 2 ? parts.length - 3 : parts.length - 1];

      // Fetch crime data at 5mi radius
      const crimeRes = await fetch(`/api/crime?lat=${lat}&lon=${lon}&radius=5`);
      const crimeData = await crimeRes.json();

      // Build crime stats from incident counts (simplified level scoring)
      const total: number = crimeData.total ?? 0;
      const byType: Record<string, { count: number }> = crimeData.byType ?? {};

      const crimeStats: CityCrimeStats = {
        overall: scoreLevel(total, 0, 10, 50, 200),
        violent: scoreLevel(
          (byType['Shooting']?.count ?? 0) + (byType['Robbery']?.count ?? 0) + (byType['Assault']?.count ?? 0),
          0, 2, 15, 60
        ),
        property: scoreLevel(
          (byType['Theft']?.count ?? 0) + (byType['Burglary']?.count ?? 0),
          0, 3, 20, 80
        ),
        murder: scoreLevel(byType['Shooting']?.count ?? 0, 0, 1, 5, 20),
        rape: 'LOW',
        robbery: scoreLevel(byType['Robbery']?.count ?? 0, 0, 1, 8, 30),
        assault: scoreLevel(byType['Assault']?.count ?? 0, 0, 1, 10, 40),
        burglary: scoreLevel(byType['Burglary']?.count ?? 0, 0, 1, 8, 25),
        larceny: scoreLevel(byType['Theft']?.count ?? 0, 0, 2, 15, 60),
        motorVehicleTheft: scoreLevel(byType['Auto Theft']?.count ?? 0, 0, 1, 5, 20),
        arson: scoreLevel(byType['Arson']?.count ?? 0, 0, 0, 1, 5),
        raw: Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, v.count])),
      };

      setResult({ city, state, crimeStats });
    } catch (err) {
      setError('Search failed. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[var(--foreground)]">City Research</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Search any US city for crime statistics and Section 8 rent data
        </p>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-6">
        <Input
          placeholder="Enter city, e.g. Houston, TX"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          className="flex-1"
        />
        <Button onClick={handleSearch} loading={isLoading}>
          <Search className="w-4 h-4" />
          Search
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" className="text-blue-600" />
        </div>
      )}

      {result && (
        <div className="space-y-6">
          {/* City header */}
          <div>
            <h2 className="text-lg font-bold">{result.city}</h2>
            <p className="text-sm text-[var(--muted-foreground)]">{result.state}</p>
          </div>

          {/* Crime report */}
          <div className="bg-white border border-[var(--border)] rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3">Crime Report</h3>
            <div className="space-y-3">
              {CRIME_FIELDS.map(({ key, label }) => {
                const level = result.crimeStats[key] as CrimeLevel;
                if (!level) return null;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-[var(--foreground)] font-medium">{label}</span>
                      <span className={cn('font-semibold', crimeLevelColor(level))}>
                        {LEVEL_LABELS[level]}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', crimeLevelBg(level), LEVEL_WIDTH[level])}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function scoreLevel(
  count: number,
  low: number,
  avg: number,
  aboveAvg: number,
  highest: number
): CrimeLevel {
  if (count >= highest) return 'HIGHEST';
  if (count >= aboveAvg) return 'ABOVE_AVERAGE';
  if (count >= avg) return 'AVERAGE';
  return 'LOW';
}
