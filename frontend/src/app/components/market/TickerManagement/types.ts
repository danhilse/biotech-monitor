// src/app/components/market/TickerManagement/types.ts
export interface ManagedTicker {
    symbol: string;
    name: string;
    price: number;
    priceChange: number;
    volume: number;
    marketCap: number;
    sector?: string;
    industry?: string;
  }
  
  export interface TickerManagementProps {
    onTickersUpdate?: () => Promise<void>;
  }

export interface Stock {
  symbol: string;
  timestamp: string;
  names: {
    long: string;
    short: string;
    polygon: string;
  };
  sector: string;
  industry: string;
  description: string | null;
  branding: {
    icon_url: string | null;
    logo_url: string | null;
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
  volumeMetrics: {
    recentVolumes: number[];
    volumeDates: string[];
    dailyChanges: number[];
    averageVolume: number;
    volumeChange: number;
    volumeVsAvg: number;
  };
  technicals: {
    rsi: number | null;
    volumeSMA: number | null;
  };
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  highProximityPct: number;
  marketCap: number;
  insiderActivity: {
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
      total_value?: {
        sales: number;
        purchases: number;
        awards: number;
      };
    };
    latest_date: string | null;
  };
  recentNews: News[];
  fundamentals: {
    peRatios: {
      trailingPE: number | null;
      forwardPE: number | null;
    };
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
  };
  alerts: number;
  alertDetails: {
    priceAlert: boolean;
    volumeSpike10: boolean;
    volumeSpike20: boolean;
    highVolume: boolean;
    insiderAlert: boolean;
    newsAlert: boolean;
    technicalAlert: TechnicalAlert | null;
    nearHighAlert: boolean;
  };
}

export interface SearchResult {
  symbol: string;
  names: {
    long: string;
    short: string;
    polygon: string;
  };
  sector?: string;
  industry?: string;
  isTracked?: boolean;
}

export interface StockDisplay extends Stock {
  isTracked?: boolean;
}

interface InsiderTrade {
  date?: string;
  insider?: string;
  position?: string;
  type?: string;
  shares?: number;
  value?: number;
  price_per_share?: number;
}

interface TechnicalAlert {
  active: boolean;
  type: string | null;
  value: number | null;
}

interface News {
  title: string;
  publisher: string;
  timestamp: string;
  url: string;
  type: string;
}

