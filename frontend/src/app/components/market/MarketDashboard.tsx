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
import { Progress } from '@/components/ui/progress';

// Add these types
interface RefreshStatus {
  status: 'idle' | 'running' | 'complete';
  progress: number;
  current_ticker: string;
  total_tickers: number;
  processed_tickers: number;
  error: string | null;
}

// Add this type near the top with your other interfaces
// interface StockData {
//   symbol?: string;
//   sector?: string;
//   industry?: string;
//   openPrice?: number;
//   [key: string]: string | number | undefined; // specify possible value types
// }


const MarketDashboard = () => {
  const [marketData, setMarketData] = useState<Stock[]>([]);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter] = useState<FilterType>(null);
  const [activeTab, setActiveTab] = useState('market');
  const [refreshStatus, setRefreshStatus] = useState<RefreshStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [key, setKey] = useState(0);


  const handleOutsideClick = (event: React.MouseEvent) => {
    // Only reset if clicking directly on the container (not its children)
    if (event.target === event.currentTarget) {
      setSelectedStock(null);
    }
  };
 
  
  
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

  const handleStockSelect = (stock: Stock | null) => {
    setSelectedStock(stock);
  };

  // Add this function to check refresh status
  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/market-data/refresh`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json().catch(() => ({
        status: 'error',
        message: 'Failed to parse server response'
      }));
      
      if (!response.ok || data?.status === 'error') {
        throw new Error(data?.message || `Server error: ${response.status}`);
      }
      
      // Start polling for status only if the refresh was started successfully
      if (data?.status === 'started') {
        checkRefreshStatus();
      }
    } catch (error) {
      console.error('Error triggering refresh:', error);
      setError(`Failed to refresh data: ${error instanceof Error ? error.message : String(error)}`);
      setRefreshing(false);
    }
  };
  
  const checkRefreshStatus = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/market-data/refresh/status`,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        }
      );
  
      const data = await response.json().catch(() => null);
      
      if (!response.ok) {
        throw new Error(
          data?.message || 
          `Failed to get refresh status: ${response.status} ${response.statusText}`
        );
      }
      
      setRefreshStatus(data);
      
      if (data.status === 'running') {
        // Continue polling
        setTimeout(checkRefreshStatus, 1000);
      } else if (data.status === 'complete') {
        // Refresh the market data and update components
        await fetchData();
        setRefreshing(false);
        setRefreshStatus(null);
        
        // Force re-render of child components by updating a key
        setKey(prev => prev + 1); // Add this state variable
      }
    } catch (error) {
      console.error('Error checking refresh status:', error);
      setError(`Failed to check refresh status: ${error instanceof Error ? error.message : String(error)}`);
      setRefreshing(false);
      setRefreshStatus(null);
    }
  };


  return (
    <div className="w-full space-y-6 p-6 bg-gray-50 min-h-screen">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="space-y-4">
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
                disabled={refreshing}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
                aria-label="Refresh data"
              >
                <RefreshCw className={`w-5 h-5 text-blue-500 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {refreshStatus && refreshStatus.status === 'running' && (
            <div className="p-4 bg-white rounded-lg shadow-sm">
              <div className="mb-2 flex justify-between text-sm text-gray-600">
                <span>Collecting market data...</span>
                <span>{refreshStatus.processed_tickers} / {refreshStatus.total_tickers} tickers</span>
              </div>
              <Progress value={refreshStatus.progress} className="h-2" />
              <p className="mt-2 text-xs text-gray-500">
                Currently processing: {refreshStatus.current_ticker}
              </p>
            </div>
          )}

          {refreshStatus?.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Error refreshing data: {refreshStatus.error}</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive" className="animate-slide-in-top">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <TabsContent value="market" className="mt-6" key={key}>
          <div 
            className="grid grid-cols-1 gap-6" 
            onClick={handleOutsideClick}
          >
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