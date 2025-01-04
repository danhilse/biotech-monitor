
// hooks/useHistoricalData.ts
import { useState, useEffect } from 'react';
import { StockHistoricalData } from '../types';
import { HistoricalDataService } from '../services/historicalDataService';

export const useHistoricalData = () => {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [historicalData, setHistoricalData] = useState<Record<string, StockHistoricalData[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      // First get available symbols
      const availableSymbols = await HistoricalDataService.fetchAvailableSymbols();
      setSymbols(availableSymbols);

      // Then fetch historical data for each symbol
      const historicalDataMap: Record<string, StockHistoricalData[]> = {};
      await Promise.all(
        availableSymbols.map(async (symbol) => {
          try {
            const data = await HistoricalDataService.fetchHistoricalData(symbol);
            historicalDataMap[symbol] = data;
          } catch (err) {
            console.error(`Failed to fetch data for ${symbol}:`, err);
            // Continue with other symbols even if one fails
            historicalDataMap[symbol] = [];
          }
        })
      );
      setHistoricalData(historicalDataMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load historical data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  return {
    symbols,
    historicalData,
    loading,
    error,
    refetch: fetchAllData
  };
};