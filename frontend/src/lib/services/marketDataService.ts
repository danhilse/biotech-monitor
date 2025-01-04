// services/marketDataService.ts
import { Stock } from '../../app/components/market/types';

interface MarketDataService {
  fetchMarketData(): Promise<Stock[]>;
  getLastUpdated(): Date | null;
}

class StaticMarketDataService implements MarketDataService {
  private lastUpdated: Date | null = null;
  private cache: Stock[] = [];
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private isFetching: boolean = false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  async fetchMarketData(): Promise<Stock[]> {
    // Return cached data if valid
    if (this.isDataValid()) {
      return this.cache;
    }

    // Prevent multiple simultaneous fetches
    if (this.isFetching) {
      return new Promise((resolve) => {
        const checkCache = setInterval(() => {
          if (!this.isFetching && this.cache.length > 0) {
            clearInterval(checkCache);
            resolve(this.cache);
          }
        }, 100);
      });
    }

    this.isFetching = true;

    try {
      // Updated path to match the actual file location
      const response = await fetch('/data/market_data.json', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Validate data structure
      if (!this.validateStockData(data)) {
        throw new Error('Invalid market data format');
      }

      // Process and store the data
      this.cache = data;
      this.lastUpdated = new Date(data[0]?.timestamp || Date.now());

      return this.cache;

    } catch (error) {
      console.error('Market data fetch error:', error);

      // If we have cached data, return it as fallback
      if (this.cache.length > 0) {
        console.warn('Returning cached data due to fetch error');
        return this.cache;
      }

      throw new Error(
        error instanceof Error ? error.message : 'Failed to fetch market data'
      );

    } finally {
      this.isFetching = false;
    }
  }

  getLastUpdated(): Date | null {
    return this.lastUpdated;
  }
}

// Create a singleton instance
export const marketDataService = new StaticMarketDataService();