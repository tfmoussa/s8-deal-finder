'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Search,
  Map,
  Building2,
  Calculator,
  Settings,
  ChevronDown,
  BarChart3,
  Home,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface NavItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  children?: { label: string; href: string }[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Deal Finder',
    icon: <Search className="w-4 h-4" />,
    children: [
      { label: 'Deal Explorer', href: '/deal-explorer' },
      { label: 'FMR Explorer', href: '/fmr-explorer' },
      { label: 'City Research', href: '/city-research' },
      { label: 'Property Lookup', href: '/property-lookup' },
      { label: 'Deal Calculator', href: '/deal-calculator' },
    ],
  },
];

const BOTTOM_ITEMS: NavItem[] = [
  {
    label: 'Settings',
    href: '/settings',
    icon: <Settings className="w-4 h-4" />,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<string[]>(['Deal Finder']);

  const toggleGroup = (label: string) => {
    setExpanded(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  return (
    <aside className="w-56 shrink-0 flex flex-col h-full bg-[var(--sidebar)] text-[var(--sidebar-foreground)] border-r border-[var(--sidebar-border)]">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-[var(--sidebar-border)]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
            <Home className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none">S8 Deal Finder</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Section 8 Analyzer</p>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map(item => (
          <div key={item.label}>
            {item.children ? (
              <>
                <button
                  onClick={() => toggleGroup(item.label)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-[var(--sidebar-accent)] hover:text-white transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    {item.icon}
                    {item.label}
                  </span>
                  <ChevronDown
                    className={cn(
                      'w-3.5 h-3.5 transition-transform text-slate-500',
                      expanded.includes(item.label) && 'rotate-180'
                    )}
                  />
                </button>
                {expanded.includes(item.label) && (
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l border-slate-700 pl-3">
                    {item.children.map(child => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          'block px-2 py-1.5 rounded-md text-sm transition-colors',
                          pathname === child.href || pathname.startsWith(child.href + '/')
                            ? 'bg-blue-600/20 text-blue-400 font-medium'
                            : 'text-slate-400 hover:bg-[var(--sidebar-accent)] hover:text-white'
                        )}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <Link
                href={item.href!}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                  pathname === item.href
                    ? 'bg-blue-600/20 text-blue-400 font-medium'
                    : 'text-slate-300 hover:bg-[var(--sidebar-accent)] hover:text-white'
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            )}
          </div>
        ))}
      </nav>

      {/* Bottom nav */}
      <div className="px-2 py-3 border-t border-[var(--sidebar-border)] space-y-0.5">
        {BOTTOM_ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href!}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
              pathname === item.href
                ? 'bg-blue-600/20 text-blue-400 font-medium'
                : 'text-slate-300 hover:bg-[var(--sidebar-accent)] hover:text-white'
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </div>
    </aside>
  );
}
