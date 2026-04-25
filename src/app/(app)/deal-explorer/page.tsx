'use client';

import { useState, useCallback } from 'react';
import { LayoutGrid, List, Map, Loader2 } from 'lucide-react';
import type { PropertyListItem, SearchFilters, ViewMode } from '@/types';
import { useProperties } from '@/hooks/useProperties';
import { useUserMeta } from '@/hooks/useUserMeta';
import SearchFiltersPanel from '@/components/deal-explorer/SearchFilters';
import PropertyCard from '@/components/deal-explorer/PropertyCard';
import PropertyTableView from '@/components/deal-explorer/PropertyTableView';
import PropertyMapView from '@/components/deal-explorer/PropertyMapView';
import PropertyModal from '@/components/property-modal/PropertyModal';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export default function DealExplorerPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedProperty, setSelectedProperty] = useState<PropertyListItem | null>(null);
  const { properties, totalCount, isLoading, error, search, loadMore, hasMore } = useProperties();
  const { toggleFavorite } = useUserMeta();
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(
    async (filters: SearchFilters) => {
      setHasSearched(true);
      await search(filters);
    },
    [search]
  );

  const handleToggleFavorite = useCallback(
    async (p: PropertyListItem) => {
      await toggleFavorite(Number(p.id), p.isFavorite ?? false);
    },
    [toggleFavorite]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <SearchFiltersPanel onSearch={handleSearch} isLoading={isLoading} />

      {/* View mode + result count bar */}
      {hasSearched && (
        <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-[var(--border)] shrink-0">
          <span className="text-sm text-[var(--muted-foreground)]">
            {isLoading ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-4 h-4 animate-spin" /> Searching…
              </span>
            ) : (
              <>
                <strong className="text-[var(--foreground)]">{totalCount.toLocaleString()}</strong> properties
                {properties.length < totalCount && ` · showing ${properties.length}`}
              </>
            )}
          </span>
          <div className="flex items-center gap-1 border border-[var(--border)] rounded-lg p-0.5 bg-slate-50">
            <ViewBtn mode="grid" current={viewMode} label="Grid" icon={<LayoutGrid className="w-4 h-4" />} onClick={() => setViewMode('grid')} />
            <ViewBtn mode="table" current={viewMode} label="Table" icon={<List className="w-4 h-4" />} onClick={() => setViewMode('table')} />
            <ViewBtn mode="map" current={viewMode} label="Map" icon={<Map className="w-4 h-4" />} onClick={() => setViewMode('map')} />
          </div>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {/* Error */}
        {error && (
          <div className="m-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Empty state */}
        {!hasSearched && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-[var(--foreground)]">Find Section 8 Deals</p>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                Select a state to start searching 290,000+ properties
              </p>
            </div>
          </div>
        )}

        {/* No results */}
        {hasSearched && !isLoading && properties.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <p className="font-medium text-[var(--foreground)]">No properties found</p>
            <p className="text-sm text-[var(--muted-foreground)]">Try a different location or adjust your filters</p>
          </div>
        )}

        {/* Grid view */}
        {viewMode === 'grid' && properties.length > 0 && (
          <div className="h-full overflow-y-auto p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {properties.map(p => (
                <PropertyCard
                  key={p.id}
                  property={p}
                  onSelect={setSelectedProperty}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
            {hasMore && (
              <div className="mt-6 flex justify-center">
                <Button variant="outline" onClick={loadMore} loading={isLoading}>
                  Load More
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Table view */}
        {viewMode === 'table' && properties.length > 0 && (
          <PropertyTableView
            properties={properties}
            onSelect={setSelectedProperty}
            onToggleFavorite={handleToggleFavorite}
          />
        )}

        {/* Map view */}
        {viewMode === 'map' && (
          <PropertyMapView
            properties={properties}
            onSelect={setSelectedProperty}
            onToggleFavorite={handleToggleFavorite}
          />
        )}
      </div>

      {/* Property detail modal */}
      {selectedProperty && (
        <PropertyModal
          propertyId={Number(selectedProperty.id)}
          listItem={selectedProperty}
          onClose={() => setSelectedProperty(null)}
        />
      )}
    </div>
  );
}

function ViewBtn({
  mode,
  current,
  label,
  icon,
  onClick,
}: {
  mode: ViewMode;
  current: ViewMode;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all',
        mode === current
          ? 'bg-white text-blue-600 shadow-sm'
          : 'text-slate-500 hover:text-slate-700'
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
