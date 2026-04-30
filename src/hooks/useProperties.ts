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

function buildParams(filters: SearchFilters, startPage: number): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.state)                          params.set('state',       filters.state);
  if (filters.county)                         params.set('county',      filters.county);
  if (filters.city)                           params.set('city',        filters.city);
  if (filters.priceMin)                       params.set('priceMin',    String(filters.priceMin));
  if (filters.priceMax)                       params.set('priceMax',    String(filters.priceMax));
  if (filters.cashflowMin)                    params.set('cashflowMin', String(filters.cashflowMin));
  if (filters.bedroomsMin !== undefined)      params.set('beds',        String(filters.bedroomsMin));
  if (filters.bedroomsMax !== undefined)      params.set('bedsMax',     String(filters.bedroomsMax));
  params.set('page', String(startPage));
  return params;
}

export function useProperties(): UsePropertiesResult {
  const [properties, setProperties]   = useState<PropertyListItem[]>([]);
  const [totalCount, setTotalCount]   = useState(0);
  const [isLoading, setIsLoading]     = useState(false);
  const [error, setError]             = useState<string | null>(null);

  // Track the next batch start page (advances by pagesPerFetch each load)
  const nextStartPage    = useRef(1);
  const pagesPerFetch    = useRef(15);       // kept in sync with server constant
  const currentFilters   = useRef<SearchFilters>({});
  const seenZpids        = useRef(new Set<string>());

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

      const favSet  = new Set((favRes.data  ?? []).map(r => r.property_id));
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

  const enrich = useCallback(
    async (rawProps: PropertyListItem[]) => {
      const ids = rawProps.map(p => Number(p.id)).filter(Boolean);
      const { favSet, noteSet, suppMap } = await fetchUserMeta(ids) as {
        favSet?:  Set<number>;
        noteSet?: Set<number>;
        suppMap?: Map<number, string>;
      };

      return rawProps
        .map(p => ({
          ...p,
          isFavorite:      favSet?.has(Number(p.id))  ?? false,
          hasNotes:        noteSet?.has(Number(p.id)) ?? false,
          isSuppressed:    suppMap?.has(Number(p.id)) ?? false,
          suppressedUntil: suppMap?.get(Number(p.id)) ?? null,
        }))
        .filter(p => !p.isSuppressed);
    },
    [fetchUserMeta]
  );

  const search = useCallback(async (filters: SearchFilters) => {
    currentFilters.current = filters;
    seenZpids.current      = new Set();
    nextStartPage.current  = 1;
    setError(null);
    setIsLoading(true);

    try {
      const res  = await fetch(`/api/properties?${buildParams(filters, 1)}`);
      const json = await res.json();

      if (json.error && !json.properties) {
        setError(json.error);
        setProperties([]);
        setTotalCount(0);
        return;
      }

      // Advance the next start page by however many pages this batch covered
      const ppf = json.pagesPerFetch ?? 15;
      pagesPerFetch.current = ppf;
      nextStartPage.current = 1 + ppf;

      const rawProps: PropertyListItem[] = json.properties ?? [];
      // Track zpids so Load More can skip duplicates
      rawProps.forEach(p => seenZpids.current.add(String(p.zpid ?? p.id)));

      const visible = await enrich(rawProps);
      setProperties(visible);
      setTotalCount(json.totalCount || visible.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [enrich]);

  const loadMore = useCallback(async () => {
    const startPage = nextStartPage.current;
    setIsLoading(true);

    try {
      const filters = currentFilters.current;
      const res  = await fetch(`/api/properties?${buildParams(filters, startPage)}`);
      const json = await res.json();

      // Advance cursor
      const ppf = json.pagesPerFetch ?? pagesPerFetch.current;
      nextStartPage.current = startPage + ppf;

      const rawProps: PropertyListItem[] = json.properties ?? [];

      // Deduplicate against already-shown results
      const fresh = rawProps.filter(p => {
        const key = String(p.zpid ?? p.id);
        if (seenZpids.current.has(key)) return false;
        seenZpids.current.add(key);
        return true;
      });

      const enriched = await enrich(fresh);
      setProperties(prev => [...prev, ...enriched]);

      // Update total if API now has a better number
      if (json.totalCount) setTotalCount(json.totalCount);
    } catch (err) {
      console.error('Load more error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [enrich]);

  const hasMore = properties.length < totalCount;

  return { properties, totalCount, isLoading, error, search, loadMore, hasMore };
}
