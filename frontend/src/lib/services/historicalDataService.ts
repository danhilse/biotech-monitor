// lib/services/historicalDataService.ts
import { StockHistoricalData } from '../types';

const API_BASE_URL = 'http://localhost:8000/api';

export class HistoricalDataService {
  private static async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  static async fetchAvailableSymbols(): Promise<string[]> {
    try {
      // Check if the server is available
      const isHealthy = await this.checkHealth();
      if (!isHealthy) {
        throw new Error('Server is not available');
      }

      const response = await fetch(`${API_BASE_URL}/stocks`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching symbols:', error);
      throw new Error('Failed to fetch symbols. Please ensure the backend server is running.');
    }
  }

  static async fetchHistoricalData(
    symbol: string, 
    timeframe: string = '1Y'
  ): Promise<StockHistoricalData[]> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/stocks/${symbol}?timeframe=${timeframe}`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error);
      throw new Error(`Failed to fetch data for ${symbol}`);
    }
  }
}
