'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SuppressionDays } from '@/types';
import { daysFromNow } from '@/lib/utils';
import toast from 'react-hot-toast';

/**
 * Hook for managing per-property user metadata:
 * favorites, notes, and suppression.
 */
export function useUserMeta() {
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());
  const supabase = createClient();

  const setLoading = (id: number, on: boolean) => {
    setLoadingIds(prev => {
      const next = new Set(prev);
      on ? next.add(id) : next.delete(id);
      return next;
    });
  };

  const toggleFavorite = useCallback(async (propertyId: number, currentValue: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Sign in to save favorites'); return false; }

    setLoading(propertyId, true);
    try {
      if (currentValue) {
        await supabase.from('favorite_properties')
          .delete()
          .eq('user_id', user.id)
          .eq('property_id', propertyId);
        return false;
      } else {
        await supabase.from('favorite_properties')
          .upsert({ user_id: user.id, property_id: propertyId }, { onConflict: 'user_id,property_id' });
        return true;
      }
    } finally {
      setLoading(propertyId, false);
    }
  }, [supabase]);

  const saveNote = useCallback(async (propertyId: number, content: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Sign in to save notes'); return; }

    await supabase.from('property_notes').upsert(
      { user_id: user.id, property_id: propertyId, content },
      { onConflict: 'user_id,property_id' }
    );
    toast.success('Note saved');
  }, [supabase]);

  const getNote = useCallback(async (propertyId: number): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return '';

    const { data } = await supabase.from('property_notes')
      .select('content')
      .eq('user_id', user.id)
      .eq('property_id', propertyId)
      .single();

    return data?.content ?? '';
  }, [supabase]);

  const suppressProperty = useCallback(async (propertyId: number, days: SuppressionDays) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Sign in to suppress properties'); return; }

    const suppressedUntil = daysFromNow(days);
    await supabase.from('suppressed_properties').upsert(
      { user_id: user.id, property_id: propertyId, suppressed_until: suppressedUntil },
      { onConflict: 'user_id,property_id' }
    );
    toast.success(`Property hidden for ${days} days`);
  }, [supabase]);

  const unsuppressProperty = useCallback(async (propertyId: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('suppressed_properties')
      .delete()
      .eq('user_id', user.id)
      .eq('property_id', propertyId);
  }, [supabase]);

  return { toggleFavorite, saveNote, getNote, suppressProperty, unsuppressProperty, loadingIds };
}
