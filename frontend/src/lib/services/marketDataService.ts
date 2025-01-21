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

  private validateStockData(data: any[]): boolean {
    return Array.isArray(data) && data.every(item => 
      item && 
      typeof item === 'object' &&
      typeof item.symbol === 'string' &&
      !isNaN(Number(item.price))
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
      // Update the URL to include the backend server address
      const response = await fetch(`${this.API_URL}/api/market-data`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!this.validateStockData(data)) {
        throw new Error('Invalid market data format');
      }

      this.cache = data;
      this.lastUpdated = new Date();

      return this.cache;

    } catch (error) {
      console.error('Market data fetch error:', error);
      if (this.cache.length > 0) {
        console.warn('Returning cached data due to fetch error');
        return this.cache;
      }
      throw error;
    } finally {
      this.isFetching = false;
    }
  }

  getLastUpdated(): Date | null {
    return this.lastUpdated;
  }
}

export const marketDataService = new StaticMarketDataService();