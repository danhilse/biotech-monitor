// services/marketDataService.ts
import { Stock } from '../../app/components/market/types';

interface MarketDataService {
  fetchMarketData(): Promise<Stock[]>;
  getLastUpdated(): Date | null;
}

class StaticMarketDataService implements MarketDataService {
  private readonly API_URL = process.env.NEXT_PUBLIC_API_URL;
  private lastUpdated: Date | null = null;
  private cache: Stock[] = [];
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private isFetching: boolean = false;

  private validateStockData(data: unknown[]): boolean {
    return Array.isArray(data) && data.every(item => 
      item && 
      typeof item === 'object' &&
      'symbol' in item &&
      typeof (item as { symbol: string }).symbol === 'string' &&
      'price' in item &&
      !isNaN(Number((item as { price: number }).price))
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

      this.cache = data;
      this.lastUpdated = new Date();

      return this.cache;

    } catch (error) {
      console.error('Market data fetch error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      if (this.cache.length > 0) {
        console.warn('Returning cached data due to fetch error:', errorMessage);
        return this.cache;
      }
      throw new Error(`Failed to fetch market data: ${errorMessage}`);
    } finally {
      this.isFetching = false;
    }
  }

  getLastUpdated(): Date | null {
    return this.lastUpdated;
  }
}

export const marketDataService = new StaticMarketDataService();