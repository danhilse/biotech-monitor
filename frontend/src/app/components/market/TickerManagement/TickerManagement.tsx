import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { Stock } from './types';
import { marketDataService } from '@/lib/services/marketDataService';
import { tickerService } from '@/lib/services/tickerService';

interface TickerManagementProps {
  onTickersUpdate?: () => Promise<void>;
}

interface DeleteConfirmation {
  symbol: string;
  name?: string;
  sector?: string;
}

const TickerManagement: React.FC<TickerManagementProps> = ({ onTickersUpdate }) => {
  const [managedTickers, setManagedTickers] = useState<Stock[]>([]);
  const [marketData, setMarketData] = useState<Record<string, { price: number; priceChange: number; volume: number }>>({});
  const [searchResults, setSearchResults] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmTicker, setConfirmTicker] = useState<Stock | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [addPwd, setAddPwd] = useState('');
  const [deletePwd, setDeletePwd] = useState('');
  const [pwdError, setPwdError] = useState<string | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load tickers on mount
  useEffect(() => {
    loadManagedTickers();
  }, []);

  const loadManagedTickers = async () => {
    try {
      const data = await marketDataService.fetchMarketData();
      const marketDataMap = data.reduce((acc, stock) => {
        acc[stock.symbol] = {
          price: stock.price,
          priceChange: stock.priceChange,
          volume: stock.volume || 0,
        };
        return acc;
      }, {} as Record<string, { price: number; priceChange: number; volume: number }>);
      setMarketData(marketDataMap);

      const tickers = await tickerService.getManagedTickers();
      const mappedTickers = tickers.map(ticker => ({
        ...ticker,
        price: marketDataMap[ticker.symbol]?.price || 0,
        priceChange: marketDataMap[ticker.symbol]?.priceChange || 0,
        volume: marketDataMap[ticker.symbol]?.volume || 0,
        marketCap: ticker.marketCap || 0,
        symbol: ticker.symbol,
        name: ticker.name,
        sector: ticker.sector || '',
        industry: ticker.industry || '',
      }));
      setManagedTickers(mappedTickers);
      setError(null);
    } catch (err) {
      console.error('Load error details:', err);
      setError('Failed to load market data');
    }
  };

  const searchTickers = useCallback(async () => {
    if (!debouncedQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const results = await tickerService.searchTickers(debouncedQuery);
      const completeResults: Stock[] = results.map(result => ({
        symbol: result.symbol,
        name: result.name,
        price: result.price || 0,
        priceChange: 0,
        volume: 0,
        marketCap: 0,
        sector: result.sector || '',
        industry: result.industry || '',
      }));
      setSearchResults(completeResults);
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search tickers');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery]);

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      searchTickers();
    } else {
      setSearchResults([]);
    }
  }, [debouncedQuery, searchTickers]);

  const handleAddTicker = (ticker: Stock) => {
    setConfirmTicker(ticker);
    setAddPwd('');
    setPwdError(null);
  };

  const confirmAdd = async () => {
    if (!confirmTicker) return;
    if (addPwd !== process.env.CONFIRM_PASSWORD) {
      setPwdError('Invalid password');
      return;
    }
    try {
      const success = await tickerService.addTicker(confirmTicker.symbol);
      if (success) {
        await loadManagedTickers();
        if (onTickersUpdate) await onTickersUpdate();
        setSearchQuery('');
        setSearchResults([]);
        setError(null);
      }
    } catch (err) {
      console.error('Add error:', err);
      setError('Failed to add ticker');
    } finally {
      setConfirmTicker(null);
      setAddPwd('');
      setPwdError(null);
    }
  };

  const handleDeleteTicker = (stock: Stock) => {
    setDeleteConfirm({
      symbol: stock.symbol,
      name: stock.name,
      sector: stock.sector,
    });
    setDeletePwd('');
    setPwdError(null);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    if (deletePwd !== process.env.CONFIRM_PASSWORD) {
      setPwdError('Invalid password');
      return;
    }
    try {
      const success = await tickerService.removeTicker(deleteConfirm.symbol);
      if (success) {
        await loadManagedTickers();
        if (onTickersUpdate) await onTickersUpdate();
        setError(null);
      }
    } catch (err) {
      console.error('Remove error:', err);
      setError('Failed to remove ticker');
    } finally {
      setDeleteConfirm(null);
      setDeletePwd('');
      setPwdError(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Add Section */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Search and Add Tickers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search for ticker or company name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              disabled={loading}
            />
          </div>
          <div className="mt-4">
            {loading && (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500">Searching...</p>
              </div>
            )}
            {!loading && searchQuery.length >= 2 && searchResults.length === 0 && (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500">No results found</p>
              </div>
            )}
            {!loading && searchResults.length > 0 && (
              <div className="space-y-2 grid grid-cols-3 gap-4">
                {searchResults.map((result) => (
                  <div
                    key={result.symbol}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{result.symbol}</p>
                      <p className="text-sm text-gray-600">{result.name}</p>
                      {result.sector && <p className="text-xs text-gray-500">{result.sector}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {result.isTracked ? (
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">Already Added</span>
                      ) : (
                        <Button size="sm" onClick={() => handleAddTicker(result)} className="ml-4">
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Managed Tickers Section */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Managed Tickers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 grid grid-cols-3 gap-4">
            {managedTickers.map((stock) => (
              <div
                key={stock.symbol}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div>
                  <p className="font-medium">{stock.symbol}</p>
                  <p className="text-sm text-gray-600">{stock.name}</p>
                  {stock.sector && <p className="text-xs text-gray-500">{stock.sector}</p>}
                </div>
                <div className="flex items-center gap-4">
                  {marketData[stock.symbol] && (
                    <div className="text-right">
                      <p className="text-sm font-medium">${marketData[stock.symbol].price.toFixed(2)}</p>
                      <p className={`text-xs ${marketData[stock.symbol].priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {marketData[stock.symbol].priceChange >= 0 ? '+' : ''}
                        {marketData[stock.symbol].priceChange.toFixed(2)}%
                      </p>
                    </div>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteTicker(stock)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
            {managedTickers.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                No tickers added yet. Search and add tickers above.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Confirmation Modal */}
      <Dialog
        open={confirmTicker !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmTicker(null);
            setAddPwd('');
            setPwdError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Stock to Dashboard</DialogTitle>
            <DialogDescription>
              Are you sure you want to add {confirmTicker?.symbol} ({confirmTicker?.name}) to your dashboard?
            </DialogDescription>
          </DialogHeader>
          {confirmTicker && (
            <div className="py-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Symbol:</span>
                  <span className="text-sm">{confirmTicker.symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Company:</span>
                  <span className="text-sm">{confirmTicker.name}</span>
                </div>
                {confirmTicker.sector && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Sector:</span>
                    <span className="text-sm">{confirmTicker.sector}</span>
                  </div>
                )}
                {confirmTicker.industry && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Industry:</span>
                    <span className="text-sm">{confirmTicker.industry}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="py-4">
            <Input
              type="password"
              placeholder="Enter password"
              value={addPwd}
              onChange={(e) => setAddPwd(e.target.value)}
            />
            {pwdError && <p className="text-red-500 text-xs mt-1">{pwdError}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmTicker(null);
                setAddPwd('');
                setPwdError(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={confirmAdd}>Add Stock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteConfirm(null);
            setDeletePwd('');
            setPwdError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Stock from Dashboard</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {deleteConfirm?.symbol} from your dashboard?
            </DialogDescription>
          </DialogHeader>
          {deleteConfirm && (
            <div className="py-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Symbol:</span>
                  <span className="text-sm">{deleteConfirm.symbol}</span>
                </div>
                {deleteConfirm.name && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Company:</span>
                    <span className="text-sm">{deleteConfirm.name}</span>
                  </div>
                )}
                {deleteConfirm.sector && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Sector:</span>
                    <span className="text-sm">{deleteConfirm.sector}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="py-4">
            <Input
              type="password"
              placeholder="Enter password"
              value={deletePwd}
              onChange={(e) => setDeletePwd(e.target.value)}
            />
            {pwdError && <p className="text-red-500 text-xs mt-1">{pwdError}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteConfirm(null);
                setDeletePwd('');
                setPwdError(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Remove Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TickerManagement;