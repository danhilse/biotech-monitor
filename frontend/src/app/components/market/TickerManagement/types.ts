// src/app/components/market/TickerManagement/types.ts

export interface SearchResult {
  symbol: string;
  name: string;
  price?: number;
  sector?: string;
  industry?: string;
  isTracked?: boolean;  // Add this property
}

export interface ManagedTicker {
  symbol: string;
  name: string;
  price: number;
  priceChange: number;
  volume: number;
  marketCap: number;
  sector?: string;
  industry?: string;
}

export interface TickerManagementProps {
  onTickersUpdate?: () => Promise<void>;
}