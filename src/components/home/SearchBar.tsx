"use client";

import { useEffect, useRef, useState } from "react";

export function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleChange(val: string) {
    setLocalValue(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onChange(val), 300);
  }

  function handleClear() {
    setLocalValue("");
    onChange("");
    inputRef.current?.focus();
  }

  return (
    <div className="mx-auto mb-6 max-w-[700px]">
      <div className="relative">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 text-sol-muted"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Search programs by name or address..."
          className="w-full rounded-xl border border-sol-border bg-sol-card py-3 pl-11 pr-10 text-sol-text outline-none transition-colors focus:border-sol-purple"
          aria-label="Search programs"
        />
        {localValue && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-sol-muted transition-colors hover:text-sol-text"
            aria-label="Clear search"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        )}
      </div>
    </div>
  );
}
