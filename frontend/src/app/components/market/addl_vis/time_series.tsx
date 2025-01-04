import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const METRICS = {
  PRICE: 'Price',
  RELATIVE: 'Relative Performance',
  VOLUME: 'Volume'
} as const;

type MetricType = typeof METRICS[keyof typeof METRICS];

const CustomTooltip = ({ active, payload, label, metricType }) => {
  if (!active || !payload || !payload.length) return null;

  const hoveredPoint = payload[0];
  let displayValue = hoveredPoint.value;

  // Format the value based on metric type
  const formattedValue = (() => {
    switch (metricType) {
      case METRICS.RELATIVE:
        return `${Math.min(displayValue, 700).toFixed(1)}%`;
      case METRICS.VOLUME:
        return `${(Math.min(displayValue, 100000000) / 1000000).toFixed(1)}M`;
      default:
        return `$${displayValue.toFixed(2)}`;
    }
  })();

  return (
    <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-sm font-medium">
        <span className="mr-2" style={{ color: hoveredPoint.color }}>
          {hoveredPoint.dataKey}:
        </span>
        {formattedValue}
      </p>
      {metricType === METRICS.RELATIVE && (
        <p className="text-xs text-gray-500 mt-1">
          vs. starting price
        </p>
      )}
    </div>
  );
};

const TimeSeriesChart = ({ symbols, historicalData, loading }) => {
  const [metricType, setMetricType] = useState<MetricType>(METRICS.RELATIVE);

  const chartData = useMemo(() => {
    if (!historicalData || !symbols.length) return [];

    // Get the first symbol's dates as reference
    const baseSymbol = symbols[0];
    const baseDates = (historicalData[baseSymbol] || []).map(d => d.timestamp);
    
    return baseDates.map((date, dateIndex) => {
      const dataPoint = {
        date: new Date(date).toLocaleDateString(),
      };
      
      symbols.forEach(symbol => {
        const symbolData = historicalData[symbol] || [];
        if (symbolData[dateIndex]) {
          const currentData = symbolData[dateIndex];
          
          switch (metricType) {
            case METRICS.RELATIVE: {
              const initialPrice = symbolData[0]?.close || 1;
              const percentChange = (Number(currentData.close) / initialPrice * 100);
              dataPoint[symbol] = Math.min(percentChange, 700); // Cap at 700%
              break;
            }
            case METRICS.VOLUME: {
              const volume = Number(currentData.volume);
              dataPoint[symbol] = Math.min(volume, 100000000); // Cap at 100M
              break;
            }
            default:
              dataPoint[symbol] = Number(currentData.close);
          }
        }
      });
      
      return dataPoint;
    });
  }, [historicalData, symbols, metricType]);

  if (loading) {
    return (
      <Card className="w-full h-[600px]">
        <CardContent className="h-full flex items-center justify-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        </CardContent>
      </Card>
    );
  }

  const getYAxisConfig = (metricType: MetricType) => {
    switch (metricType) {
      case METRICS.RELATIVE:
        return {
          label: 'Change from Starting Price (%)',
          domain: [0, 700],
          formatter: (value: number) => `${value}%`
        };
      case METRICS.VOLUME:
        return {
          label: 'Volume (M)',
          domain: [0, 100],
          formatter: (value: number) => `${value}M`
        };
      default:
        return {
          label: 'Price ($)',
          domain: ['auto', 'auto'],
          formatter: (value: number) => `$${value}`
        };
    }
  };

  const yAxisConfig = getYAxisConfig(metricType);

  return (
    <Card className="w-full h-[600px]">
      <CardContent className="h-full">
        <div className="flex justify-between items-center mb-4">
          <Tabs value={metricType} onValueChange={(v) => setMetricType(v as MetricType)}>
            <TabsList>
              {Object.values(METRICS).map((metric) => (
                <TabsTrigger key={metric} value={metric}>
                  {metric}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        
        {chartData.length > 0 ? (
          <div className="h-[520px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 20, right: 30, bottom: 20, left: 60 }}>
                <XAxis 
                  dataKey="date" 
                  interval="preserveStartEnd"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  domain={yAxisConfig.domain}
                  tick={{ fontSize: 12 }}
                  tickFormatter={yAxisConfig.formatter}
                  width={60}
                  label={{ 
                    value: yAxisConfig.label, 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { textAnchor: 'middle' }
                  }}
                />
                <Tooltip content={(props) => <CustomTooltip {...props} metricType={metricType} />} />
                {symbols.map((symbol, index) => (
                  <Line
                    key={symbol}
                    type="monotone"
                    dataKey={symbol}
                    stroke={`hsl(${(index * 360) / symbols.length}, 70%, 50%)`}
                    dot={false}
                    strokeWidth={1.5}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            No data available
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TimeSeriesChart;