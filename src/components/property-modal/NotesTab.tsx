'use client';

import { useState, useEffect } from 'react';
import { useUserMeta } from '@/hooks/useUserMeta';
import Button from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';
import Spinner from '@/components/ui/Spinner';

interface NotesTabProps {
  propertyId: number;
}

export default function NotesTab({ propertyId }: NotesTabProps) {
  const { saveNote, getNote } = useUserMeta();
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    getNote(propertyId)
      .then(text => setContent(text))
      .finally(() => setIsLoading(false));
  }, [propertyId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveNote(propertyId, content);
      setLastSaved(new Date().toISOString());
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner className="text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Property Notes</h3>
        {lastSaved && (
          <span className="text-xs text-[var(--muted-foreground)]">
            Saved {formatDate(lastSaved)}
          </span>
        )}
      </div>
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Add notes about this property — condition, neighborhood observations, deal terms, follow-up items…"
        rows={8}
        className="w-full px-3 py-2.5 text-sm border border-[var(--border)] rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
      />
      <div className="flex justify-end mt-2">
        <Button onClick={handleSave} loading={isSaving} size="sm">
          Save Note
        </Button>
      </div>
    </div>
  );
}
