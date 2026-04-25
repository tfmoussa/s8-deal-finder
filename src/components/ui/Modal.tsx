'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}

export default function Modal({ open, onClose, children, title, size = 'lg', className }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className={cn(
          'relative bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden',
          size === 'sm'   && 'w-full max-w-sm max-h-[90vh]',
          size === 'md'   && 'w-full max-w-lg max-h-[90vh]',
          size === 'lg'   && 'w-full max-w-3xl max-h-[90vh]',
          size === 'xl'   && 'w-full max-w-5xl max-h-[90vh]',
          size === 'full' && 'w-[calc(100vw-2rem)] h-[calc(100vh-2rem)]',
          className
        )}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] shrink-0">
            <h2 className="text-base font-semibold text-[var(--foreground)]">{title}</h2>
            <button
              onClick={onClose}
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors p-1 rounded-md hover:bg-[var(--muted)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {!title && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 text-[var(--muted-foreground)] hover:text-[var(--foreground)] bg-white/80 hover:bg-white backdrop-blur-sm p-1.5 rounded-full shadow-sm transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
