"use client";
// MarketDashboard.tsx
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, RefreshCw, Circle } from 'lucide-react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { MarketScatterPlot } from './MarketScatterPlot/MarketScatterPlot';
import TimeSeriesStreamgraph from './addl_vis/time_series';
import { Stock, FilterType } from './types';
import { MarketDetailView } from './MarketDetailView';
import { useHistoricalData } from '@/lib/hooks/useHistoricalData';
import { marketDataService } from '@/lib/services/marketDataService';

const MarketDashboard = () => {
  const [marketData, setMarketData] = useState<Stock[]>([]);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter] = useState<FilterType>(null);
  const [activeView, setActiveView] = useState('scatter');
  
  const { 
    symbols, 
    historicalData, 
    loading: historicalLoading, 
    error: historicalError 
  } = useHistoricalData();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await marketDataService.fetchMarketData();
      setMarketData(data);
    } catch (err) {
      setError('Failed to load market data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const lastUpdated = marketDataService.getLastUpdated();

  if ((loading && marketData.length === 0) || historicalLoading) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600 font-medium">Loading market data...</p>
        </div>
      </div>
    );
  }

  const showError = error || historicalError;

  return (
    <div className="w-full space-y-6 p-6 bg-gray-50 min-h-screen">
      <Tabs value={activeView} onValueChange={setActiveView}>
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
            {/* <TabsList>
              <TabsTrigger value="scatter">Scatter Plot</TabsTrigger>
              <TabsTrigger value="timeseries">Time Series</TabsTrigger>
            </TabsList> */}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500 flex items-center">
              <Circle className="w-2 h-2 text-green-500 mr-2 animate-pulse" />
              {lastUpdated && `Last updated: ${lastUpdated.toLocaleTimeString()}`}
            </div>
            <button 
              onClick={fetchData}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <RefreshCw className="w-5 h-5 text-blue-500" />
            </button>
          </div>
        </div>

        {showError && (
          <Alert variant="destructive" className="animate-slide-in-top">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{showError}</AlertDescription>
          </Alert>
        )}

        <TabsContent value="scatter">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <Card className="bg-white shadow-sm col-span-1 lg:col-span-4">
              <CardContent className="pt-6">
                <MarketScatterPlot 
                  data={marketData}
                  activeFilter={activeFilter}
                  onStockSelect={(stockData) => {
                    const stock: Stock = {
                      ...stockData,
                      sector: '',
                      industry: '',
                      openPrice: 0,
                    };
                    setSelectedStock(stock);
                  }}
                />
              </CardContent>
            </Card>
            {/* <MarketFilters 
              data={marketData}
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
            /> */}
          </div>
        </TabsContent>
        
        <TabsContent value="timeseries">
          <Card className="w-full bg-white shadow-sm">
            <CardContent className="pt-6">
              <TimeSeriesStreamgraph
                symbols={symbols}
                historicalData={historicalData}
                loading={loading}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedStock && activeView === 'scatter' && <MarketDetailView stock={selectedStock} />}
    </div>
  );
};

export default MarketDashboard;