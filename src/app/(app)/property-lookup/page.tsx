'use client';

import { useState } from 'react';
import { Search, MapPin, AlertCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';

interface LookupResult {
  address: string;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  yearBuilt?: number;
  assessedValue?: number;
  marketValue?: number;
  taxAmount?: number;
  lastSaleDate?: string;
  lastSalePrice?: number;
  lat?: number;
  lon?: number;
  crimeTotal?: number;
  crimeByType?: Record<string, { count: number; lastDate: string }>;
}

export default function PropertyLookupPage() {
  const [address, setAddress] = useState('');
  const [result, setResult] = useState<LookupResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLookup = async () => {
    if (!address.trim()) return;
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // Geocode the address via Nominatim (free)
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=us`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const geo = await geoRes.json();
      if (!geo?.length) {
        setError('Address not found. Try including city and state.');
        return;
      }

      const { lat, lon, display_name } = geo[0];

      // Fetch crime data in parallel
      const crimeRes = await fetch(`/api/crime?lat=${lat}&lon=${lon}&radius=1`);
      const crimeData = await crimeRes.json();

      setResult({
        address: display_name,
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        crimeTotal: crimeData.total,
        crimeByType: crimeData.byType,
      });
    } catch {
      setError('Lookup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[var(--foreground)]">Property Lookup</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Search any US address for property details and crime data
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        <Input
          placeholder="Enter address, e.g. 123 Main St, Houston TX 77001"
          value={address}
          onChange={e => setAddress(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLookup()}
          className="flex-1"
        />
        <Button onClick={handleLookup} loading={isLoading}>
          <Search className="w-4 h-4" />
          Lookup
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
        <div className="space-y-4">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-sm font-medium text-[var(--foreground)]">{result.address}</p>
          </div>

          {/* Crime stats */}
          <div className="bg-white border border-[var(--border)] rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3">Crime Report (1 mile radius)</h3>
            {result.crimeTotal === 0 ? (
              <p className="text-sm text-emerald-600">✓ No reported crimes nearby</p>
            ) : (
              <>
                <p className="text-sm text-[var(--muted-foreground)] mb-3">
                  {result.crimeTotal} incidents reported
                </p>
                {result.crimeByType && (
                  <div className="space-y-2">
                    {Object.entries(result.crimeByType)
                      .sort(([, a], [, b]) => b.count - a.count)
                      .map(([type, info]) => (
                        <div key={type} className="flex items-center justify-between text-xs">
                          <span className="text-[var(--foreground)]">{type}</span>
                          <span className="text-[var(--muted-foreground)]">
                            {info.count} incident{info.count !== 1 ? 's' : ''}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Coordinates */}
          <div className="bg-white border border-[var(--border)] rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-2">Location</h3>
            <p className="text-xs text-[var(--muted-foreground)]">
              Lat: {result.lat?.toFixed(6)}, Lon: {result.lon?.toFixed(6)}
            </p>
            {result.lat && result.lon && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${result.lat},${result.lon}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline mt-1 inline-block"
              >
                View on Google Maps →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
