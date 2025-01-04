import { TooltipWithBounds, defaultStyles } from '@visx/tooltip';
import { AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import { Stock } from '../../types';
import { formatNumber, formatPercentage } from '../../utils';
import { useCallback, useState, useEffect } from 'react';


// Create a cache context outside of component to persist across renders
const imageCache = new Map<string, {
  loaded: boolean;
  error: boolean;
}>();

const tooltipStyles = {
  ...defaultStyles,
  backgroundColor: 'white',
  color: 'black',
  border: '1px solid #ccc',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
};

interface StockTooltipProps {
  stock: Stock;
  top?: number;
  left?: number;
}

// // Derive consistent colors from company symbol
// const getPatternColors = (symbol: string) => {
//   const hash = symbol.split('').reduce((acc, char) => {
//     return char.charCodeAt(0) + ((acc << 5) - acc);
//   }, 0);
  
//   const hue1 = Math.abs(hash % 360);
//   const hue2 = (hue1 + 40) % 360;
  
//   return {
//     primary: `hsl(${hue1}, 70%, 85%)`,
//     secondary: `hsl(${hue2}, 60%, 80%)`
//   };
// };

const PatternPlaceholder = ({ symbol, id }: { symbol: string, id: string }) => {
  const patternId = `company-pattern-${id}`;
  
  return (
    <>
      <svg width="40" height="40" className="rounded">
        <rect width="40" height="40" fill={`url(#${patternId})`} />
        <text
          x="50%"
          y="50%"
          fontSize="16"
          fontWeight="bold"
          fill="#666"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {symbol[0]}
        </text>
      </svg>
    </>
  );
};

// Create a standalone image component that handles caching
const CachedStockImage = ({ 
  symbol, 
  url, 
  onLoadStatusChange 
}: { 
  symbol: string;
  url: string;
  onLoadStatusChange: (loaded: boolean, error: boolean) => void;
}) => {
  const [localLoaded, setLocalLoaded] = useState(() => {
    return imageCache.get(url)?.loaded ?? false;
  });
  const [localError, setLocalError] = useState(() => {
    return imageCache.get(url)?.error ?? false;
  });

  useEffect(() => {
    // Check cache on mount
    const cached = imageCache.get(url);
    if (cached) {
      setLocalLoaded(cached.loaded);
      setLocalError(cached.error);
      onLoadStatusChange(cached.loaded, cached.error);
    }
  }, [url, onLoadStatusChange]);

  const handleLoad = useCallback(() => {
    imageCache.set(url, { loaded: true, error: false });
    setLocalLoaded(true);
    setLocalError(false);
    onLoadStatusChange(true, false);
  }, [url, onLoadStatusChange]);

  const handleError = useCallback(() => {
    imageCache.set(url, { loaded: false, error: true });
    setLocalLoaded(false);
    setLocalError(true);
    onLoadStatusChange(false, true);
  }, [url, onLoadStatusChange]);

  if (localError) return null;

  return (
    <Image 
      src={url}
      alt={`${symbol} logo`}
      width={40}
      height={40}
      className={`rounded absolute top-0 left-0 transition-opacity duration-300 ${
        localLoaded ? 'opacity-100' : 'opacity-0'
      }`}
      onLoad={handleLoad}
      onError={handleError}
      loading="eager" // Prevent lazy loading within the tooltip
    />
  );
};

export const StockTooltip = ({ stock, top, left }: StockTooltipProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const tooltipId = `${stock.symbol}-${Math.random().toString(36).substr(2, 9)}`;
  
  const handleImageStatusChange = useCallback((loaded: boolean, error: boolean) => {
    setImageLoaded(loaded);
    setImageError(error);
  }, []);

  const showPlaceholder = !stock.branding?.icon_url || !imageLoaded || imageError;

  return (
    <TooltipWithBounds
      key={`tooltip-${stock.symbol}`} // Use symbol instead of random to prevent unnecessary rerenders
      top={top}
      left={left}
      style={tooltipStyles}
      unstyled={true}
      className="absolute opacity-95 z-50 bg-white/80 backdrop-blur-sm rounded-lg shadow-lg border border-gray-100"
        >
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="relative w-10 h-10">
            {stock.branding?.icon_url && !imageError && (
              <CachedStockImage
                symbol={stock.symbol}
                url={stock.branding.icon_url}
                onLoadStatusChange={handleImageStatusChange}
              />
            )}
            {showPlaceholder && (
              <PatternPlaceholder symbol={stock.symbol} id={tooltipId} />
            )}
          </div>
          <div>
            <span className="font-bold text-lg">{stock.symbol}</span>
            <span className={`ml-2 text-sm px-2 py-0.5 rounded ${
              stock.priceChange > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {formatPercentage(stock.priceChange)}
            </span>
          </div>
        </div>
        
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Price:</span>
            <span className="font-medium">${stock.price.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">52W Range:</span>
            <span className="font-medium">
              ${stock.fiftyTwoWeekLow.toFixed(2)} - ${stock.fiftyTwoWeekHigh.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Volume:</span>
            <span className="font-medium">{formatNumber(stock.volume)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Volume vs Avg:</span>
            <span className={`font-medium ${
              stock.volumeMetrics.volumeVsAvg > 0 ? 'text-green-600' : 
              stock.volumeMetrics.volumeVsAvg < 0 ? 'text-red-600' : 'text-gray-600'
            }`}>
              {formatPercentage(stock.volumeMetrics.volumeVsAvg)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Market Cap:</span>
            <span className="font-medium">${formatNumber(stock.marketCap)}</span>
          </div>
        </div>

        {stock.alerts > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-1 text-yellow-600">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">{stock.alerts} Active Alerts</span>
            </div>
          </div>
        )}
      </div>
    </TooltipWithBounds>
  );
};