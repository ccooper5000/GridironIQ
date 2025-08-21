import React, { useEffect, useRef } from 'react';
import { X, Info, Copy } from 'lucide-react';
import { getBuildInfo } from '../utils/buildInfo';

interface AboutModalProps {
  open: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ open, onClose }) => {
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const info = getBuildInfo();

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        // Simple focus trap: keep focus inside modal
        const focusable = Array.from(
          document.querySelectorAll<HTMLElement>('[data-about-modal] button, [data-about-modal] a')
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (document.activeElement === last && !e.shiftKey) {
          e.preventDefault(); first.focus(); return;
        }
        if (document.activeElement === first && e.shiftKey) {
          e.preventDefault(); last.focus(); return;
        }
      }
    };

    // Focus the close button when opened
    closeBtnRef.current?.focus();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const copy = async () => {
    const payload = {
      version: info.version,
      commit: info.commit,
      builtAt: info.timeIso,
      mode: info.mode,
      userAgent: navigator.userAgent,
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      alert('Build info copied to clipboard.');
    } catch {
      alert('Could not copy to clipboard.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-title"
      data-about-modal
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      <div className="absolute inset-x-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 top-20 md:top-24 w-auto md:w-[520px] bg-white rounded-xl shadow-2xl border border-slate-200">
        <div className="p-5 border-b border-slate-200 flex items-center gap-3">
          <Info className="w-5 h-5 text-slate-700" aria-hidden />
          <h2 id="about-title" className="text-lg font-semibold text-slate-800">
            About this build
          </h2>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            className="ml-auto p-2 rounded-md text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            aria-label="Close about dialog"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div className="text-slate-500">App version</div>
            <div className="font-medium text-slate-800">{info.version}</div>

            <div className="text-slate-500">Commit</div>
            <div className="font-mono text-slate-800">{info.commit}</div>

            <div className="text-slate-500">Built</div>
            <div className="text-slate-800">{info.timeLocal}</div>

            <div className="text-slate-500">Mode</div>
            <div className="text-slate-800 capitalize">{info.mode}</div>
          </div>

          <div className="text-xs text-slate-500 break-words">
            UA: {navigator.userAgent}
          </div>
        </div>

        <div className="p-5 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Useful for QA bug reports and version tracking.
          </div>
          <button
            onClick={copy}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-slate-800 text-white text-sm font-medium hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
          >
            <Copy className="w-4 h-4" aria-hidden />
            Copy build info
          </button>
        </div>
      </div>
    </div>
  );
};