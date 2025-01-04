/* markettooltip */

import { AlertTriangle } from 'lucide-react';
import { formatNumber, formatPercentage } from './utils';
import { ScatterDataPoint } from './types';

interface Props {
  node: { 
    data: ScatterDataPoint & {
      volumeMetrics: {
        volumeChange: number;
        volumeVsAvg: number;
      };
    }
  };
}

export const MarketTooltip = ({ node }: Props) => (
  <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-100">
    <div className="flex items-center gap-2 mb-2">
      <span className="font-bold text-lg">{node.data.symbol}</span>
      <span className={`text-sm px-2 py-0.5 rounded ${
        node.data.x > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        {formatPercentage(node.data.x)}
      </span>
    </div>
    <div className="space-y-1 text-sm">
      <div className="flex justify-between">
        <span className="text-gray-500">Price:</span>
        <span className="font-medium">${node.data.price}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-500">Volume:</span>
        <span className="font-medium">{formatNumber(node.data.volume)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-500">Volume Change:</span>
        <span className={`font-medium ${
          node.data.volumeMetrics.volumeChange > 0 ? 'text-green-600' : 
          node.data.volumeMetrics.volumeChange < 0 ? 'text-red-600' : 'text-gray-600'
        }`}>
          {formatPercentage(node.data.volumeMetrics.volumeChange)}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-500">vs Avg Volume:</span>
        <span className={`font-medium ${
          node.data.volumeMetrics.volumeVsAvg > 0 ? 'text-green-600' : 
          node.data.volumeMetrics.volumeVsAvg < 0 ? 'text-red-600' : 'text-gray-600'
        }`}>
          {formatPercentage(node.data.volumeMetrics.volumeVsAvg)}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-500">Market Cap:</span>
        <span className="font-medium">${formatNumber(node.data.marketCap)}</span>
      </div>
    </div>
    {node.data.alerts > 0 && (
      <div className="mt-2 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-1 text-yellow-600">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm font-medium">{node.data.alerts} Active Alerts</span>
        </div>
      </div>
    )}
  </div>
);