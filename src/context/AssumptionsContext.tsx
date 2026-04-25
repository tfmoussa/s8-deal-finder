'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { FinancialAssumptions } from '@/types';
import { DEFAULT_ASSUMPTIONS } from '@/types';
import { createClient } from '@/lib/supabase/client';

interface AssumptionsContextValue {
  assumptions: FinancialAssumptions;
  updateAssumptions: (partial: Partial<FinancialAssumptions>) => void;
  resetAssumptions: () => void;
  saveAssumptions: () => Promise<void>;
  isSaving: boolean;
  isDirty: boolean;
}

const AssumptionsContext = createContext<AssumptionsContextValue | null>(null);

export function AssumptionsProvider({ children }: { children: React.ReactNode }) {
  const [assumptions, setAssumptions] = useState<FinancialAssumptions>(DEFAULT_ASSUMPTIONS);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const supabase = createClient();

  // Load saved assumptions on mount
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_assumptions')
        .select('assumptions')
        .eq('user_id', user.id)
        .single();

      if (data?.assumptions) {
        setAssumptions({ ...DEFAULT_ASSUMPTIONS, ...data.assumptions });
      }
    }
    load();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const updateAssumptions = useCallback((partial: Partial<FinancialAssumptions>) => {
    setAssumptions(prev => ({ ...prev, ...partial }));
    setIsDirty(true);
  }, []);

  const resetAssumptions = useCallback(() => {
    setAssumptions(DEFAULT_ASSUMPTIONS);
    setIsDirty(true);
  }, []);

  const saveAssumptions = useCallback(async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      await supabase.from('user_assumptions').upsert(
        { user_id: user.id, assumptions },
        { onConflict: 'user_id' }
      );
      setIsDirty(false);
    } finally {
      setIsSaving(false);
    }
  }, [assumptions, supabase]);

  return (
    <AssumptionsContext.Provider
      value={{ assumptions, updateAssumptions, resetAssumptions, saveAssumptions, isSaving, isDirty }}
    >
      {children}
    </AssumptionsContext.Provider>
  );
}

export function useAssumptions() {
  const ctx = useContext(AssumptionsContext);
  if (!ctx) throw new Error('useAssumptions must be used inside AssumptionsProvider');
  return ctx;
}
