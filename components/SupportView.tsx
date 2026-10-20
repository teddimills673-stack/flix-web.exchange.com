'use client';

import React, { useEffect, useState } from 'react';
import { useApp } from '@/lib/store';
import { Headphones, ArrowLeft, RefreshCcw, ShieldCheck, ExternalLink } from 'lucide-react';

export const SupportView: React.FC = () => {
  const { setActiveTab, language } = useApp();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Inject Tawk.to script globally if not present
    if (typeof window !== 'undefined') {
      if (!(window as any).Tawk_API) {
        (window as any).Tawk_API = (window as any).Tawk_API || {};
        (window as any).Tawk_LoadStart = new Date();
        const s1 = document.createElement("script");
        s1.async = true;
        s1.src = 'https://embed.tawk.to/6ad6e53b59640134c789eb9b/default';
        s1.charset = 'UTF-8';
        s1.setAttribute('crossorigin', '*');
        document.head.appendChild(s1);
      } else if (typeof (window as any).Tawk_API.showWidget === 'function') {
        (window as any).Tawk_API.showWidget();
        if (typeof (window as any).Tawk_API.maximize === 'function') {
          (window as any).Tawk_API.maximize();
        }
      }
    }
  }, []);

  return (
    <div className="space-y-6 pb-12 animate-fadeIn max-w-5xl mx-auto h-[calc(100vh-140px)] flex flex-col">
      {/* Header bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 md:p-6 shadow-xl flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (typeof window !== 'undefined' && (window as any).Tawk_API && typeof (window as any).Tawk_API.hideWidget === 'function') {
                (window as any).Tawk_API.hideWidget();
              }
              setActiveTab('dashboard');
            }}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Headphones className="w-5 h-5 text-blue-400" />
              <h1 className="text-lg md:text-xl font-bold text-white tracking-tight">Live Human Customer Support</h1>
            </div>
            <p className="text-xs text-slate-400">Connect securely with professional exchange support agents via Tawk.to</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Agents Online</span>
        </div>
      </div>

      {/* Main Tawk.to Embedded View Pane */}
      <div className="flex-1 bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative flex flex-col">
        <div className="absolute inset-0 z-0 bg-slate-950 flex flex-col">
          <iframe
            src="https://embed.tawk.to/6ad6e53b59640134c789eb9b/default"
            title="Tawk.to Live Support"
            className="w-full h-full border-0"
            onLoad={() => setIsLoading(false)}
            referrerPolicy="no-referrer"
          />
        </div>

        {isLoading && (
          <div className="absolute inset-0 z-10 bg-slate-950 flex flex-col items-center justify-center space-y-3 text-slate-400">
            <RefreshCcw className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-xs font-mono">Loading secure live support connection...</p>
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 px-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
          <span>Encrypted live support session provided by OKX FLIX Exchange & Tawk.to</span>
        </div>
        <a
          href="https://embed.tawk.to/6ad6e53b59640134c789eb9b/default"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-blue-400 flex items-center gap-1 transition-colors"
        >
          <span>Open Fullscreen Chat</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};
