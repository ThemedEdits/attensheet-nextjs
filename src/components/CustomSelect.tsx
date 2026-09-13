"use client";

import { useEffect, useRef, useState } from "react";

export function CustomSelect({ value, options, placeholder, onChange }: {
  value: string;
  options: { value: string; label: string }[];
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const selected = options.find((option) => option.value === value);
  return <div ref={ref} className="relative w-56">
    <button type="button" onClick={() => setOpen((current) => !current)} className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.05] px-3 py-3 text-left text-sm text-white hover:border-emerald-400/50">
      <span className={selected ? "text-white" : "text-slate-400"}>{selected?.label ?? placeholder}</span>
      <span className="text-slate-400">⌄</span>
    </button>
    {open && <div className="absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-lg border border-white/10 bg-[#10231f] p-1 shadow-xl">
      {options.length ? options.map((option) => <button type="button" key={option.value} onClick={() => { onChange(option.value); setOpen(false); }} className="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-200 hover:bg-emerald-400/15 hover:text-emerald-200">{option.label}</button>) : <p className="px-3 py-2 text-sm text-slate-500">No approved teachers</p>}
    </div>}
  </div>;
}
