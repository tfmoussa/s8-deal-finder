'use client';

import { useState, useCallback, useRef } from 'react';
import type { PropertyListItem, SearchFilters } from '@/types';
import { createClient } from '@/lib/supabase/client';

interface UsePropertiesResult {
  properties: PropertyListItem[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  search: (filters: SearchFilters) => Promise<void>;
  loadMore: () => void;
  hasMore: boolean;
}

export function useProperties(): UsePropertiesResult {
  const [properties, setProperties] = useState<PropertyListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const currentFilters = useRef<SearchFilters>({});
  const supabase = createClient();

  const fetchUserMeta = useCallback(
    async (propertyIds: number[]) => {
      if (!propertyIds.length) return {};
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return {};

      const [favRes, noteRes, suppRes] = await Promise.all([
        supabase.from('favorite_properties').select('property_id').eq('user_id', user.id).in('property_id', propertyIds),
        supabase.from('property_notes').select('property_id').eq('user_id', user.id).in('property_id', propertyIds),
        supabase.from('suppressed_properties').select('property_id, suppressed_until').eq('user_id', user.id).in('property_id', propertyIds),
      ]);

      const favSet = new Set((favRes.data ?? []).map(r => r.property_id));
      const noteSet = new Set((noteRes.data ?? []).map(r => r.property_id));
      const suppMap = new Map(
        (suppRes.data ?? [])
          .filter(r => new Date(r.suppressed_until) > new Date())
          .map(r => [r.property_id, r.suppressed_until])
      );

      return { favSet, noteSet, suppMap };
    },
    [supabase]
  );

  const search = useCallback(async (filters: SearchFilters) => {
    currentFilters.current = filters;
    setPage(1);
    setError(null);
    setIsLoading(true);

    try {
      const params = new URLSearchParams();
      if (filters.state) params.set('state', filters.state);
      if (filters.county) params.set('county', filters.county);
      if (filters.city) params.set('city', filters.city);
      if (filters.priceMin) params.set('priceMin', String(filters.priceMin));
      if (filters.priceMax) params.set('priceMax', String(filters.priceMax));
      if (filters.bedroomsMin !== undefined) params.set('beds', String(filters.bedroomsMin));
      if (filters.bedroomsMax !== undefined) params.set('bedsMax', String(filters.bedroomsMax));
      params.set('page', '1');
      params.set('limit', '40');

      const res = await fetch(`/api/properties?${params.toString()}`);
      const json = await res.json();

      if (json.error && !json.properties) {
        setError(json.error);
        setProperties([]);
        setTotalCount(0);
        return;
      }

      const rawProps: PropertyListItem[] = json.properties ?? [];
      const ids = rawProps.map(p => Number(p.id)).filter(Boolean);
      const { favSet, noteSet, suppMap } = await fetchUserMeta(ids) as {
        favSet?: Set<number>;
        noteSet?: Set<number>;
        suppMap?: Map<number, string>;
      };

      const enriched = rawProps.map(p => ({
        ...p,
        isFavorite: favSet?.has(Number(p.id)) ?? false,
        hasNotes: noteSet?.has(Number(p.id)) ?? false,
        isSuppressed: suppMap?.has(Number(p.id)) ?? false,
        suppressedUntil: suppMap?.get(Number(p.id)) ?? null,
      }));

      // Filter out suppressed properties
      const visible = enriched.filter(p => !p.isSuppressed);

      setProperties(visible);
      setTotalCount(json.totalCount ?? visible.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [fetchUserMeta]);

  const loadMore = useCallback(async () => {
    const nextPage = page + 1;
    setPage(nextPage);
    setIsLoading(true);

    try {
      const filters = currentFilters.current;
      const params = new URLSearchParams();
      if (filters.state) params.set('state', filters.state);
      if (filters.county) params.set('county', filters.county);
      if (filters.city) params.set('city', filters.city);
      if (filters.priceMin) params.set('priceMin', String(filters.priceMin));
      if (filters.priceMax) params.set('priceMax', String(filters.priceMax));
      if (filters.bedroomsMin !== undefined) params.set('beds', String(filters.bedroomsMin));
      if (filters.bedroomsMax !== undefined) params.set('bedsMax', String(filters.bedroomsMax));
      params.set('page', String(nextPage));
      params.set('limit', '40');

      const res = await fetch(`/api/properties?${params.toString()}`);
      const json = await res.json();
      const rawProps: PropertyListItem[] = json.properties ?? [];
      const ids = rawProps.map(p => Number(p.id)).filter(Boolean);
      const { favSet, noteSet, suppMap } = await fetchUserMeta(ids) as {
        favSet?: Set<number>;
        noteSet?: Set<number>;
        suppMap?: Map<number, string>;
      };

      const enriched = rawProps.map(p => ({
        ...p,
        isFavorite: favSet?.has(Number(p.id)) ?? false,
        hasNotes: noteSet?.has(Number(p.id)) ?? false,
        isSuppressed: suppMap?.has(Number(p.id)) ?? false,
        suppressedUntil: suppMap?.get(Number(p.id)) ?? null,
      })).filter(p => !p.isSuppressed);

      setProperties(prev => [...prev, ...enriched]);
    } catch (err) {
      console.error('Load more error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, fetchUserMeta]);

  const hasMore = properties.length < totalCount;

  return { properties, totalCount, isLoading, error, search, loadMore, hasMore };
}
