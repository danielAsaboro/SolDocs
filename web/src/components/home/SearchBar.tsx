"use client";

import { useEffect, useRef } from "react";

export function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onChange(val), 300);
  }

  return (
    <div className="mx-auto mb-6 max-w-[700px]">
      <input
        ref={inputRef}
        type="text"
        defaultValue={value}
        onChange={handleChange}
        placeholder="Search programs by name or address..."
        className="w-full rounded-xl border border-sol-border bg-sol-card px-4 py-3 text-sol-text outline-none transition-colors focus:border-sol-purple"
      />
    </div>
  );
}
