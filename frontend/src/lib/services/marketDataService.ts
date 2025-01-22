// services/marketDataService.ts
import { Stock } from '../../app/components/market/types';

interface MarketDataService {
  fetchMarketData(): Promise<Stock[]>;
  getLastUpdated(): Date | null;
  refreshData(): Promise<void>;
  checkRefreshStatus(): Promise<RefreshStatus>;
}

interface RefreshStatus {
  status: 'idle' | 'running' | 'complete';
  progress: number;
  current_ticker: string;
  total_tickers: number;
  processed_tickers: number;
  error: string | null;
}

class StaticMarketDataService implements MarketDataService {
  private readonly API_URL = process.env.NEXT_PUBLIC_API_URL;
  private lastUpdated: Date | null = null;
  private cache: Stock[] = [];
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private isFetching: boolean = false;

  private validateStockData(data: unknown[]): data is Stock[] {
    return Array.isArray(data) && data.every(item => 
      item && 
      typeof item === 'object' &&
      'symbol' in item &&
      typeof item.symbol === 'string' &&
      'price' in item &&
      !isNaN(Number(item.price)) &&
      'timestamp' in item &&
      typeof item.timestamp === 'string'
    );
  }

  private isDataValid(): boolean {
    return (
      this.cache.length > 0 &&
      this.lastUpdated !== null &&
      Date.now() - this.lastUpdated.getTime() < this.CACHE_DURATION
    );
  }

  private waitForCache(): Promise<Stock[]> {
    return new Promise((resolve) => {
      const checkCache = setInterval(() => {
        if (!this.isFetching && this.cache.length > 0) {
          clearInterval(checkCache);
          resolve(this.cache);
        }
      }, 100);
    });
  }

  async fetchMarketData(): Promise<Stock[]> {
    if (this.isDataValid()) {
      return this.cache;
    }

    if (this.isFetching) {
      return this.waitForCache();
    }

    this.isFetching = true;

    try {
      if (!this.API_URL) {
        throw new Error('API URL is not configured. Please check your environment variables.');
      }

      const response = await fetch(`${this.API_URL}/api/market-data`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();

      if (!this.validateStockData(data)) {
        throw new Error('Invalid market data format received from server');
      }

      // Update lastUpdated using the timestamp from the last item in the data array
      if (data.length > 0) {
        const lastItem = data[data.length - 1];
        this.lastUpdated = new Date(lastItem.timestamp);
      }
      
      this.cache = data;
      return this.cache;

    } catch (error) {
      console.error('Market data fetch error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (this.cache.length > 0) {
        console.warn('Returning cached data due to fetch error:', errorMessage);
        return this.cache;
      }
      throw new Error(`Failed to fetch market data: ${errorMessage}`);
    } finally {
      this.isFetching = false;
    }
  }

  async refreshData(): Promise<void> {
    if (!this.API_URL) {
      throw new Error('API URL is not configured');
    }

    const response = await fetch(`${this.API_URL}/api/market-data/refresh`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(
        data?.message || 
        `Failed to refresh data: ${response.status} ${response.statusText}`
      );
    }

    // Clear the cache to force a fresh fetch on next request
    this.cache = [];
    this.lastUpdated = null;
  }

  async checkRefreshStatus(): Promise<RefreshStatus> {
    if (!this.API_URL) {
      throw new Error('API URL is not configured');
    }

    const response = await fetch(
      `${this.API_URL}/api/market-data/refresh/status`,
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(
        data?.message || 
        `Failed to get refresh status: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  }

  getLastUpdated(): Date | null {
    return this.lastUpdated;
  }

  clearCache(): void {
    this.cache = [];
    this.lastUpdated = null;
  }
}

export const marketDataService = new StaticMarketDataService();