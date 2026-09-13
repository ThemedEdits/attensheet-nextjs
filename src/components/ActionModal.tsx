"use client";

export function ActionModal({ title, description, confirmLabel = "Confirm", onConfirm, onClose, children }: {
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  children?: React.ReactNode;
}) {
  return <div className="fixed inset-0 z-40 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
    <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl border border-white/10 bg-[#10231f] p-6 shadow-2xl">
      <div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold text-white">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{description}</p></div><button type="button" onClick={onClose} aria-label="Close" className="text-xl text-slate-400 hover:text-white">×</button></div>
      {children && <div className="mt-5">{children}</div>}
      <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="button-secondary">Cancel</button><button type="button" onClick={onConfirm} className="button-primary">{confirmLabel}</button></div>
    </div>
  </div>;
}
