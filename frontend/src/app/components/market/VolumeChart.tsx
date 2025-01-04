import React from 'react';
import { ResponsiveBar } from '@nivo/bar';
import { Stock } from './types';
import { formatNumber } from './utils';

interface Props {
  data: Stock;
}

export const VolumeChart = ({ data }: Props) => {
  const { volumeMetrics } = data;
  if (!volumeMetrics?.recentVolumes || !volumeMetrics?.volumeDates) return null;
  
  const chartData = volumeMetrics.recentVolumes.map((volume, index) => {
    const date = new Date(volumeMetrics.volumeDates[index]);
    const isToday = index === volumeMetrics.recentVolumes.length - 1;
    const label = isToday ? 'Today' : new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric'
    }).format(date);

    return {
      day: label,
      volume
    };
  });

  const maxVolume = Math.max(...volumeMetrics.recentVolumes);
  const tickValues = [0, maxVolume / 2, maxVolume];

  return (
    <ResponsiveBar
      data={chartData}
      keys={['volume']}
      indexBy="day"
      margin={{ top: 20, right: 20, bottom: 40, left: 60 }}
      padding={0.4}
      colors={['#6366f1']} // Single consistent color
      borderRadius={4}
      enableGridX={false}
      enableGridY={true}
      gridYValues={tickValues}
      axisBottom={{
        tickSize: 0,
        tickPadding: 12,
        tickRotation: 0
      }}
      axisLeft={{
        tickSize: 0,
        tickPadding: 8,
        tickRotation: 0,
        format: formatNumber,
        tickValues
      }}
      enableLabel={false}
      tooltip={({ value, indexValue }) => (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100">
          <div className="text-sm text-gray-500">{indexValue}</div>
          <div className="text-lg font-medium text-gray-900">{formatNumber(value)}</div>
        </div>
      )}
      theme={{
        axis: {
          ticks: {
            text: {
              fontSize: 12,
              fill: '#6B7280'
            }
          }
        },
        grid: {
          line: {
            stroke: '#F3F4F6',
            strokeWidth: 1
          }
        }
      }}
      animate={true}
      motionConfig="gentle"
    />
  );
};

export default VolumeChart;