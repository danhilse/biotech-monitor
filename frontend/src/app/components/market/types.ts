// Base interfaces for stock data
export interface News {
  title: string;
  publisher: string;
  timestamp: string;
  type: string;
  url: string;
  description?: string;
  sentiment?: string;
  sentiment_reasoning?: string;
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
  rsi_signal: number | null;
  volumeSMA: number | null;
}

export interface PERatios {
  trailingPE: number | null;
  forwardPE: number | null;
}

export interface Fundamentals {
  peRatios: PERatios;
  estimates: {
    revenue: {
      nextQuarter: number | null;
      currentYear: number | null;
      nextYear: number | null;
    };
    earnings: {
      nextQuarter: number | null;
      currentYear: number | null;
      nextYear: number | null;
    };
  };
  quarterlyMetrics: {
    revenue: number[];
    revenueChange: number[];
    periods: string[];
  };
  detailedQuarterly: {
    revenue: number[];
    revenueChanges: number[];
    netIncome: number[];
    netIncomeChanges: number[];
    operatingMargin: number[];
    operatingMarginChanges: number[];
    freeCashFlow: number[];
    freeCashFlowChanges: number[];
    dates: string[];
  };
}

export interface ValuationMetrics {
  trailing_pe: number | null;
  forward_pe: number | null;
  trailing_eps: number | null;
  price: number;
}

export interface FinancialMetrics {
  quarterly: {
    revenue: number;
    gross_profit: number;
    operating_income: number;
    net_income: number;
    eps: {
      basic: number;
      diluted: number;
    };
  };
  balance_sheet: {
    total_assets: number;
    total_liabilities: number;
    total_equity: number;
    current_assets: number;
    current_liabilities: number;
  };
  growth_metrics: {
    revenue_growth: number | null;
    income_growth: number;
    eps_growth: number;
  };
  key_ratios: {
    current_ratio: number;
    debt_to_equity: number;
    asset_turnover: number;
    equity_ratio: number;
  };
  period_info: {
    fiscal_year: string;
    fiscal_period: string;
    start_date: string;
    end_date: string;
  };
  ttm: {
    revenue: number;
    net_income: number;
    operating_income: number;
  };
  annual: {
    revenue: number;
    net_income: number;
    operating_income: number;
    eps: {
      basic: number;
      diluted: number;
    };
  };
}

export interface TechnicalAlert {
  active: boolean;
  type: string | null;
  value: number | null;
}

export interface AlertDetails {
  priceAlert: boolean;
  volumeSpike10: boolean;
  volumeSpike20: boolean;
  highVolume: boolean;
  insiderAlert: boolean;
  newsAlert: boolean;
  technicalAlert: TechnicalAlert;
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
  investing_url: string;
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
  valuation_metrics: ValuationMetrics;
  financials: FinancialMetrics;
  fundamentals: Fundamentals;
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
  pe_ratio?: number | null;
  eps?: number | null;
  current_ratio?: number | null;
}

export interface ScatterSeries {
  id: string;
  data: ScatterNode[];
}

// Filter types for data filtering
export type FilterType = 'smallCap' | 'midCap' | 'largeCap' | 'gainers' | 'decliners' | 
  'highVolume' | 'highPE' | 'lowPE' | 'profitable' | null;

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
  alertDetails: stock.alertDetails,
  pe_ratio: stock.fundamentals?.peRatios.trailingPE,
  eps: stock.valuation_metrics.trailing_eps,
  current_ratio: stock.financials.key_ratios.current_ratio
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
  pe_ratio?: number | null;
  eps?: number | null;
  current_ratio?: number | null;
}