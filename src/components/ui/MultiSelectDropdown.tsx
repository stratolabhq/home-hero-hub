'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

interface MultiSelectDropdownProps {
  /** All selectable option values (e.g. the distinct product categories). */
  options: string[];
  /** Currently selected values. Empty array = the "all" state. */
  selected: string[];
  /** Called with the next selection. Empty array clears to the "all" state. */
  onChange: (next: string[]) => void;
  /** Label for the clear-all option / collapsed empty state (e.g. "All categories"). */
  allLabel: string;
  /** Plural noun used in the collapsed "N <noun> selected" summary. */
  itemNoun: string;
  /** Accessible name for the control and its listbox. */
  ariaLabel: string;
}

/**
 * Lightweight, accessible multi-select dropdown. No external dependency — matches
 * the compatibility page's existing pill/checkbox filter styling. Selecting the
 * "all" option clears the selection; selecting any specific option clears "all"
 * (the empty array is the canonical "all" state, so this is automatic).
 */
export function MultiSelectDropdown({
  options,
  selected,
  onChange,
  allLabel,
  itemNoun,
  ariaLabel,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const label =
    selected.length === 0
      ? allLabel
      : selected.length === 1
        ? selected[0]
        : `${selected.length} ${itemNoun} selected`;

  const toggle = (opt: string) => {
    onChange(selected.includes(opt) ? selected.filter(o => o !== opt) : [...selected, opt]);
  };

  const renderCheckbox = (isSelected: boolean) => (
    <span
      aria-hidden="true"
      className={`flex items-center justify-center w-4 h-4 rounded border flex-shrink-0 transition-colors ${
        isSelected ? 'bg-[#3d8b54] border-[#3d8b54]' : 'border-gray-300'
      }`}
    >
      {isSelected && <Check className="w-3 h-3 text-white" />}
    </span>
  );

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen(v => !v)}
        onKeyDown={e => {
          if (e.key === 'Escape') setOpen(false);
        }}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-left focus:outline-none focus:ring-2 focus:ring-[#6fbf7d] focus:border-[#6fbf7d]"
      >
        <span className={`truncate ${selected.length === 0 ? 'text-gray-500' : 'text-gray-900'}`}>
          {label}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-multiselectable="true"
          aria-label={ariaLabel}
          className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg py-1"
        >
          <li role="option" aria-selected={selected.length === 0}>
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50"
            >
              {renderCheckbox(selected.length === 0)}
              <span className={selected.length === 0 ? 'font-medium text-gray-900' : 'text-gray-700'}>
                {allLabel}
              </span>
            </button>
          </li>

          {options.map(opt => {
            const isSelected = selected.includes(opt);
            return (
              <li key={opt} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => toggle(opt)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50"
                >
                  {renderCheckbox(isSelected)}
                  <span className={isSelected ? 'font-medium text-gray-900' : 'text-gray-700'}>
                    {opt}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
