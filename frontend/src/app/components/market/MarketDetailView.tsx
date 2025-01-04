import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, TrendingDown, AlertTriangle, Building2, Newspaper, ExternalLink } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Stock } from './types';
import { formatNumber, formatDate } from './utils';
import { VolumeChart } from './VolumeChart';

interface Props {
  stock: Stock | null;
}

export const MarketDetailView = ({ stock }: Props) => {
  if (!stock) return null;

  const volumeChange = stock.volumeMetrics?.volumeChange ?? 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                {stock.branding?.icon_url && (
                  <img 
                    src={stock.branding.icon_url} 
                    alt={`${stock.symbol} logo`} 
                    className="w-10 h-10 rounded"
                  />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle>{stock.symbol}</CardTitle>
                    <Badge variant={(stock.priceChange ?? 0) > 0 ? "success" : "destructive"}>
                      {(stock.priceChange ?? 0) > 0 ? '+' : ''}{(stock.priceChange ?? 0).toFixed(2)}%
                    </Badge>
                    <Separator orientation="vertical" className="h-4" />
                    <a 
                      href={`https://www.investing.com/search/?q=${stock.symbol}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span className="text-sm">View on Investing.com</span>
                    </a>
                  </div>
                  <p className="text-sm text-muted-foreground">{stock.industry}</p>
                </div>
              </div>
              {stock.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{stock.description}</p>
              )}
            </div>
            {(stock.alerts ?? 0) > 0 && (
              <Badge variant="secondary" className="h-6">
                {stock.alerts} Active Alerts
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MarketMetric
              title="Current Price"
              value={`$${(stock.price ?? 0).toFixed(2)}`}
              change={stock.priceChange ?? 0}
              type="price"
            />
            <MarketMetric
              title="Trading Range"
              value={`$${(stock.dayLow ?? 0).toFixed(2)} - $${(stock.dayHigh ?? 0).toFixed(2)}`}
              subtitle="Daily Range"
            />
            <MarketMetric
              title="Volume"
              value={formatNumber(stock.volume ?? 0)}
              change={volumeChange}
            />
            <MarketMetric
              title="Market Cap"
              value={`$${formatNumber(stock.marketCap ?? 0)}`}
              subtitle="USD"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <VolumeAnalysis stock={stock} />
        <AlertsAndLevels stock={stock} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <NewsSection news={stock.recentNews ?? []} />
        <CompanyInsights stock={stock} />
      </div>
    </div>
  );
};

const MarketMetric = ({ 
  title, 
  value, 
  change, 
  type = 'default',
  subtitle
}: { 
  title: string;
  value: string;
  change?: number;
  type?: 'price' | 'default';
  subtitle?: string;
}) => (
  <Card>
    <CardContent className="pt-6">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-lg font-semibold">{value}</p>
      {change !== undefined ? (
        <p className={`text-sm flex items-center gap-1 ${
          change > 0 ? 'text-green-600' : 'text-red-600'
        }`}>
          {type === 'price' ? (
            change > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />
          ) : (
            change > 0 ? '↑' : '↓'
          )}
          {Math.abs(change).toFixed(2)}%
        </p>
      ) : subtitle ? (
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      ) : null}
    </CardContent>
  </Card>
);

const NewsSection = ({ news }: { news: Stock['recentNews'] }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Newspaper className="w-5 h-5" />
        Recent News
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {news.map((item, index) => (
          <a
            key={index}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 rounded-lg hover:bg-accent transition-colors"
          >
            <p className="font-medium line-clamp-2">{item.title}</p>
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <span>{item.publisher}</span>
              <span>•</span>
              <span>{formatDate(item.timestamp)}</span>
            </div>
          </a>
        ))}
      </div>
    </CardContent>
  </Card>
);

const VolumeAnalysis = ({ stock }: { stock: Stock }) => {
  const volumeChange = stock.volumeMetrics?.volumeChange ?? 0;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Volume Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="h-48 bg-accent rounded-lg p-4">
            <VolumeChart data={stock} />
          </div>
          <div className="flex justify-between items-center px-2">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Today</div>
              <div className="font-medium">{formatNumber(stock.volume)}</div>
            </div>
            <div className="text-sm text-muted-foreground">
              {volumeChange > 0 ? '+' : ''}{volumeChange.toFixed(1)}% vs prev
            </div>
            <div className="space-y-1 text-right">
              <div className="text-sm text-muted-foreground">90d Average</div>
              <div className="font-medium">
                {formatNumber(stock.volumeMetrics?.averageVolume ?? 0)}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const CompanyInsights = ({ stock }: { stock: Stock }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Building2 className="w-5 h-5" />
        Company Insights
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <h4 className="font-medium mb-4">52-Week Range</h4>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  ${(stock.fiftyTwoWeekLow ?? 0).toFixed(2)}
                </span>
                <span className="text-muted-foreground">
                  ${(stock.fiftyTwoWeekHigh ?? 0).toFixed(2)}
                </span>
              </div>
              <Progress 
                value={(((stock.price ?? 0) - (stock.fiftyTwoWeekLow ?? 0)) / 
                ((stock.fiftyTwoWeekHigh ?? 0) - (stock.fiftyTwoWeekLow ?? 0))) * 100} 
              />
              <div className="text-center">
                <span className="text-sm font-medium">
                  Current: ${(stock.price ?? 0).toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h4 className="font-medium mb-4">Volume Trends</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Current Volume</span>
                <span className="text-sm font-medium">{formatNumber(stock.volume ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Previous Volume</span>
                <span className="text-sm font-medium">{formatNumber(stock.prevVolume ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Average Volume</span>
                <span className="text-sm font-medium">{formatNumber(stock.volumeMetrics?.averageVolume ?? 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CardContent>
  </Card>
);

const AlertsAndLevels = ({ stock }: { stock: Stock }) => {
  const volumeVsAvg = stock.volumeMetrics?.volumeVsAvg ?? 0;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alerts & Technical Levels</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <AlertsList stock={stock} />
          <div className="grid grid-cols-2 gap-4">
            <MarketMetric
              title="Volume vs Average"
              value={`${volumeVsAvg > 0 ? '+' : ''}${volumeVsAvg.toFixed(1)}%`}
              subtitle="Relative to 90-day average"
            />
            <MarketMetric
              title="Price vs Prev"
              value={`${(stock.priceChange ?? 0) > 0 ? '+' : ''}${(stock.priceChange ?? 0).toFixed(1)}%`}
              subtitle="Change from previous"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const AlertsList = ({ stock }: { stock: Stock }) => {
  const volumeVsAvg = stock.volumeMetrics?.volumeVsAvg ?? 0;
  const volumeChange = stock.volumeMetrics?.volumeChange ?? 0;
  const priceChange = stock.priceChange ?? 0;

  return (
    <div className="space-y-2">
      {stock.alertDetails?.priceAlert && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            Major Price Movement: {priceChange.toFixed(1)}% change from previous close
          </AlertDescription>
        </Alert>
      )}
      {stock.alertDetails?.volumeSpike20 && (
        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            Significant Volume Spike: {volumeChange.toFixed(1)}% increase in trading volume
          </AlertDescription>
        </Alert>
      )}
      {volumeVsAvg > 50 && (
        <Alert variant="default">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            Above Average Volume: {volumeVsAvg.toFixed(1)}% above 90-day average
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default MarketDetailView;