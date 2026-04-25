'use client';

import { useState, useEffect, useCallback } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import {
  ExternalLink, Heart, MapPin, BedDouble, Bath, Ruler, CalendarDays,
  ChevronLeft, ChevronRight, Maximize2, EyeOff
} from 'lucide-react';
import type { PropertyListItem, PropertyDetail, SuppressionDays } from '@/types';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { useAssumptions } from '@/context/AssumptionsContext';
import { useUserMeta } from '@/hooks/useUserMeta';
import { computeAllFinancials } from '@/lib/calculations';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import FinancialsTab from './FinancialsTab';
import CrimeTab from './CrimeTab';
import NotesTab from './NotesTab';
import toast from 'react-hot-toast';

interface PropertyModalProps {
  propertyId: number;
  listItem: PropertyListItem;
  onClose: () => void;
}

type TabId = 'financials' | 'crime' | 'notes';

export default function PropertyModal({ propertyId, listItem, onClose }: PropertyModalProps) {
  const [detail, setDetail] = useState<PropertyDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('financials');
  const [photoIndex, setPhotoIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(listItem.isFavorite ?? false);
  const [suppressOpen, setSuppressOpen] = useState(false);
  const [marketRentLoading, setMarketRentLoading] = useState(false);
  const [marketRent, setMarketRent] = useState<{low?: number; avg?: number; high?: number} | null>(null);

  const { assumptions } = useAssumptions();
  const { toggleFavorite, suppressProperty } = useUserMeta();

  // Fetch detail
  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/properties/${propertyId}`)
      .then(r => r.json())
      .then(data => {
        // Merge list item data with fetched detail
        setDetail({ ...listItem, ...data });
      })
      .catch(() => {
        // Fall back to list item data if detail fetch fails
        setDetail(listItem as PropertyDetail);
      })
      .finally(() => setIsLoading(false));
  }, [propertyId]); // eslint-disable-line react-hooks/exhaustive-deps

  const images = detail?.imageUrls?.length
    ? detail.imageUrls
    : detail?.primaryImageUrl
    ? [detail.primaryImageUrl]
    : [];

  const handleFavorite = useCallback(async () => {
    const next = await toggleFavorite(propertyId, isFavorite);
    setIsFavorite(next);
    toast.success(next ? 'Added to favorites' : 'Removed from favorites');
  }, [propertyId, isFavorite, toggleFavorite]);

  const handleSuppress = useCallback(async (days: SuppressionDays) => {
    await suppressProperty(propertyId, days);
    setSuppressOpen(false);
    onClose();
  }, [propertyId, suppressProperty, onClose]);

  const fetchMarketRent = useCallback(async () => {
    if (!detail?.address) return;
    setMarketRentLoading(true);
    try {
      const res = await fetch('/api/market-rent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: detail.address,
          bedrooms: detail.bedrooms,
          bathrooms: detail.bathrooms,
        }),
      });
      const data = await res.json();
      if (data.rentAvg) {
        setMarketRent({ low: data.rentLow, avg: data.rentAvg, high: data.rentHigh });
        toast.success('Market rent loaded');
      } else {
        toast.error('Market rent not available for this property');
      }
    } catch {
      toast.error('Failed to fetch market rent');
    } finally {
      setMarketRentLoading(false);
    }
  }, [detail]);

  const computedFin = detail
    ? computeAllFinancials(
        detail.listPrice,
        detail.fmr ?? 0,
        detail.propTaxes,
        assumptions,
        marketRent ?? undefined
      )
    : null;

  return (
    <Modal open onClose={onClose} size="xl">
      {isLoading ? (
        <div className="flex items-center justify-center py-32">
          <Spinner size="lg" className="text-blue-600" />
        </div>
      ) : detail ? (
        <div className="flex flex-col">
          {/* Photo carousel */}
          <div className="relative h-64 bg-slate-900 shrink-0">
            {images.length > 0 ? (
              <>
                <img
                  src={images[photoIndex]}
                  alt={`Property photo ${photoIndex + 1}`}
                  className="w-full h-full object-cover"
                />
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setPhotoIndex(i => (i - 1 + images.length) % images.length)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPhotoIndex(i => (i + 1) % images.length)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
                      {photoIndex + 1} / {images.length}
                    </div>
                  </>
                )}
                <button
                  onClick={() => setLightboxOpen(true)}
                  className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full transition-colors"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500">
                No photos available
              </div>
            )}
          </div>

          {/* Lightbox */}
          <Lightbox
            open={lightboxOpen}
            close={() => setLightboxOpen(false)}
            index={photoIndex}
            slides={images.map(src => ({ src }))}
          />

          {/* Header info */}
          <div className="px-5 pt-4 pb-3 border-b border-[var(--border)]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xl font-bold">{formatCurrency(detail.listPrice)}</span>
                  <Badge variant="blue">For Sale</Badge>
                  {detail.isSellerFinanceAvailable && (
                    <Badge variant="success">Seller Financing</Badge>
                  )}
                </div>
                <p className="text-sm text-[var(--muted-foreground)] mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  {detail.address}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={handleFavorite}
                  className={cn(
                    'p-2 rounded-full border transition-all',
                    isFavorite
                      ? 'bg-red-50 border-red-200 text-red-500'
                      : 'border-[var(--border)] text-slate-400 hover:border-red-200 hover:text-red-500'
                  )}
                >
                  <Heart className={cn('w-4 h-4', isFavorite && 'fill-current')} />
                </button>
                {/* Suppression */}
                <div className="relative">
                  <button
                    onClick={() => setSuppressOpen(v => !v)}
                    className="p-2 rounded-full border border-[var(--border)] text-slate-400 hover:border-slate-300 hover:text-slate-600 transition-all"
                    title="Hide this property"
                  >
                    <EyeOff className="w-4 h-4" />
                  </button>
                  {suppressOpen && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-[var(--border)] rounded-lg shadow-lg z-10 w-36 overflow-hidden text-sm">
                      <p className="px-3 py-2 text-xs font-medium text-[var(--muted-foreground)] border-b border-[var(--border)]">
                        Hide for…
                      </p>
                      {([30, 60, 90] as SuppressionDays[]).map(days => (
                        <button
                          key={days}
                          className="block w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors"
                          onClick={() => handleSuppress(days)}
                        >
                          {days} days
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {detail.zillowUrl && (
                  <a
                    href={detail.zillowUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[var(--border)] rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Listing
                  </a>
                )}
              </div>
            </div>

            {/* Property details row */}
            <div className="flex items-center gap-4 mt-2.5 text-sm text-[var(--muted-foreground)] flex-wrap">
              {detail.yearBuilt && (
                <span className="flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5" />
                  Built {detail.yearBuilt}
                </span>
              )}
              {detail.sqft && (
                <span className="flex items-center gap-1">
                  <Ruler className="w-3.5 h-3.5" />
                  {detail.sqft.toLocaleString()} sqft
                </span>
              )}
              {detail.bedrooms != null && (
                <span className="flex items-center gap-1">
                  <BedDouble className="w-3.5 h-3.5" />
                  {detail.bedrooms} beds
                </span>
              )}
              {detail.bathrooms != null && (
                <span className="flex items-center gap-1">
                  <Bath className="w-3.5 h-3.5" />
                  {detail.bathrooms} baths
                </span>
              )}
            </div>

            {/* Summary metric cards */}
            {computedFin && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                <SummaryCard
                  label="Est. Cashflow/mo"
                  value={formatCurrency(computedFin.monthlyCashflow)}
                  valueClass={computedFin.monthlyCashflow > 0 ? 'text-emerald-600' : 'text-red-500'}
                  highlighted
                />
                <SummaryCard label="FMR" value={formatCurrency(detail.fmr)} />
                <SummaryCard
                  label="Est. Pmt/mo"
                  value={formatCurrency(computedFin.mortgagePayment)}
                  valueClass="text-red-500"
                />
                <SummaryCard label="Cap Rate" value={`${computedFin.capRate.toFixed(2)}%`} />
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[var(--border)] px-5 shrink-0">
            {(['financials', 'crime', 'notes'] as TabId[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors capitalize',
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                )}
              >
                {tab === 'crime' ? 'Criminal Analysis' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'financials' && computedFin && (
              <FinancialsTab
                detail={detail}
                computedFin={computedFin}
                onFetchMarketRent={fetchMarketRent}
                marketRentLoading={marketRentLoading}
                hasMarketRent={!!marketRent}
              />
            )}
            {activeTab === 'crime' && (
              <CrimeTab
                lat={detail.latitude}
                lon={detail.longitude}
              />
            )}
            {activeTab === 'notes' && (
              <NotesTab propertyId={propertyId} />
            )}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

function SummaryCard({
  label,
  value,
  valueClass,
  highlighted,
}: {
  label: string;
  value: string;
  valueClass?: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-lg px-3 py-2.5 border',
        highlighted ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-[var(--border)]'
      )}
    >
      <p className={cn('text-base font-bold', valueClass ?? 'text-[var(--foreground)]')}>{value}</p>
      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{label}</p>
    </div>
  );
}
