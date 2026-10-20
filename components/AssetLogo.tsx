'use client';

import React, { useState } from 'react';

interface AssetLogoProps {
  symbol: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const LOGO_MAP: Record<string, string> = {
  // Cryptocurrencies
  BTC: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
  ETH: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
  USDT: 'https://assets.coingecko.com/coins/images/325/large/Tether.png',
  BNB: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png',
  XRP: 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png',
  USDC: 'https://assets.coingecko.com/coins/images/6319/large/usdc.png',
  SOL: 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
  TRX: 'https://assets.coingecko.com/coins/images/1094/large/tron-logo.png',
  FIGR_HELOC: 'https://assets.coingecko.com/coins/images/31288/large/figure.png',
  ZEC: 'https://assets.coingecko.com/coins/images/486/large/circle-zcash-color.png',
  HYPE: 'https://assets.coingecko.com/coins/images/39733/large/hyperliquid.png',
  DOGE: 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png',
  XMR: 'https://assets.coingecko.com/coins/images/69/large/monero_logo.png',
  USDS: 'https://assets.coingecko.com/coins/images/39904/large/usds.png',
  LINK: 'https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png',
  WBT: 'https://assets.coingecko.com/coins/images/27043/large/whitebit.png',
  ADA: 'https://assets.coingecko.com/coins/images/975/large/cardano.png',
  LEO: 'https://assets.coingecko.com/coins/images/8418/large/leo-token.png',
  RAIN: 'https://assets.coingecko.com/coins/images/33423/large/rain.png',
  NEAR: 'https://assets.coingecko.com/coins/images/10365/large/near.png',

  // Global Equities
  NVDA: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/nvidia.svg',
  AAPL: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/apple.svg',
  GOOGL: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/google.svg',
  MSFT: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/microsoft.svg',
  AMZN: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/amazon.svg',
  TSM: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/TSMC_logo.svg',
  SPCX: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/spacex.svg',
  META: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/meta.svg',
};

export const AssetLogo: React.FC<AssetLogoProps> = ({ symbol, name, size = 'md', className = '' }) => {
  const [imgError, setImgError] = useState(false);
  const cleanSymbol = symbol ? symbol.toUpperCase().trim() : 'BTC';
  const logoUrl = LOGO_MAP[cleanSymbol];

  const sizeClasses = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-9 h-9 text-xs',
    lg: 'w-12 h-12 text-sm',
    xl: 'w-16 h-16 text-base',
  }[size];

  if (!logoUrl || imgError) {
    return (
      <div className={`relative rounded-xl border-2 border-blue-500/80 bg-slate-900/90 flex items-center justify-center font-bold text-blue-400 shadow-md overflow-hidden shrink-0 ${sizeClasses} ${className}`}>
        <span>{cleanSymbol.slice(0, 3)}</span>
      </div>
    );
  }

  return (
    <div className={`relative rounded-xl border-2 border-blue-500/80 bg-slate-900/90 p-1 flex items-center justify-center shadow-md overflow-hidden shrink-0 ${sizeClasses} ${className}`}>
      <img
        src={logoUrl}
        alt={name || cleanSymbol}
        className="w-full h-full object-contain rounded-lg"
        onError={() => setImgError(true)}
        referrerPolicy="no-referrer"
      />
    </div>
  );
};
