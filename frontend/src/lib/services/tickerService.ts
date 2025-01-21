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

  
  // In tickerService.ts
  async getManagedTickers(): Promise<SearchResult[]> {
    try {
      console.log('Calling getManagedTickers API...'); // Debug log
      const response = await fetch(`${this.API_BASE}/tickers`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error:', response.status, errorText); // Debug log
        throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
      }

      const data = await response.json();
      console.log('API response:', data); // Debug log
      
      const tickers = data.tickers || [];
      const results = tickers.map(ticker => ({
        symbol: ticker.symbol,
        name: ticker.name || ticker.symbol,
        sector: ticker.sector || '',
        industry: ticker.industry || '',
        names: ticker.names || {}
      }));

      console.log('Processed results:', results); // Debug log
      return results;
    } catch (error) {
      console.error('Failed to fetch managed tickers:', error); // More detailed error logging
      throw error; // Rethrow to handle in component
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