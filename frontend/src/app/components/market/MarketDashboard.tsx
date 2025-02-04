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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface RefreshStatus {
  status: 'idle' | 'running' | 'complete';
  progress: number;
  current_ticker: string;
  total_tickers: number;
  processed_tickers: number;
  error: string | null;
}

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
  const [lastUpdated, setLastUpdated] = useState<Date | null>(marketDataService.getLastUpdated());

  // Refresh modal state
  const [refreshModalOpen, setRefreshModalOpen] = useState(false);
  const [refreshPwd, setRefreshPwd] = useState('');
  const [refreshPwdError, setRefreshPwdError] = useState<string | null>(null);

  const POLLING_INTERVAL = 5000;


  const formatDate = (date: Date | null) => {
    if (!date) return null;
    return date.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

   const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await marketDataService.fetchMarketData();
      setMarketData(data);
      setLastUpdated(marketDataService.getLastUpdated());
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to load market data: ' + String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // On mount, check if refresh is in progress and start polling if so.
  useEffect(() => {
    const checkInitialRefreshStatus = async () => {
      try {
        const status = await marketDataService.checkRefreshStatus();
        if (status.status === 'running') {
          setRefreshing(true);
          setRefreshStatus(status);
          pollRefreshStatus();
        }
      } catch (error) {
        console.error('Initial refresh status check error:', error);
      }
    };
    checkInitialRefreshStatus();
  }, []);

  const pollRefreshStatus = async () => {
    try {
      const status = await marketDataService.checkRefreshStatus();
      setRefreshStatus(status);
      if (status.status === 'running') {
        setTimeout(pollRefreshStatus, POLLING_INTERVAL);
      } else if (status.status === 'complete') {
        await fetchData();
        setRefreshing(false);
        setRefreshStatus(null);
        setKey((prev) => prev + 1);
      }
    } catch (error) {
      console.error('Refresh status poll error:', error);
      setRefreshing(false);
      setRefreshStatus(null);
    }
  };

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

  const handleOutsideClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) setSelectedStock(null);
  };

  const handleStockSelect = (stock: Stock | null) => setSelectedStock(stock);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      await marketDataService.refreshData();
      pollRefreshStatus();
    } catch (error) {
      console.error('Refresh trigger error:', error);
      setError(`Failed to refresh data: ${error instanceof Error ? error.message : String(error)}`);
      setRefreshing(false);
    }
  };


  // NEW: Confirm refresh with password
  const confirmRefresh = async () => {
    if (refreshPwd !== process.env.CONFIRM_PASSWORD) {
      setRefreshPwdError('Invalid password');
      return;
    }
    setRefreshPwdError(null);
    setRefreshModalOpen(false);
    setRefreshPwd('');
    await handleRefresh();
  };

  return (
    <div className="w-full space-y-6 p-6 bg-gray-50 min-h-screen" key={key}>
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
                {lastUpdated && `Last updated: ${formatDate(lastUpdated)}`}
              </div>
              <button
                onClick={() => setRefreshModalOpen(true)}
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
                <span>
                  {refreshStatus.processed_tickers} / {refreshStatus.total_tickers} tickers
                </span>
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

        <TabsContent value="market" className="mt-6">
          <div className="grid grid-cols-1 gap-6" onClick={handleOutsideClick}>
            <Card className="bg-white shadow-sm">
              <CardContent className="pt-6">
                <MarketScatterPlot data={marketData} activeFilter={activeFilter} onStockSelect={handleStockSelect} />
              </CardContent>
            </Card>
            {selectedStock && <MarketDetailView stock={selectedStock} onClose={() => setSelectedStock(null)} />}
          </div>
        </TabsContent>

        <TabsContent value="tickers" className="mt-6">
          <TickerManagement onTickersUpdate={fetchData} />
        </TabsContent>
      </Tabs>

      {/* Refresh Password Modal */}
      <Dialog
        open={refreshModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setRefreshModalOpen(false);
            setRefreshPwd('');
            setRefreshPwdError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refresh Market Data</DialogTitle>
            <DialogDescription>Enter password to refresh market data.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="password"
              placeholder="Enter password"
              value={refreshPwd}
              onChange={(e) => setRefreshPwd(e.target.value)}
            />
            {refreshPwdError && <p className="text-red-500 text-xs mt-1">{refreshPwdError}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRefreshModalOpen(false);
                setRefreshPwd('');
                setRefreshPwdError(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={confirmRefresh}>Refresh Data</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MarketDashboard;