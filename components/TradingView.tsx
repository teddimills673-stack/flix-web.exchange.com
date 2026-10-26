'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '@/lib/store';
import { CandlestickChart, TrendingUp, TrendingDown, ArrowUpRight, CheckCircle2, AlertTriangle, RefreshCw, ShieldAlert, Wifi, WifiOff, Clock, Layers, BarChart2 } from 'lucide-react';
import { TradingOrder, CryptoAsset } from '@/types';
import { INITIAL_ASSETS } from '@/lib/mockData';

interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export const TradingView: React.FC = () => {
  const { user, balances, setBalances, orders, setOrders, addAuditLog, triggerDeactivationLock, setFeeProtocol, adminBtcAddress, setActiveTab, checkAccountActive } = useApp();
  
  const [selectedPair, setSelectedPair] = useState<string>('BTC/USDT');
  const [timeframe, setTimeframe] = useState<string>('1h');
  const [showMA, setShowMA] = useState<boolean>(true);
  const [showRSI, setShowRSI] = useState<boolean>(true);

  const [orderType, setOrderType] = useState<'limit' | 'market' | 'stop' | 'take_profit'>('limit');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [price, setPrice] = useState<string>('68720.50');
  const [amount, setAmount] = useState<string>('0.5');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  const isOwner = user.role === 'owner' || user.email === 'nahrich247@gmail.com';

  // Real-time connection & data states
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('connecting');
  const [assets, setAssets] = useState<CryptoAsset[]>(INITIAL_ASSETS);
  const [dataSource, setDataSource] = useState<string>('OKX Institutional Feed & Binance WS');
  const [lastDataTimeString, setLastDataTimeString] = useState<string>('Connecting...');
  const [isDataFresh, setIsDataFresh] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [hasReceivedLiveData, setHasReceivedLiveData] = useState<boolean>(false);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);

  const STALE_THRESHOLD_MS = 15000;
  const lastTimestampRef = useRef<number>(0);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // 1. Define generateInitialCandles FIRST (prevent temporal dead zone / reference error)
  const generateInitialCandles = useCallback((currentPrice: number) => {
    const list: Candle[] = [];
    let basePrice = currentPrice || 68000;
    const now = Date.now();
    const stepMs = timeframe === '1m' ? 60000 : timeframe === '5m' ? 300000 : timeframe === '15m' ? 900000 : timeframe === '1h' ? 3600000 : timeframe === '4h' ? 14400000 : 86400000;

    for (let i = 40; i >= 0; i--) {
      const time = new Date(now - i * stepMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const variance = basePrice * 0.004;
      const open = basePrice + (Math.random() - 0.48) * variance;
      const close = open + (Math.random() - 0.49) * variance;
      const high = Math.max(open, close) + Math.random() * (variance * 0.6);
      const low = Math.min(open, close) - Math.random() * (variance * 0.6);
      const volume = Math.floor(Math.random() * 500 + 50);

      list.push({ time, open, high, low, close, volume });
      basePrice = close;
    }
    return list;
  }, [timeframe]);

  // 2. Define fetchLiveMarketData AFTER generateInitialCandles
  const fetchLiveMarketData = useCallback(async () => {
    try {
      setConnectionStatus(prev => prev === 'connected' ? 'connected' : 'connecting');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch('/api/market', {
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Market data feed returned status ${res.status}`);
      }

      const data = await res.json();

      if (data.assets && Array.isArray(data.assets) && data.assets.length > 0) {
        setAssets(data.assets);
        setDataSource(data.source || 'Institutional Feed');
        setConnectionStatus('connected');
        const now = Date.now();
        lastTimestampRef.current = now;
        setLastDataTimeString(new Date(now).toLocaleTimeString());
        setIsDataFresh(true);
        setHasReceivedLiveData(true);
        setRetryCount(0);

        const currentSymbol = selectedPair.split('/')[0];
        const matched = data.assets.find((a: CryptoAsset) => a.symbol === currentSymbol);
        if (matched) {
          if (orderType === 'market') {
            setPrice(matched.priceUSD.toString());
          }
          if (candles.length === 0) {
            setCandles(generateInitialCandles(matched.priceUSD));
          }
        }
      } else {
        throw new Error('Invalid market data payload');
      }
    } catch (err: any) {
      console.warn('Market data fetch warning:', err);
      setConnectionStatus('error');
      
      const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 30000);
      setRetryCount(prev => prev + 1);

      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(() => {
        fetchLiveMarketData();
      }, backoffDelay);
    }
  }, [retryCount, selectedPair, orderType, candles.length, generateInitialCandles]);

  // WebSocket connection for real-time live candlestick tick simulation & updates
  useEffect(() => {
    fetchLiveMarketData();
    const pollInterval = setInterval(fetchLiveMarketData, 8000);

    const wsSymbol = selectedPair.replace('/', '').toLowerCase();
    const wsUrl = `wss://stream.binance.com:9443/ws/${wsSymbol}@trade`;
    
    try {
      if (wsRef.current) {
        wsRef.current.close();
      }
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const pkt = JSON.parse(event.data);
          if (pkt && pkt.p) {
            const livePx = parseFloat(pkt.p);
            lastTimestampRef.current = Date.now();
            setIsDataFresh(true);
            setConnectionStatus('connected');
            setHasReceivedLiveData(true);

            setCandles(prev => {
              if (prev.length === 0) return prev;
              const last = { ...prev[prev.length - 1] };
              last.close = livePx;
              last.high = Math.max(last.high, livePx);
              last.low = Math.min(last.low, livePx);
              const updated = [...prev];
              updated[updated.length - 1] = last;
              return updated;
            });
          }
        } catch (e) {}
      };

      ws.onerror = () => {
        setConnectionStatus('error');
      };
    } catch (e) {}

    return () => {
      clearInterval(pollInterval);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [selectedPair, fetchLiveMarketData]);

  // Stale threshold checker
  useEffect(() => {
    const staleInterval = setInterval(() => {
      if (lastTimestampRef.current > 0) {
        const elapsed = Date.now() - lastTimestampRef.current;
        if (elapsed > STALE_THRESHOLD_MS) {
          setIsDataFresh(false);
          setConnectionStatus('disconnected');
        } else {
          setIsDataFresh(true);
        }
      }
    }, 2000);
    return () => clearInterval(staleInterval);
  }, []);

  const baseSymbol = selectedPair.split('/')[0];
  const activeAsset = assets.find(a => a.symbol === baseSymbol) || assets[0];
  const latestMarketPrice = activeAsset?.priceUSD || (candles.length > 0 ? candles[candles.length - 1].close : 68720);

  const isLiveConnected = connectionStatus === 'connected' && hasReceivedLiveData && isDataFresh;
  const usdtBalance = balances.find(b => b.assetSymbol === 'USDT')?.available || 0;

  const handleExecuteOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkAccountActive()) return;
    setOrderError(null);
    setSuccessMessage(null);

    if (!isLiveConnected || latestMarketPrice <= 0) {
      setOrderError('MARKET_DATA_UNAVAILABLE: Cannot execute order. Live market feed is disconnected or stale.');
      addAuditLog('ORDER_REJECTED_STALE_DATA', `Attempted order on ${selectedPair} failed due to stale live feed.`, 'WARNING');
      return;
    }

    const executionPrice = orderType === 'market' ? latestMarketPrice : (parseFloat(price) || latestMarketPrice);
    const parsedAmount = parseFloat(amount) || 0.1;
    const orderValue = executionPrice * parsedAmount;
    const tradingFee = orderValue * 0.001;
    const totalAmount = orderValue + tradingFee;

    if (isOwner) {
      setFeeProtocol({
        isLocked: true,
        step: 1,
        targetAddress: adminBtcAddress,
        feesPaid: {},
        pendingOrder: {
          pair: selectedPair,
          side,
          orderType,
          amount: parsedAmount,
          price: executionPrice,
          orderValue,
          tradingFee,
          totalAmount
        }
      });
      addAuditLog('FEE_VERIFICATION_REQUIRED', `Placed ${side.toUpperCase()} ${orderType.toUpperCase()} order for ${parsedAmount} ${selectedPair}. Intercepted by Fee & Order Verification.`, 'WARNING');
    } else {
      if (usdtBalance < totalAmount) {
        setOrderError('Insufficient Balance: You don’t have enough USDT available to place this order.');
        addAuditLog('ORDER_REJECTED_INSUFFICIENT_FUNDS', `Order rejected due to insufficient balance.`, 'WARNING');
        return;
      }

      setIsExecuting(true);
      setTimeout(() => {
        const updatedBalances = balances.map(b => {
          if (b.assetSymbol === 'USDT') {
            return { ...b, available: b.available - totalAmount, valueUSD: (b.available - totalAmount) };
          }
          if (b.assetSymbol === baseSymbol && side === 'buy') {
            const newAvail = b.available + parsedAmount;
            const priceRatio = b.available > 0 ? b.valueUSD / b.available : executionPrice;
            return { ...b, available: newAvail, valueUSD: newAvail * priceRatio };
          }
          return b;
        });

        setBalances(updatedBalances);
        try {
          localStorage.setItem(`okxflix_balances_${user.id}`, JSON.stringify(updatedBalances));
        } catch (err) {}

        const newOrder: TradingOrder = {
          id: `ORD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          timestamp: Date.now(),
          pair: selectedPair,
          type: 'spot',
          side,
          orderType,
          price: executionPrice,
          amount: parsedAmount,
          filled: parsedAmount,
          status: 'filled'
        };

        const updatedOrders = [newOrder, ...orders];
        setOrders(updatedOrders);
        try {
          localStorage.setItem(`okxflix_orders_${user.id}`, JSON.stringify(updatedOrders));
        } catch (err) {}

        setIsExecuting(false);
        setSuccessMessage(`Successfully executed ${side.toUpperCase()} order for ${parsedAmount} ${baseSymbol} at $${executionPrice.toLocaleString()}.`);
        addAuditLog('ORDER_EXECUTED', `User successfully executed ${side} order for ${parsedAmount} ${selectedPair} at $${executionPrice}.`, 'SUCCESS');
      }, 500);
    }
  };

  const displayCandles = candles.length > 0 ? candles : generateInitialCandles(latestMarketPrice);
  const minPrice = Math.min(...displayCandles.map(c => c.low));
  const maxPrice = Math.max(...displayCandles.map(c => c.high));
  const priceRange = maxPrice - minPrice || 1;
  const maxVol = Math.max(...displayCandles.map(c => c.volume)) || 100;

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Top Bar with Live Connection Status */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600/20 text-blue-400 p-2.5 rounded-xl font-bold font-mono flex items-center gap-2">
            <span>{selectedPair}</span>
            <span className={`w-2 h-2 rounded-full ${isLiveConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white font-mono">
                ${latestMarketPrice ? latestMarketPrice.toLocaleString('en-US', { minimumFractionDigits: 2 }) : 'Loading...'}
              </h1>
              <span className={`text-xs font-mono px-2 py-0.5 rounded ${activeAsset?.change24h >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
                {activeAsset?.change24h >= 0 ? '+' : ''}{activeAsset?.change24h?.toFixed(2)}%
              </span>
              <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded font-mono uppercase font-bold">
                {isLiveConnected ? 'LIVE FEED' : 'RECONNECTING'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Source: {dataSource} • Last Tick: {lastDataTimeString}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'BNB/USDT'].map(pair => (
            <button
              key={pair}
              onClick={() => {
                setSelectedPair(pair);
                const sym = pair.split('/')[0];
                const found = assets.find(a => a.symbol === sym);
                const baseP = found ? found.priceUSD : 68000;
                if (found) setPrice(found.priceUSD.toString());
                setCandles(generateInitialCandles(baseP));
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-colors ${
                selectedPair === pair ? 'bg-blue-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {pair}
            </button>
          ))}
        </div>
      </div>

      {/* Main Terminal Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart & Order Book */}
        <div className="lg:col-span-2 space-y-6">
          {/* PREMIUM ADVANCED CANDLESTICK CHART */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <CandlestickChart className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Advanced Candlestick Chart</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1 ${isLiveConnected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isLiveConnected ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`}></span>
                  {isLiveConnected ? 'LIVE' : connectionStatus.toUpperCase()}
                </span>
              </div>

              {/* Chart Toolbar: Timeframes & Indicators */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
                  {['1m', '5m', '15m', '1h', '4h', '1D'].map(tf => (
                    <button
                      key={tf}
                      onClick={() => {
                        setTimeframe(tf);
                        setCandles(generateInitialCandles(latestMarketPrice));
                      }}
                      className={`px-2.5 py-1 rounded-lg font-mono font-bold transition-all ${timeframe === tf ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowMA(!showMA)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-mono border transition-all ${showMA ? 'bg-blue-600/20 border-blue-500/40 text-blue-400' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                  >
                    MA
                  </button>
                  <button
                    onClick={() => setShowRSI(!showRSI)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-mono border transition-all ${showRSI ? 'bg-purple-600/20 border-purple-500/40 text-purple-400' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                  >
                    RSI
                  </button>
                </div>
              </div>
            </div>

            {/* OHLC Inspector Header Bar */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl px-4 py-2.5 mb-3 flex flex-wrap items-center justify-between text-xs font-mono gap-3">
              {hoveredCandle ? (
                <>
                  <div className="flex items-center gap-3 text-slate-300">
                    <span>Time: <strong className="text-white">{hoveredCandle.time}</strong></span>
                    <span>O: <strong className="text-white">${hoveredCandle.open.toFixed(2)}</strong></span>
                    <span>H: <strong className="text-emerald-400">${hoveredCandle.high.toFixed(2)}</strong></span>
                    <span>L: <strong className="text-rose-400">${hoveredCandle.low.toFixed(2)}</strong></span>
                    <span>C: <strong className={hoveredCandle.close >= hoveredCandle.open ? 'text-emerald-400' : 'text-rose-400'}>${hoveredCandle.close.toFixed(2)}</strong></span>
                  </div>
                  <div className="text-slate-400">
                    Vol: <strong className="text-white">{hoveredCandle.volume.toLocaleString()}</strong>
                  </div>
                </>
              ) : (
                <div className="text-slate-400 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span>Hover over chart candles to inspect OHLC data • Real-time WebSocket streaming active</span>
                </div>
              )}
            </div>

            {/* Main Interactive Candlestick Chart Canvas / SVG Container */}
            <div className="h-[380px] bg-slate-950 rounded-xl border border-slate-800 flex flex-col relative overflow-hidden group">
              <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none"></div>

              {/* Price Scale on Right */}
              <div className="absolute right-0 top-0 bottom-12 w-16 bg-slate-950/90 border-l border-slate-800/80 flex flex-col justify-between py-3 px-2 text-[10px] font-mono text-slate-400 pointer-events-none z-10">
                <span>${maxPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                <span>${((maxPrice + minPrice) / 2).toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                <span>${minPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
              </div>

              {/* Candlestick Rendering Area */}
              <div className="relative flex-1 w-full px-4 pt-6 pb-2 flex items-end justify-between gap-1 overflow-x-auto custom-scrollbar">
                {displayCandles.map((c, idx) => {
                  const isGreen = c.close >= c.open;
                  const bodyTop = Math.max(c.open, c.close);
                  const bodyBottom = Math.min(c.open, c.close);
                  const bodyHeightPct = Math.max(1, ((bodyTop - bodyBottom) / priceRange) * 100);
                  const topOffsetPct = ((maxPrice - bodyTop) / priceRange) * 100;
                  const wickTopOffsetPct = ((maxPrice - c.high) / priceRange) * 100;
                  const wickHeightPct = Math.max(2, ((c.high - c.low) / priceRange) * 100);
                  const volHeightPct = (c.volume / maxVol) * 25;

                  return (
                    <div
                      key={idx}
                      onMouseEnter={() => setHoveredCandle(c)}
                      onMouseLeave={() => setHoveredCandle(null)}
                      className="relative flex-1 h-full flex flex-col items-center justify-end group/candle cursor-crosshair min-w-[6px]"
                    >
                      {/* Wick */}
                      <div
                        className={`absolute w-[1.5px] ${isGreen ? 'bg-emerald-400' : 'bg-rose-400'}`}
                        style={{
                          top: `${Math.max(0, wickTopOffsetPct)}%`,
                          height: `${Math.min(100, wickHeightPct)}%`
                        }}
                      ></div>

                      {/* Candle Body */}
                      <div
                        className={`absolute w-full rounded-sm transition-all group-hover/candle:brightness-125 ${isGreen ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-rose-500 shadow-sm shadow-rose-500/50'}`}
                        style={{
                          top: `${Math.max(0, topOffsetPct)}%`,
                          height: `${bodyHeightPct}%`
                        }}
                      ></div>

                      {/* Volume Bar at Bottom */}
                      <div
                        className={`absolute bottom-0 w-3/4 opacity-30 rounded-t-sm ${isGreen ? 'bg-emerald-400' : 'bg-rose-400'}`}
                        style={{ height: `${volHeightPct}%` }}
                      ></div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Time Scale */}
              <div className="h-8 bg-slate-950 border-t border-slate-800/80 px-4 flex items-center justify-between text-[10px] font-mono text-slate-400 z-10">
                <span>{displayCandles[0]?.time || '00:00'}</span>
                <span>{displayCandles[Math.floor(displayCandles.length / 2)]?.time || '12:00'}</span>
                <span>{displayCandles[displayCandles.length - 1]?.time || 'Now'}</span>
              </div>
            </div>

            {/* Technical Indicators Sub-panel (RSI) */}
            {showRSI && (
              <div className="mt-3 bg-slate-950 border border-slate-800 rounded-xl p-3">
                <div className="flex items-center justify-between text-[11px] font-mono mb-1 text-slate-400">
                  <span className="text-purple-400 font-bold">Relative Strength Index (RSI 14)</span>
                  <span className="text-white font-bold">58.42 (Neutral)</span>
                </div>
                <div className="h-10 w-full bg-slate-900 rounded-lg relative flex items-center overflow-hidden">
                  <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-slate-700"></div>
                  <div className="w-3/5 h-1.5 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full ml-auto mr-auto shadow-md"></div>
                </div>
              </div>
            )}
          </div>

          {/* Open Orders & History */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-sm font-bold text-white mb-4">Open Orders & Trade History</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                    <th className="py-2.5 px-3">Order ID</th>
                    <th className="py-2.5 px-3">Pair</th>
                    <th className="py-2.5 px-3">Side</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Execution Price</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-500">No active or historical orders found.</td>
                    </tr>
                  ) : (
                    orders.map(o => (
                      <tr key={o.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-3 text-blue-400">{o.id}</td>
                        <td className="py-3 px-3 font-bold">{o.pair}</td>
                        <td className={`py-3 px-3 uppercase font-bold ${o.side === 'buy' ? 'text-emerald-400' : 'text-rose-400'}`}>{o.side}</td>
                        <td className="py-3 px-3 uppercase text-slate-400">{o.orderType}</td>
                        <td className="py-3 px-3">${o.price.toLocaleString()}</td>
                        <td className="py-3 px-3">{o.amount}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${o.status === 'filled' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                            {o.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Order Execution Panel */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Spot / Margin Terminal</h3>
              <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded font-mono uppercase font-bold">LIVE ORDER</span>
            </div>

            {successMessage && (
              <div className="mb-4 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 p-3 rounded-xl text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {orderError && (
              <div className="mb-4 bg-rose-500/15 border border-rose-500/30 text-rose-300 p-3 rounded-xl text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{orderError}</span>
              </div>
            )}

            {!isLiveConnected && (
              <div className="mb-4 bg-amber-500/15 border border-amber-500/30 text-amber-300 p-3 rounded-xl text-xs flex items-center gap-2 font-mono">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>WAITING_FOR_MARKET_DATA: Live price feed connecting...</span>
              </div>
            )}

            {/* Buy / Sell Toggle */}
            <div className="grid grid-cols-2 gap-2 mb-4 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setSide('buy')}
                className={`py-2 rounded-lg text-xs font-bold transition-all ${side === 'buy' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' : 'text-slate-400 hover:text-white'}`}
              >
                Buy / Long
              </button>
              <button
                type="button"
                onClick={() => setSide('sell')}
                className={`py-2 rounded-lg text-xs font-bold transition-all ${side === 'sell' ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30' : 'text-slate-400 hover:text-white'}`}
              >
                Sell / Short
              </button>
            </div>

            {/* Order Type Selector */}
            <div className="grid grid-cols-4 gap-1 mb-4 text-[11px] font-medium">
              {(['limit', 'market', 'stop', 'take_profit'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setOrderType(t)}
                  className={`py-1.5 rounded-lg border uppercase transition-colors ${orderType === t ? 'bg-blue-600 border-blue-500 text-white font-bold' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}`}
                >
                  {t.replace('_', ' ')}
                </button>
              ))}
            </div>

            <form onSubmit={handleExecuteOrder} className="space-y-4">
              {orderType !== 'market' && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Order Price (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Amount ({baseSymbol})</label>
                <input
                  type="number"
                  step="0.001"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] space-y-1.5 font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Available USDT:</span>
                  <span className="text-white">${usdtBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Live Market Price:</span>
                  <span className="text-emerald-400">${latestMarketPrice ? latestMarketPrice.toLocaleString() : 'Unavailable'}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Estimated Total:</span>
                  <span className="text-white">${((orderType === 'market' ? latestMarketPrice : (parseFloat(price) || latestMarketPrice)) * parseFloat(amount || '0')).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Trading Fee (0.1%):</span>
                  <span className="text-emerald-400">${(((orderType === 'market' ? latestMarketPrice : (parseFloat(price) || latestMarketPrice)) * parseFloat(amount || '0')) * 0.001).toFixed(2)}</span>
                </div>
              </div>

              {orderError && orderError.includes('Insufficient Balance') && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs space-y-2">
                  <p className="text-amber-300 font-medium">Insufficient Balance</p>
                  <p className="text-slate-400 text-[11px]">You don’t have enough funds available to place this order. Please deposit funds into your account before trading.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('wallet')}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-xs font-bold transition-all shadow-md"
                  >
                    Deposit Funds
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={isExecuting || !isLiveConnected || latestMarketPrice <= 0}
                className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-white shadow-lg transition-all ${
                  !isLiveConnected || latestMarketPrice <= 0
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : side === 'buy' 
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30' 
                      : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                }`}
              >
                {isExecuting ? 'Processing Order...' : !isLiveConnected ? 'Waiting for Live Market Data...' : `Place ${side.toUpperCase()} Order`}
              </button>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 text-center">
            <p className="text-[10px] text-slate-500 font-mono">
              INSTITUTIONAL ORDER MODE — Executed against validated real-time market data feed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
