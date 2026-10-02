"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check, Search } from "lucide-react";

export function CustomSelect({
  value,
  options,
  placeholder,
  onChange,
  searchable = false,
}: {
  value: string;
  options: { value: string; label: string }[];
  placeholder: string;
  onChange: (value: string) => void;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
    }
  }, [open]);

  const selected = options.find((option) => option.value === value);
  const filteredOptions = options.filter(opt => opt.label.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3.5 py-2.5 text-left text-sm text-[var(--text-primary)] transition-all hover:border-[var(--border-hover)] focus:outline-none focus:border-[var(--border)] focus:shadow-[0_0_0_1.5px_var(--accent)]"
      >
        <span className={selected ? "text-[var(--text-primary)] font-medium" : "text-[var(--text-muted)] truncate"}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown 
          className={`h-4 w-4 flex-shrink-0 text-[var(--text-muted)] transition-transform duration-200 ${
            open ? "rotate-180 text-[var(--accent)]" : ""
          }`} 
        />
      </button>

      {open && (
        <div 
          role="listbox" 
          className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-[var(--border-hover)] bg-[var(--surface-elevated)] shadow-2xl shadow-black/50"
        >
          {searchable && (
            <div className="p-2 border-b border-[var(--border-hover)] relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--surface-hover)] border-none rounded-lg py-1.5 pl-8 pr-3 text-sm text-white placeholder-[var(--text-muted)] focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>
          )}
          <div className="max-h-56 w-full overflow-auto p-1.5 flex flex-col gap-0.5">
            {filteredOptions.length ? (
              filteredOptions.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    type="button"
                    key={option.value}
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      isSelected
                        ? "bg-[var(--accent-soft)] text-[var(--accent)] font-semibold"
                        : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-white"
                    }`}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected && <Check className="h-4 w-4 flex-shrink-0 text-[var(--accent)]" />}
                  </button>
                );
              })
            ) : (
              <p className="px-3 py-3 text-center text-xs text-[var(--text-muted)]">
                No options found
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

