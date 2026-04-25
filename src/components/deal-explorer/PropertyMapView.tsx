'use client';

import { useCallback, useState, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import type { PropertyListItem } from '@/types';
import { formatCurrency, cashflowColor } from '@/lib/utils';
import { computeFinancials } from '@/lib/calculations';
import { useAssumptions } from '@/context/AssumptionsContext';
import { Heart, ExternalLink } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };
const DEFAULT_CENTER = { lat: 39.5, lng: -98.35 };
const DEFAULT_ZOOM = 4;

interface PropertyMapViewProps {
  properties: PropertyListItem[];
  onSelect: (p: PropertyListItem) => void;
  onToggleFavorite?: (p: PropertyListItem) => void;
}

export default function PropertyMapView({
  properties,
  onSelect,
  onToggleFavorite,
}: PropertyMapViewProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
  });

  const { assumptions } = useAssumptions();
  const [selected, setSelected] = useState<PropertyListItem | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    // Auto-fit bounds to markers if we have properties
    if (properties.length > 0) {
      fitBounds(map, properties);
    }
  }, [properties]); // eslint-disable-line react-hooks/exhaustive-deps

  const fitBounds = (map: google.maps.Map, props: PropertyListItem[]) => {
    const hasCoords = props.filter(p => p.latitude && p.longitude);
    if (!hasCoords.length) return;
    const bounds = new window.google.maps.LatLngBounds();
    hasCoords.forEach(p => bounds.extend({ lat: p.latitude!, lng: p.longitude! }));
    map.fitBounds(bounds, 40);
  };

  if (loadError) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--muted-foreground)] text-sm">
        Google Maps failed to load. Check your API key.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner size="lg" className="text-blue-600" />
      </div>
    );
  }

  const mapped = properties.filter(p => p.latitude && p.longitude);

  return (
    <div className="flex-1 relative">
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        onLoad={onMapLoad}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
          zoomControlOptions: { position: 3 },
          styles: [
            { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
          ],
        }}
      >
        {mapped.map(p => (
          <Marker
            key={p.id}
            position={{ lat: p.latitude!, lng: p.longitude! }}
            onClick={() => setSelected(p)}
            icon={{
              path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
              fillColor: p.isFavorite ? '#ef4444' : '#1d4ed8',
              fillOpacity: 1,
              strokeColor: '#fff',
              strokeWeight: 1.5,
              scale: 1.4,
              anchor: new window.google.maps.Point(12, 22),
            }}
          />
        ))}

        {selected && (
          <InfoWindow
            position={{ lat: selected.latitude!, lng: selected.longitude! }}
            onCloseClick={() => setSelected(null)}
          >
            <MapInfoCard
              property={selected}
              assumptions={assumptions}
              onOpen={() => { setSelected(null); onSelect(selected); }}
              onFavorite={() => onToggleFavorite?.(selected)}
            />
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Property count */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium shadow-sm border border-[var(--border)]">
        {mapped.length} properties on map
        {mapped.length < properties.length && (
          <span className="text-[var(--muted-foreground)] ml-1">
            ({properties.length - mapped.length} without coordinates)
          </span>
        )}
      </div>
    </div>
  );
}

function MapInfoCard({
  property,
  assumptions,
  onOpen,
  onFavorite,
}: {
  property: PropertyListItem;
  assumptions: Parameters<typeof computeFinancials>[3];
  onOpen: () => void;
  onFavorite: () => void;
}) {
  const fin = property.fmr
    ? computeFinancials(property.listPrice, property.fmr, property.propTaxes, assumptions)
    : null;

  return (
    <div className="w-56 p-0 font-sans">
      {/* Photo */}
      {property.primaryImageUrl && (
        <img
          src={property.primaryImageUrl}
          alt={property.address}
          className="w-full h-28 object-cover rounded-t-md -mt-1 -mx-[1px]"
        />
      )}
      <div className="px-1 pt-1.5 pb-1">
        {/* Price + fav */}
        <div className="flex items-center justify-between">
          <span className="font-bold text-base">{formatCurrency(property.listPrice)}</span>
          <button onClick={onFavorite} className="p-0.5">
            <Heart
              className={`w-3.5 h-3.5 ${property.isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-400'}`}
            />
          </button>
        </div>
        {/* Address */}
        <p className="text-[11px] text-gray-500 leading-tight mt-0.5 line-clamp-2">
          {property.address}
        </p>
        {/* Metrics */}
        <div className="mt-1.5 grid grid-cols-3 gap-1 text-center">
          <div>
            <p className={`text-xs font-semibold ${cashflowColor(fin?.monthlyCashflow)}`}>
              {fin ? formatCurrency(fin.monthlyCashflow) : '—'}
            </p>
            <p className="text-[10px] text-gray-400">Cashflow</p>
          </div>
          <div>
            <p className="text-xs font-semibold">{formatCurrency(property.fmr)}</p>
            <p className="text-[10px] text-gray-400">FMR</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-red-500">
              {formatCurrency(property.mortgage ?? fin?.mortgagePayment)}
            </p>
            <p className="text-[10px] text-gray-400">Est. Pmt</p>
          </div>
        </div>
        {/* Beds/baths */}
        <p className="text-[11px] text-gray-500 mt-1">
          {property.bedrooms}bd / {property.bathrooms}ba
          {property.sqft ? ` · ${property.sqft.toLocaleString()} sqft` : ''}
        </p>
        {/* CTA */}
        <div className="flex items-center gap-1.5 mt-2">
          <button
            onClick={onOpen}
            className="flex-1 text-xs bg-blue-600 text-white py-1 rounded hover:bg-blue-700 transition-colors"
          >
            View Details
          </button>
          {property.zillowUrl && (
            <a
              href={property.zillowUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs border border-gray-200 px-1.5 py-1 rounded hover:bg-gray-50 flex items-center gap-0.5"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
