// src/lib/services/tickerService.ts
import { SearchResult } from '../types';

interface TickerService {
  searchTickers(query: string): Promise<SearchResult[]>;
  getManagedTickers(): Promise<SearchResult[]>;
  addTicker(symbol: string): Promise<boolean>;
  removeTicker(symbol: string): Promise<boolean>;
}

class StaticTickerService implements TickerService {
  private readonly API_BASE = 'http://localhost:8000/api';

  async searchTickers(query: string): Promise<SearchResult[]> {
    try {
      const response = await fetch(`${this.API_BASE}/search?query=${encodeURIComponent(query)}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.warn('Failed to search tickers:', error);
      return [];
    }
  }

  async getManagedTickers(): Promise<SearchResult[]> {
    try {
      const response = await fetch(`${this.API_BASE}/tickers`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const symbols = await response.json();
      
      // Fetch details for each ticker
      const detailPromises = symbols.map(async (symbol: string) => {
        try {
          const detailResponse = await fetch(`${this.API_BASE}/ticker-details/${symbol}`);
          if (detailResponse.ok) {
            const details = await detailResponse.json();
            return {
              symbol,
              name: details.name,
              sector: details.sector,
              industry: details.industry
            };
          }
          return { symbol, name: symbol, sector: '', industry: '' };
        } catch (error) {
          console.warn(`Failed to fetch details for ${symbol}:`, error);
          return { symbol, name: symbol, sector: '', industry: '' };
        }
      });

      return await Promise.all(detailPromises);
    } catch (error) {
      console.warn('Failed to fetch managed tickers:', error);
      return [];
    }
  }

  async addTicker(symbol: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE}/tickers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symbol })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success || false;

    } catch (error) {
      console.warn('Failed to add ticker:', error);
      return false;
    }
  }

  async removeTicker(symbol: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE}/tickers/${encodeURIComponent(symbol)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success || false;

    } catch (error) {
      console.warn('Failed to remove ticker:', error);
      return false;
    }
  }
}

// Create a singleton instance
export const tickerService = new StaticTickerService();