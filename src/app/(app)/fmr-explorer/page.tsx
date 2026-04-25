'use client';

import { useState, useEffect, useMemo } from 'react';
import { List, Map as MapIcon, ArrowUpDown } from 'lucide-react';
import type { FMRData } from '@/types';
import { formatCurrency, formatNumber, cn } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Select from '@/components/ui/Select';
import { createClient } from '@/lib/supabase/client';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
];

type SortKey = 'fmrPriceRatio' | 'twoBr' | 'activeListings' | 'medianListPrice';
type ViewMode = 'list' | 'map';

export default function FMRExplorerPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [fmrRows, setFmrRows] = useState<FMRData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedState, setSelectedState] = useState('TX');
  const [sortKey, setSortKey] = useState<SortKey>('twoBr');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const supabase = createClient();

  useEffect(() => {
    loadFMR(selectedState);
  }, [selectedState]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadFMR(state: string) {
    setIsLoading(true);
    try {
      // First try Supabase cache
      const { data: cached } = await supabase
        .from('fmr_data')
        .select('*')
        .eq('state', state);

      if (cached?.length) {
        setFmrRows(cached.map(mapRow));
        return;
      }

      // Fall back to HUD API
      const res = await fetch(`/api/fmr?state=${state}`);
      const json = await res.json();
      const rows: FMRData[] = (json.data ?? []).map((d: Record<string, unknown>) => ({
        countyFips: d.fips_code ?? d.countyFips ?? '',
        countyName: d.areaname ?? d.countyName ?? '',
        state,
        year: d.year ?? new Date().getFullYear(),
        efficiency: Number(d.Efficiency ?? d.efficiency ?? 0),
        oneBr: Number(d['One-Bedroom'] ?? d.oneBr ?? 0),
        twoBr: Number(d['Two-Bedroom'] ?? d.twoBr ?? 0),
        threeBr: Number(d['Three-Bedroom'] ?? d.threeBr ?? 0),
        fourBr: Number(d['Four-Bedroom'] ?? d.fourBr ?? 0),
      }));
      setFmrRows(rows);
    } finally {
      setIsLoading(false);
    }
  }

  const mapRow = (d: Record<string, unknown>): FMRData => ({
    countyFips: String(d.county_fips ?? ''),
    countyName: String(d.county_name ?? ''),
    state: String(d.state ?? ''),
    year: Number(d.year ?? 0),
    efficiency: Number(d.efficiency ?? 0),
    oneBr: Number(d.one_br ?? 0),
    twoBr: Number(d.two_br ?? 0),
    threeBr: Number(d.three_br ?? 0),
    fourBr: Number(d.four_br ?? 0),
    population: Number(d.population ?? 0) || undefined,
  });

  const sorted = useMemo(() => {
    return [...fmrRows].sort((a, b) => {
      const aVal = Number(a[sortKey] ?? 0);
      const bVal = Number(b[sortKey] ?? 0);
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });
  }, [fmrRows, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const stateOptions = US_STATES.map(s => ({ value: s, label: s }));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-[var(--border)] px-4 py-3 flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-base font-bold text-[var(--foreground)]">FMR Explorer</h1>
          <p className="text-xs text-[var(--muted-foreground)]">
            HUD Fair Market Rents by county
          </p>
        </div>
        <div className="w-24">
          <Select
            options={stateOptions}
            value={selectedState}
            onChange={e => setSelectedState(e.target.value)}
          />
        </div>
        <div className="ml-auto flex items-center gap-1 border border-[var(--border)] rounded-lg p-0.5 bg-slate-50">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5',
              viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
            )}
          >
            <List className="w-3.5 h-3.5" />
            List
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5',
              viewMode === 'map' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
            )}
          >
            <MapIcon className="w-3.5 h-3.5" />
            Map
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {isLoading && (
          <div className="flex justify-center py-16">
            <Spinner size="lg" className="text-blue-600" />
          </div>
        )}

        {!isLoading && viewMode === 'list' && (
          <div className="h-full overflow-y-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 bg-slate-50 z-10 border-b border-[var(--border)]">
                <tr>
                  <SortHeader label="County" col="countyName" sortKey={sortKey} sortDir={sortDir} onClick={() => {}} />
                  <SortHeader label="Efficiency" col={null} sortKey={sortKey} sortDir={sortDir} onClick={() => {}} />
                  <SortHeader label="1BR" col={null} sortKey={sortKey} sortDir={sortDir} onClick={() => {}} />
                  <SortHeader label="2BR FMR" col="twoBr" sortKey={sortKey} sortDir={sortDir} onClick={() => toggleSort('twoBr')} />
                  <SortHeader label="3BR" col={null} sortKey={sortKey} sortDir={sortDir} onClick={() => {}} />
                  <SortHeader label="4BR" col={null} sortKey={sortKey} sortDir={sortDir} onClick={() => {}} />
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, i) => (
                  <tr
                    key={row.countyFips || i}
                    className={cn(
                      'border-b border-[var(--border)] text-xs',
                      i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                    )}
                  >
                    <td className="px-4 py-2.5 font-medium text-[var(--foreground)]">
                      {row.countyName || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-[var(--muted-foreground)]">
                      {formatCurrency(row.efficiency)}
                    </td>
                    <td className="px-4 py-2.5 text-[var(--muted-foreground)]">
                      {formatCurrency(row.oneBr)}
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-blue-700">
                      {formatCurrency(row.twoBr)}
                    </td>
                    <td className="px-4 py-2.5 text-[var(--muted-foreground)]">
                      {formatCurrency(row.threeBr)}
                    </td>
                    <td className="px-4 py-2.5 text-[var(--muted-foreground)]">
                      {formatCurrency(row.fourBr)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sorted.length === 0 && (
              <div className="text-center py-12 text-sm text-[var(--muted-foreground)]">
                No FMR data available for {selectedState}.
                <br />
                <span className="text-xs">HUD API token may not be configured.</span>
              </div>
            )}
          </div>
        )}

        {!isLoading && viewMode === 'map' && (
          <div className="flex items-center justify-center h-full flex-col gap-3 text-[var(--muted-foreground)]">
            <MapIcon className="w-12 h-12 opacity-30" />
            <p className="text-sm font-medium">County choropleth map</p>
            <p className="text-xs text-center max-w-xs">
              Coming soon — will show US counties color-coded by FMR-to-price ratio (profitability)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function SortHeader({
  label,
  col,
  sortKey,
  sortDir,
  onClick,
}: {
  label: string;
  col: string | null;
  sortKey: string;
  sortDir: 'asc' | 'desc';
  onClick: () => void;
}) {
  const active = col && col === sortKey;
  return (
    <th
      onClick={col ? onClick : undefined}
      className={cn(
        'px-4 py-2.5 text-left text-xs font-semibold text-[var(--muted-foreground)] whitespace-nowrap',
        col && 'cursor-pointer hover:text-[var(--foreground)]',
        active && 'text-blue-600'
      )}
    >
      <span className="flex items-center gap-1">
        {label}
        {col && <ArrowUpDown className="w-3 h-3" />}
      </span>
    </th>
  );
}
