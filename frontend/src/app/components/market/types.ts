// Base interfaces for stock data
export interface News {
  title: string;
  publisher: string;
  timestamp: string;
  type: string;
  url: string;
}

export interface InsiderTrade {
  date: string;
  insider: string;
  position: string;
  type: string;
  shares: number;
  value: number;
  price_per_share: number;
}

export interface InsiderActivity {
  recent_trades: number;
  net_shares: number;
  notable_trades: InsiderTrade[];
  summary: {
    total_sales: number;
    total_purchases: number;
    total_awards: number;
    sales_count: number;
    purchases_count: number;
    awards_count: number;
    total_value: {
      sales: number;
      purchases: number;
      awards: number;
    };
  };
  latest_date: string;
}

export interface VolumeMetrics {
  recentVolumes: number[];
  volumeDates: string[];
  dailyChanges: number[];
  averageVolume: number;
  volumeChange: number;
  volumeVsAvg: number;
}

export interface Technicals {
  rsi: number | null;
  volumeSMA: number | null;
}

export interface AlertDetails {
  priceAlert: boolean;
  volumeSpike10: boolean;
  volumeSpike20: boolean;
  highVolume: boolean;
  insiderAlert: boolean;
  newsAlert: boolean;
  technicalAlert: boolean | null;
  nearHighAlert: boolean;
}

// Main Stock interface
export interface Stock {
  symbol: string;
  timestamp: string;
  sector: string;
  industry: string;
  description: string;
  branding: {
    icon_url: string;
    logo_url: string;
  };
  price: number;
  priceChange: number;
  openPrice: number;
  prevClose: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  prevVolume: number;
  volumeMetrics: VolumeMetrics;
  technicals: Technicals;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  highProximityPct: number;
  marketCap: number;
  insiderActivity: InsiderActivity;
  recentNews: News[];
  alerts: number;
  alertDetails: AlertDetails;
}

// Visualization-specific interfaces
export interface ScatterNode {
  x: number;
  y: number;
  symbol: string;
  industry: string;
  price: number;
  volume: number;
  volumeVsAvg: number;
  marketCap: number;
  alerts: number;
  alertDetails: AlertDetails;
}

export interface ScatterSeries {
  id: string;
  data: ScatterNode[];
}

// Filter types for data filtering
export type FilterType = 'smallCap' | 'midCap' | 'largeCap' | 'gainers' | 'decliners' | 'highVolume' | null;

// Helper function to convert Stock to ScatterNode
export const stockToScatterNode = (stock: Stock): ScatterNode => ({
  x: stock.priceChange,
  y: stock.volumeMetrics.volumeVsAvg,
  symbol: stock.symbol,
  industry: stock.industry,
  price: stock.price,
  volume: stock.volume,
  volumeVsAvg: stock.volumeMetrics.volumeVsAvg,
  marketCap: stock.marketCap,
  alerts: stock.alerts,
  alertDetails: stock.alertDetails
});

// Helper type for scatter plot data points
export interface ScatterDataPoint {
  x: number;
  y: number;
  symbol: string;
  price: number;
  volume: number;
  marketCap: number;
  alerts: number;
}