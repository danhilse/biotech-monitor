// src/app/components/market/TickerManagement/types.ts
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