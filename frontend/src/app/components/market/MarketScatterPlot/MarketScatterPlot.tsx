import { useState, useMemo } from 'react';
import ParentSize from '@visx/responsive/lib/components/ParentSize';
import { Stock, FilterType } from '../types';
import { Chart } from './components/Chart';
import { ChartLegend } from './components/ChartLegend';
import { FilterGroup } from './components/FilterGroup';
import { Switch } from '@/components/ui/switch';

const calculateStandardDeviation = (values: number[]): number => {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map(value => Math.pow(value - mean, 2));
  const variance = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(variance);
};

const removeOutliers = (data: Stock[], stdDevMultiplier = 2): Stock[] => {
  const priceChanges = data.map(d => d.priceChange);
  const volumes = data.map(d => d.volumeMetrics?.volumeVsAvg ?? 0);
  
  const priceStdDev = calculateStandardDeviation(priceChanges);
  const volumeStdDev = calculateStandardDeviation(volumes);
  
  const priceMean = priceChanges.reduce((a, b) => a + b, 0) / priceChanges.length;
  const volumeMean = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  
  return data.filter(stock => {
    const priceDistance = Math.abs(stock.priceChange - priceMean);
    const volumeDistance = Math.abs((stock.volumeMetrics?.volumeVsAvg ?? 0) - volumeMean);
    
    return priceDistance <= stdDevMultiplier * priceStdDev && 
           volumeDistance <= stdDevMultiplier * volumeStdDev;
  });
};

const filterStocksFn = (stock: Stock, filter: FilterType): boolean => {
  const volumeVsAvg = stock.volumeMetrics?.volumeVsAvg ?? 0;

  switch (filter) {
    case 'smallCap':
      return stock.marketCap < 2000000000;
    case 'midCap':
      return stock.marketCap >= 2000000000 && stock.marketCap < 10000000000;
    case 'largeCap':
      return stock.marketCap >= 10000000000;
    case 'gainers':
      return stock.priceChange > 0;
    case 'decliners':
      return stock.priceChange < 0;
    case 'highVolume':
      return volumeVsAvg > 200;
    default:
      return true;
  }
};

interface Props {
  data: Stock[];
  onStockSelect: (stock: Stock | null) => void;
}

export const MarketScatterPlot = ({ data, onStockSelect }: Props) => {
  const [activeFilter, setActiveFilter] = useState<FilterType | null>(null);
  const [hoveredFilter, setHoveredFilter] = useState<FilterType | null>(null);
  const [removeOutliersEnabled, setRemoveOutliersEnabled] = useState(false);

  const displayData = useMemo(() => {
    // Generate a stable key for each stock that persists across toggle changes
    return (removeOutliersEnabled ? removeOutliers(data) : data).map(stock => ({
      ...stock,
      // This ensures React maintains component identity across updates
      stableKey: `${stock.symbol}-${stock.priceChange}-${stock.volumeMetrics?.volumeVsAvg ?? 0}`
    }));
  }, [data, removeOutliersEnabled]);

  const handleFilterSelect = (filter: FilterType) => {
    setActiveFilter(currentFilter => currentFilter === filter ? null : filter);
  };

  if (data.length === 0) {
    return (
      <div className="h-[500px] flex items-center justify-center bg-gray-50 rounded-lg">
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-4">
          <FilterGroup
            label="Small Cap"
            filterType="smallCap"
            activeFilter={activeFilter}
            onHover={setHoveredFilter}
            onSelect={handleFilterSelect}
          >
            Small Cap
          </FilterGroup>
          <FilterGroup
            label="Large Cap" 
            filterType="largeCap"
            activeFilter={activeFilter}
            onHover={setHoveredFilter}
            onSelect={handleFilterSelect}
          >
            Large Cap
          </FilterGroup>
          <FilterGroup
            label="Gainers"
            filterType="gainers" 
            activeFilter={activeFilter}
            onHover={setHoveredFilter}
            onSelect={handleFilterSelect}
          >
            Gainers
          </FilterGroup>
          <FilterGroup
            label="Decliners"
            filterType="decliners"
            activeFilter={activeFilter}
            onHover={setHoveredFilter}
            onSelect={handleFilterSelect}
          >
            Decliners
          </FilterGroup>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Remove Outliers</span>
          <Switch
            checked={removeOutliersEnabled}
            onCheckedChange={setRemoveOutliersEnabled}
          />
        </div>
      </div>

      <div className="h-[500px]">
        <ParentSize>
          {({ width, height }) => (
            <Chart
              data={displayData}
              activeFilter={activeFilter}
              hoveredFilter={hoveredFilter}
              filterStocksFn={filterStocksFn}
              onStockSelect={onStockSelect}
              width={width}
              height={height}
              removeOutliersEnabled={removeOutliersEnabled}
            />
          )}
        </ParentSize>
      </div>
      <ChartLegend />
    </div>
  );
};

export default MarketScatterPlot;