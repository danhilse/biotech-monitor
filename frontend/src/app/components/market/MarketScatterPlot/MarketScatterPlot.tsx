import { useState } from 'react';
import ParentSize from '@visx/responsive/lib/components/ParentSize';
import { Stock, FilterType } from '../types';
import { Chart } from './components/Chart';
import { ChartLegend } from './components/ChartLegend';
import { FilterGroup } from './components/FilterGroup';

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
      return volumeVsAvg > 200; // 200% above average volume
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
      <div className="flex gap-4 mb-4">
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
      <div className="h-[500px]">
        <ParentSize>
          {({ width, height }) => (
            <Chart
              data={data}
              activeFilter={activeFilter}
              hoveredFilter={hoveredFilter}
              filterStocksFn={filterStocksFn}
              onStockSelect={onStockSelect}
              width={width}
              height={height}
            />
          )}
        </ParentSize>
      </div>
      <ChartLegend />
    </div>
  );
};

export default MarketScatterPlot;