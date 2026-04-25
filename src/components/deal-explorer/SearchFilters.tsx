'use client';

import { useState, useEffect } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import type { SearchFilters as Filters } from '@/types';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface SearchFiltersProps {
  onSearch: (filters: Filters) => void;
  isLoading?: boolean;
}

const BED_OPTIONS = [
  { value: '', label: 'Any' },
  { value: '1', label: '1+' },
  { value: '2', label: '2+' },
  { value: '3', label: '3+' },
  { value: '4', label: '4+' },
];

export default function SearchFilters({ onSearch, isLoading }: SearchFiltersProps) {
  const [states, setStates] = useState<{ code: string; name: string }[]>([]);
  const [counties, setCounties] = useState<{ name: string; fips: string }[]>([]);

  const [state, setState] = useState('');
  const [county, setCounty] = useState('');
  const [city, setCity] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [beds, setBeds] = useState('');
  const [cashflowMin, setCashflowMin] = useState('');
  const [sellerFinancing, setSellerFinancing] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Load states
  useEffect(() => {
    fetch('/api/locations?type=states')
      .then(r => r.json())
      .then(j => setStates(j.data ?? []));
  }, []);

  // Load counties when state changes
  useEffect(() => {
    setCounty('');
    setCounties([]);
    if (!state) return;
    fetch(`/api/locations?type=counties&state=${state}`)
      .then(r => r.json())
      .then(j => setCounties(j.data ?? []));
  }, [state]);

  const handleSearch = () => {
    onSearch({
      state: state || undefined,
      county: county || undefined,
      city: city || undefined,
      priceMin: priceMin ? Number(priceMin) : undefined,
      priceMax: priceMax ? Number(priceMax) : undefined,
      cashflowMin: cashflowMin ? Number(cashflowMin) : undefined,
      bedroomsMin: beds ? Number(beds) : undefined,
      sellerFinancing: sellerFinancing || undefined,
      showFavoritesOnly: favoritesOnly || undefined,
    });
  };

  const handleClear = () => {
    setState(''); setCounty(''); setCity('');
    setPriceMin(''); setPriceMax('');
    setBeds(''); setCashflowMin('');
    setSellerFinancing(false); setFavoritesOnly(false);
  };

  const stateOptions = states.map(s => ({ value: s.code, label: s.name }));
  const countyOptions = counties.map(c => ({ value: c.name, label: c.name }));

  return (
    <div className="bg-white border-b border-[var(--border)] px-4 py-3">
      {/* Primary filters row */}
      <div className="flex items-end gap-2 flex-wrap">
        {/* State */}
        <div className="w-36">
          <Select
            label="State"
            placeholder="Select state"
            options={stateOptions}
            value={state}
            onChange={e => setState(e.target.value)}
          />
        </div>

        {/* County */}
        <div className="w-44">
          <Select
            label="County"
            placeholder={state ? 'Select county' : '— pick state first —'}
            options={countyOptions}
            value={county}
            onChange={e => setCounty(e.target.value)}
            disabled={!state}
          />
        </div>

        {/* City */}
        <div className="w-40">
          <Input
            label="City"
            placeholder="Any city"
            value={city}
            onChange={e => setCity(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
        </div>

        {/* Beds */}
        <div className="w-24">
          <Select
            label="Beds"
            options={BED_OPTIONS}
            value={beds}
            onChange={e => setBeds(e.target.value)}
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pb-0.5">
          <Button
            onClick={handleSearch}
            loading={isLoading}
            disabled={!state}
          >
            Search
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowAdvanced(v => !v)}
            className={cn(showAdvanced && 'bg-blue-50 border-blue-300 text-blue-600')}
            title="Advanced filters"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </Button>
          {(state || county || city || priceMin || priceMax || beds) && (
            <Button variant="ghost" size="icon" onClick={handleClear} title="Clear filters">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-end gap-3 flex-wrap">
          <div className="w-32">
            <Input
              label="Price Min"
              type="number"
              placeholder="0"
              prefix="$"
              value={priceMin}
              onChange={e => setPriceMin(e.target.value)}
            />
          </div>
          <div className="w-32">
            <Input
              label="Price Max"
              type="number"
              placeholder="No limit"
              prefix="$"
              value={priceMax}
              onChange={e => setPriceMax(e.target.value)}
            />
          </div>
          <div className="w-36">
            <Input
              label="Min Cashflow (mo.)"
              type="number"
              placeholder="e.g. 200"
              prefix="$"
              value={cashflowMin}
              onChange={e => setCashflowMin(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer pb-1">
            <input
              type="checkbox"
              className="rounded"
              checked={sellerFinancing}
              onChange={e => setSellerFinancing(e.target.checked)}
            />
            Seller Financing
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer pb-1">
            <input
              type="checkbox"
              className="rounded"
              checked={favoritesOnly}
              onChange={e => setFavoritesOnly(e.target.checked)}
            />
            Favorites Only
          </label>
        </div>
      )}
    </div>
  );
}
