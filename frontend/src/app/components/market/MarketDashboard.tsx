"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, RefreshCw, Circle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MarketScatterPlot } from './MarketScatterPlot/MarketScatterPlot';
import { Stock, FilterType } from './types';
import { MarketDetailView } from './MarketDetailView';
import TickerManagement from './TickerManagement/TickerManagement';
import { marketDataService } from '@/lib/services/marketDataService';

const MarketDashboard = () => {
  const [marketData, setMarketData] = useState<Stock[]>([]);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter] = useState<FilterType>(null);
  const [activeTab, setActiveTab] = useState('market');
  
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await marketDataService.fetchMarketData();
      setMarketData(data);
    } catch (err) {
      setError('Failed to load market data: ' + String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const lastUpdated = marketDataService.getLastUpdated();

  if (loading && marketData.length === 0) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600 font-medium">Loading market data...</p>
        </div>
      </div>
    );
  }

  const handleStockSelect = (stockData: any) => {
    if (!stockData) {
      setSelectedStock(null);
      return;
    }
    
    const stock: Stock = {
      ...stockData,
      symbol: stockData.symbol || '',
      sector: stockData.sector || '',
      industry: stockData.industry || '',
      openPrice: stockData.openPrice || 0,
    };
    setSelectedStock(stock);
  };

  const handleRefresh = async () => {
    await fetchData();
  };

  return (
    <div className="w-full space-y-6 p-6 bg-gray-50 min-h-screen">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center gap-8">
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                Biotech Market Overview
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                Tracking {marketData.length} stocks in real-time
              </p>
            </div>
            <TabsList className="bg-gray-100">
              <TabsTrigger value="market" className="data-[state=active]:bg-white">
                Market View
              </TabsTrigger>
              <TabsTrigger value="tickers" className="data-[state=active]:bg-white">
                Manage Tickers
              </TabsTrigger>
            </TabsList>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500 flex items-center">
              <Circle className="w-2 h-2 text-green-500 mr-2 animate-pulse" />
              {lastUpdated && `Last updated: ${lastUpdated.toLocaleTimeString()}`}
            </div>
            <button 
              onClick={handleRefresh}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Refresh data"
            >
              <RefreshCw className="w-5 h-5 text-blue-500" />
            </button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="animate-slide-in-top">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <TabsContent value="market" className="mt-6">
          <div className="grid grid-cols-1 gap-6">
            <Card className="bg-white shadow-sm">
              <CardContent className="pt-6">
                <MarketScatterPlot 
                  data={marketData}
                  activeFilter={activeFilter}
                  onStockSelect={handleStockSelect}
                />
              </CardContent>
            </Card>

            {selectedStock && (
              <MarketDetailView 
                stock={selectedStock}
                onClose={() => setSelectedStock(null)}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="tickers" className="mt-6">
          <TickerManagement 
            onTickersUpdate={fetchData}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MarketDashboard;