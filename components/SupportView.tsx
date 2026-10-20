'use client';

import React, { useEffect } from 'react';
import { useApp } from '@/lib/store';
import { ArrowLeft } from 'lucide-react';

export const SupportView: React.FC = () => {
  const { setActiveTab } = useApp();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const initTawk = () => {
        if ((window as any).Tawk_API) {
          if (typeof (window as any).Tawk_API.showWidget === 'function') {
            (window as any).Tawk_API.showWidget();
          }
          if (typeof (window as any).Tawk_API.maximize === 'function') {
            (window as any).Tawk_API.maximize();
          }
        }
      };

      if (!(window as any).Tawk_API) {
        (window as any).Tawk_API = (window as any).Tawk_API || {};
        (window as any).Tawk_LoadStart = new Date();
        const s1 = document.createElement("script");
        s1.id = 'tawk-script-support';
        s1.async = true;
        s1.src = 'https://embed.tawk.to/6ad6e53b59640134c789eb9b/default';
        s1.charset = 'UTF-8';
        s1.setAttribute('crossorigin', '*');
        s1.onload = () => {
          initTawk();
        };
        document.head.appendChild(s1);
      } else {
        initTawk();
      }
    }

    return () => {
      if (typeof window !== 'undefined' && (window as any).Tawk_API) {
        if (typeof (window as any).Tawk_API.hideWidget === 'function') {
          (window as any).Tawk_API.hideWidget();
        }
        if (typeof (window as any).Tawk_API.minimize === 'function') {
          (window as any).Tawk_API.minimize();
        }
      }
    };
  }, []);

  const handleBack = () => {
    if (typeof window !== 'undefined' && (window as any).Tawk_API) {
      if (typeof (window as any).Tawk_API.hideWidget === 'function') {
        (window as any).Tawk_API.hideWidget();
      }
      if (typeof (window as any).Tawk_API.minimize === 'function') {
        (window as any).Tawk_API.minimize();
      }
    }
    setActiveTab('dashboard');
  };

  return (
    <div className="space-y-4 pb-8 animate-fadeIn max-w-5xl mx-auto flex flex-col">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <h1 className="text-lg md:text-xl font-bold text-white tracking-tight">Customer service</h1>
        </div>
      </div>
    </div>
  );
};
