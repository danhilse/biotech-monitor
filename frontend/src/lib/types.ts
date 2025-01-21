// src/lib/types/index.ts
export interface StockHistoricalData {
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }

  export interface SearchResult {
    symbol: string;
    name: string;
    sector?: string;
    industry?: string;
    price?: number;
    marketCap?: number;
  }
  
  export interface TickerManagementProps {
    onTickersUpdate?: () => Promise<void>;
  }