'use client';

import { useEffect } from 'react';

export function TawkWidgetScript() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (document.getElementById('tawk-script')) return;

    (window as any).Tawk_API = (window as any).Tawk_API || {};
    (window as any).Tawk_LoadStart = new Date();

    // Hide Tawk.to widget by default on load across all views
    (window as any).Tawk_API.onLoad = function() {
      if ((window as any).Tawk_API && typeof (window as any).Tawk_API.hideWidget === 'function') {
        (window as any).Tawk_API.hideWidget();
      }
    };

    const s1 = document.createElement('script');
    s1.id = 'tawk-script';
    s1.async = true;
    s1.src = 'https://embed.tawk.to/6ad6e53b59640134c789eb9b/default';
    s1.charset = 'UTF-8';
    s1.setAttribute('crossorigin', '*');

    const s0 = document.getElementsByTagName('script')[0];
    if (s0 && s0.parentNode) {
      s0.parentNode.insertBefore(s1, s0);
    } else {
      document.head.appendChild(s1);
    }
  }, []);

  return null;
}
