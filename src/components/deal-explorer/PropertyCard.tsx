'use client';

import Image from 'next/image';
import { Heart, StickyNote, BedDouble, Bath, ExternalLink } from 'lucide-react';
import { cn, formatCurrency, formatBedBath, cashflowColor } from '@/lib/utils';
import { computeFinancials } from '@/lib/calculations';
import { useAssumptions } from '@/context/AssumptionsContext';
import type { PropertyListItem } from '@/types';
import Badge from '@/components/ui/Badge';

interface PropertyCardProps {
  property: PropertyListItem;
  onSelect: (p: PropertyListItem) => void;
  onToggleFavorite?: (p: PropertyListItem) => void;
}

export default function PropertyCard({ property, onSelect, onToggleFavorite }: PropertyCardProps) {
  const { assumptions } = useAssumptions();

  // Use live financial calc with master assumptions if FMR available
  const cashflow = property.fmr
    ? computeFinancials(property.listPrice, property.fmr, property.propTaxes, assumptions).monthlyCashflow
    : property.cashFlow ?? 0;

  const img = property.primaryImageUrl ?? property.imageUrls?.[0];

  return (
    <div
      className="group bg-white rounded-lg border border-[var(--border)] overflow-hidden hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col"
      onClick={() => onSelect(property)}
    >
      {/* Photo */}
      <div className="relative h-44 bg-slate-100 overflow-hidden shrink-0">
        {img ? (
          <Image
            src={img}
            alt={property.address}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, 300px"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
          </div>
        )}
        {/* Status badge */}
        <div className="absolute top-2 left-2">
          <Badge variant="blue">For Sale</Badge>
        </div>
        {/* Favorite button */}
        <button
          className={cn(
            'absolute top-2 right-2 p-1.5 rounded-full transition-all',
            property.isFavorite
              ? 'bg-red-500 text-white'
              : 'bg-white/80 text-slate-500 hover:text-red-500 hover:bg-white'
          )}
          onClick={e => {
            e.stopPropagation();
            onToggleFavorite?.(property);
          }}
        >
          <Heart className={cn('w-3.5 h-3.5', property.isFavorite && 'fill-current')} />
        </button>
        {/* Note indicator */}
        {property.hasNotes && (
          <div className="absolute bottom-2 right-2 bg-amber-400/90 text-white p-1 rounded-full">
            <StickyNote className="w-3 h-3" />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        {/* Price */}
        <div className="flex items-center justify-between">
          <span className="font-bold text-base text-[var(--foreground)]">
            {formatCurrency(property.listPrice)}
          </span>
          {property.zillowUrl && (
            <a
              href={property.zillowUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
              onClick={e => e.stopPropagation()}
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {/* Address */}
        <p className="text-xs text-[var(--muted-foreground)] leading-tight line-clamp-2">
          {property.address}
        </p>

        {/* Beds/baths */}
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span className="flex items-center gap-1">
            <BedDouble className="w-3.5 h-3.5" />
            {property.bedrooms ?? '—'}bd
          </span>
          <span className="flex items-center gap-1">
            <Bath className="w-3.5 h-3.5" />
            {property.bathrooms ?? '—'}ba
          </span>
          {property.sqft && (
            <span className="text-[var(--muted-foreground)]">
              {property.sqft.toLocaleString()} sqft
            </span>
          )}
        </div>

        {/* Financial metrics row */}
        <div className="mt-auto pt-2 border-t border-[var(--border)] grid grid-cols-3 gap-1">
          <MetricMini
            label="Cashflow"
            value={formatCurrency(cashflow)}
            valueClass={cashflowColor(cashflow)}
          />
          <MetricMini
            label="FMR"
            value={property.fmr ? formatCurrency(property.fmr) : '—'}
          />
          <MetricMini
            label="Est. Pmt"
            value={property.mortgage ? formatCurrency(property.mortgage) : '—'}
            valueClass="text-red-500"
          />
        </div>
      </div>
    </div>
  );
}

function MetricMini({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <span className={cn('text-xs font-semibold', valueClass ?? 'text-[var(--foreground)]')}>
        {value}
      </span>
      <span className="text-[10px] text-[var(--muted-foreground)]">{label}</span>
    </div>
  );
}
