import { useState, useMemo } from 'react';
import ParentSize from '@visx/responsive/lib/components/ParentSize';
import { Stock, FilterType } from '../types';
import { Chart } from './components/Chart';
import { ChartLegend } from './components/ChartLegend';
import { FilterGroup } from './components/FilterGroup';
import TriStateSwitch, { TriStateSwitchValue } from './components/TriStateSwitch';

type OutlierMode = 'all' | 'remove' | 'only';

const triStateToOutlierMode: Record<TriStateSwitchValue, OutlierMode> = {
  'left': 'remove',
  'center': 'all',
  'right': 'only'
};

const outlierModeToTriState: Record<OutlierMode, TriStateSwitchValue> = {
  'remove': 'left',
  'all': 'center',
  'only': 'right'
};

const calculateStandardDeviation = (values: number[]): number => {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map(value => Math.pow(value - mean, 2));
  const variance = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(variance);
};

const filterOutliers = (data: Stock[], mode: OutlierMode, stdDevMultiplier = 2): Stock[] => {
  if (mode === 'all') return data;

  const priceChanges = data.map(d => d.priceChange);
  const volumes = data.map(d => d.volumeMetrics?.volumeVsAvg ?? 0);
  
  const priceStdDev = calculateStandardDeviation(priceChanges);
  const volumeStdDev = calculateStandardDeviation(volumes);
  
  const priceMean = priceChanges.reduce((a, b) => a + b, 0) / priceChanges.length;
  const volumeMean = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  
  return data.filter(stock => {
    const priceDistance = Math.abs(stock.priceChange - priceMean);
    const volumeDistance = Math.abs((stock.volumeMetrics?.volumeVsAvg ?? 0) - volumeMean);
    const isOutlier = priceDistance > stdDevMultiplier * priceStdDev || 
                     volumeDistance > stdDevMultiplier * volumeStdDev;
    
    return mode === 'only' ? isOutlier : !isOutlier;
  });
};

interface Props {
  data: Stock[];
  onStockSelect: (stock: Stock | null) => void;
}

interface FilterThresholds {
  gainers: number;
  decliners: number;
  highVolume: number;
}

const filterStocksFn = (stock: Stock, filter: FilterType, thresholds: FilterThresholds): boolean => {
  const volumeVsAvg = stock.volumeMetrics?.volumeVsAvg ?? 0;

  switch (filter) {
    case 'smallCap':
      return stock.marketCap < 2000000000;
    case 'largeCap':
      return stock.marketCap >= 10000000000;
    case 'gainers':
      return stock.priceChange >= thresholds.gainers;
    case 'decliners':
      return stock.priceChange <= -thresholds.decliners;
    case 'highVolume':
      return volumeVsAvg >= thresholds.highVolume;
    default:
      return true;
  }
};

export const MarketScatterPlot = ({ data, onStockSelect }: Props) => {
  const [activeFilter, setActiveFilter] = useState<FilterType | null>(null);
  const [hoveredFilter, setHoveredFilter] = useState<FilterType | null>(null);
  const [outlierMode, setOutlierMode] = useState<OutlierMode>('all');
  
  // Calculate ranges from data
  const dataRanges = useMemo(() => {
    const priceChanges = data.map(d => d.priceChange);
    const volumes = data.map(d => d.volumeMetrics?.volumeVsAvg ?? 0);

    return {
      priceChange: {
        min: Math.floor(Math.min(...priceChanges)),
        max: Math.ceil(Math.max(...priceChanges))
      },
      volume: {
        min: Math.floor(Math.min(...volumes)),
        max: Math.ceil(Math.max(...volumes))
      }
    };
  }, [data]);

  // Initialize thresholds with sensible defaults based on data ranges
  const [thresholds, setThresholds] = useState<FilterThresholds>(() => ({
    gainers: Math.min(5, Math.max(1, Math.floor(dataRanges.priceChange.max / 4))),
    decliners: Math.min(5, Math.max(1, Math.floor(Math.abs(dataRanges.priceChange.min) / 4))),
    highVolume: Math.min(200, Math.max(1, Math.floor(dataRanges.volume.max / 4)))
  }));

  const displayData = useMemo(() => {
    return filterOutliers(data, outlierMode).map(stock => ({
      ...stock,
      stableKey: `${stock.symbol}-${stock.priceChange}-${stock.volumeMetrics?.volumeVsAvg ?? 0}`
    }));
  }, [data, outlierMode]);

  const handleFilterSelect = (filter: FilterType) => {
    setActiveFilter(currentFilter => currentFilter === filter ? null : filter);
  };

  const handleThresholdChange = (filter: 'gainers' | 'decliners' | 'highVolume', value: number) => {
    setThresholds(prev => ({
      ...prev,
      [filter]: value
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
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
          
          <div className="w-px h-6 bg-gray-200 mx-2" />
          
          <FilterGroup
            label="Gainers"
            filterType="gainers"
            activeFilter={activeFilter}
            onHover={setHoveredFilter}
            onSelect={handleFilterSelect}
            threshold={thresholds.gainers}
            onThresholdChange={(value) => handleThresholdChange('gainers', value)}
            sliderConfig={{
              min: 0,
              max: dataRanges.priceChange.max,
              step: 0.1
            }}
          >
            Gainers
          </FilterGroup>
          <FilterGroup
            label="Decliners"
            filterType="decliners"
            activeFilter={activeFilter}
            onHover={setHoveredFilter}
            onSelect={handleFilterSelect}
            threshold={thresholds.decliners}
            onThresholdChange={(value) => handleThresholdChange('decliners', value)}
            sliderConfig={{
              min: 0,
              max: Math.abs(dataRanges.priceChange.min),
              step: 0.1
            }}
          >
            Decliners
          </FilterGroup>
          <FilterGroup
            label="High Volume"
            filterType="highVolume"
            activeFilter={activeFilter}
            onHover={setHoveredFilter}
            onSelect={handleFilterSelect}
            threshold={thresholds.highVolume}
            onThresholdChange={(value) => handleThresholdChange('highVolume', value)}
            sliderConfig={{
              min: 0,
              max: dataRanges.volume.max,
              step: 1
            }}
          >
            High Volume
          </FilterGroup>
        </div>

        <div className="flex items-center gap-2 pl-8 border-l border-gray-200">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Outliers:</span>
          <TriStateSwitch
            value={outlierModeToTriState[outlierMode]}
            onChange={(value) => setOutlierMode(triStateToOutlierMode[value])}
            leftLabel="Remove"
            rightLabel="Only"
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
              filterStocksFn={(stock, filter) => filterStocksFn(stock, filter, thresholds)}
              onStockSelect={onStockSelect}
              width={width}
              height={height}
              outlierMode={outlierMode}
            />
          )}
        </ParentSize>
      </div>
      <ChartLegend />
    </div>
  );
};

export default MarketScatterPlot;