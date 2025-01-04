import { Stock } from './types';

export const filterGroups = {
  gainers: (stock: Stock) => stock.priceChange > 0,
  decliners: (stock: Stock) => stock.priceChange < 0,
  highVolume: (stock: Stock) => stock.volumeMetrics.volumeVsAvg > 50
} as const;

export const formatNumber = (num: number | null): string => {
  if (num === null || num === undefined) return 'N/A';
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return num.toFixed(2);
};

export const getColor = (stock: Stock): string => {
  const { priceChange, volumeMetrics } = stock;
  const { volumeChange, volumeVsAvg } = volumeMetrics;

  if (priceChange > 5 && (volumeChange > 20 || volumeVsAvg > 50)) return '#22c55e';
  if (priceChange < -5 && (volumeChange > 20 || volumeVsAvg > 50)) return '#ef4444';
  if (Math.abs(priceChange) > 5 || volumeChange > 20 || volumeVsAvg > 50) return '#eab308';
  return '#94a3b8';
};

export const formatDate = (timestamp: string): string => {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  }).format(date);
};

// New helper functions for volume metrics
export const getVolumeChangeClass = (volumeChange: number): string => {
  if (volumeChange > 50) return 'text-red-500';
  if (volumeChange > 20) return 'text-yellow-500';
  if (volumeChange < -20) return 'text-blue-500';
  return 'text-gray-500';
};

export const formatPercentage = (value: number): string => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
};

// Helper to get the latest volume metrics
export const getLatestVolumeMetrics = (stock: Stock) => {
  const { volumeMetrics } = stock;
  return {
    currentVolume: volumeMetrics.recentVolumes[volumeMetrics.recentVolumes.length - 1],
    previousVolume: volumeMetrics.recentVolumes[volumeMetrics.recentVolumes.length - 2],
    volumeChange: volumeMetrics.volumeChange,
    volumeVsAvg: volumeMetrics.volumeVsAvg
  };
};