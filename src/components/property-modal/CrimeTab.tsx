'use client';

import { useState, useEffect } from 'react';
import type { CrimeReport } from '@/types';
import Spinner from '@/components/ui/Spinner';
import { formatDate } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';

interface CrimeTabProps {
  lat?: number;
  lon?: number;
}

const CRIME_COLORS: Record<string, string> = {
  Shooting: 'bg-red-500',
  Robbery: 'bg-red-400',
  Assault: 'bg-orange-500',
  Burglary: 'bg-amber-500',
  Theft: 'bg-yellow-500',
  'Auto Theft': 'bg-yellow-400',
  Vandalism: 'bg-blue-400',
  Other: 'bg-slate-400',
};

function crimeColor(type: string): string {
  for (const key of Object.keys(CRIME_COLORS)) {
    if (type.toLowerCase().includes(key.toLowerCase())) return CRIME_COLORS[key];
  }
  return 'bg-slate-400';
}

export default function CrimeTab({ lat, lon }: CrimeTabProps) {
  const [radius, setRadius] = useState<1 | 5>(1);
  const [report, setReport] = useState<CrimeReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lat || !lon) return;
    setIsLoading(true);
    setError(null);
    fetch(`/api/crime?lat=${lat}&lon=${lon}&radius=${radius}`)
      .then(r => r.json())
      .then(data => {
        setReport(data);
      })
      .catch(() => setError('Failed to load crime data'))
      .finally(() => setIsLoading(false));
  }, [lat, lon, radius]);

  if (!lat || !lon) {
    return (
      <div className="p-5 text-center text-[var(--muted-foreground)] text-sm">
        Location coordinates not available for this property.
      </div>
    );
  }

  return (
    <div className="p-5">
      {/* Radius toggle */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-medium text-[var(--muted-foreground)]">Radius:</span>
        {([1, 5] as const).map(r => (
          <button
            key={r}
            onClick={() => setRadius(r)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              radius === r
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {r} mile{r > 1 ? 's' : ''}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center py-8">
          <Spinner className="text-blue-600" />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {!isLoading && report && (
        <>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">
              {report.total} incidents within {radius} mile{radius > 1 ? 's' : ''}
            </h3>
          </div>

          {report.total === 0 ? (
            <div className="text-sm text-emerald-600 font-medium py-4 text-center">
              ✓ No reported crimes in this area
            </div>
          ) : (
            <div className="space-y-2">
              {Object.entries(report.byType)
                .sort(([, a], [, b]) => b.count - a.count)
                .map(([type, info]) => {
                  const maxCount = Math.max(...Object.values(report.byType).map(v => v.count));
                  const pct = (info.count / maxCount) * 100;
                  return (
                    <div key={type}>
                      <div className="flex items-center justify-between text-xs mb-0.5">
                        <span className="font-medium text-[var(--foreground)]">{type}</span>
                        <span className="text-[var(--muted-foreground)]">
                          {info.count} · Last: {formatDate(info.lastDate)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${crimeColor(type)}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
