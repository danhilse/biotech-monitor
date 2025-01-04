
#!/usr/bin/env python3

import requests
import yfinance as yf
from datetime import datetime, timedelta
import time
import json
import logging
from typing import Dict, List, Any
from ratelimit import limits, sleep_and_retry
import pandas as pd

from dotenv import load_dotenv
import os

load_dotenv()
POLYGON_KEY = os.getenv('POLYGON_API_KEY')

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class HybridDataFetcher:
    def __init__(self, polygon_key: str):
        self.polygon_key = polygon_key
        self.base_url = "https://api.polygon.io"
        
    @sleep_and_retry
    def _make_request(self, endpoint: str, params: Dict = None) -> Dict:
        """
        Make rate-limited API request to Polygon.io
        """
        if params is None:
            params = {}
            
        # Add API key to parameters
        params['apiKey'] = self.polygon_key
        
        try:
            response = requests.get(f"{self.base_url}{endpoint}", params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"API request failed: {str(e)}")
            if response.status_code == 429:
                logger.warning("Rate limit hit, sleeping for 60 seconds...")
                time.sleep(60)
            return None

    def get_insider_data(self, symbol: str, months_lookback: int = 3) -> Dict[str, Any]:
        """
        Get insider trading data from yfinance
        """
        try:
            logger.info(f"Fetching insider data for {symbol} from yfinance")
            ticker = yf.Ticker(symbol)
            transactions = ticker.insider_transactions
            
            if transactions is None or transactions.empty:
                return {
                    "recent_trades": 0,
                    "net_shares": 0,
                    "notable_trades": [],
                    "summary": {
                        "total_sales": 0,
                        "total_purchases": 0,
                        "total_awards": 0,
                        "sales_count": 0,
                        "purchases_count": 0,
                        "awards_count": 0,
                        "total_value": {
                            "sales": 0,
                            "purchases": 0,
                            "awards": 0
                        }
                    },
                    "latest_date": None
                }
            
            # Convert dates and ensure numeric values
            transactions['Start Date'] = pd.to_datetime(transactions['Start Date'])
            transactions['Value'] = pd.to_numeric(transactions['Value'], errors='coerce')
            transactions['Shares'] = pd.to_numeric(transactions['Shares'], errors='coerce')
            
            # Filter for recent transactions
            cutoff_date = datetime.now() - timedelta(days=30 * months_lookback)
            recent_transactions = transactions[transactions['Start Date'] >= cutoff_date].copy()
            
            if recent_transactions.empty:
                return {
                    "recent_trades": 0,
                    "net_shares": 0,
                    "notable_trades": [],
                    "summary": {
                        "total_sales": 0,
                        "total_purchases": 0,
                        "total_awards": 0,
                        "sales_count": 0,
                        "purchases_count": 0,
                        "awards_count": 0,
                        "total_value": {
                            "sales": 0,
                            "purchases": 0,
                            "awards": 0
                        }
                    },
                    "latest_date": None
                }
            
            # Categorize transactions
            def categorize_transaction(row):
                if pd.isna(row['Transaction']) or row['Transaction'] == '':
                    if row['Value'] > 0:
                        price_per_share = row['Value'] / row['Shares']
                        if price_per_share < 20:
                            return 'Stock Award'
                        else:
                            return 'Sale'
                return row['Transaction']
            
            recent_transactions['Transaction_Category'] = recent_transactions.apply(categorize_transaction, axis=1)
            
            sales = recent_transactions[recent_transactions['Transaction_Category'] == 'Sale']
            awards = recent_transactions[recent_transactions['Transaction_Category'] == 'Stock Award']
            purchases = recent_transactions[
                ~recent_transactions.index.isin(sales.index) & 
                ~recent_transactions.index.isin(awards.index)
            ]
            
            net_shares = (
                purchases['Shares'].sum() + 
                awards['Shares'].sum() - 
                sales['Shares'].sum()
            )
            
            notable_trades = []
            significant_transactions = recent_transactions[recent_transactions['Value'] >= 100000]
            
            for _, trade in significant_transactions.iterrows():
                price_per_share = float(trade['Value'] / trade['Shares']) if trade['Value'] > 0 and trade['Shares'] != 0 else 0.0
                notable_trades.append({
                    "date": trade['Start Date'].strftime('%Y-%m-%d'),
                    "insider": trade['Insider'],
                    "position": trade['Position'],
                    "type": trade['Transaction_Category'],
                    "shares": int(trade['Shares']),
                    "value": float(trade['Value']),
                    "price_per_share": price_per_share
                })
            
            notable_trades.sort(key=lambda x: x['date'], reverse=True)
            
            summary = {
                "total_sales": int(abs(sales['Shares'].sum()) if not sales.empty else 0),
                "total_purchases": int(purchases['Shares'].sum() if not purchases.empty else 0),
                "total_awards": int(awards['Shares'].sum() if not awards.empty else 0),
                "sales_count": len(sales),
                "purchases_count": len(purchases),
                "awards_count": len(awards),
                "total_value": {
                    "sales": float(sales['Value'].sum() if not sales.empty else 0),
                    "purchases": float(purchases['Value'].sum() if not purchases.empty else 0),
                    "awards": float(awards['Value'].sum() if not awards.empty else 0)
                }
            }
            
            return {
                "recent_trades": len(recent_transactions),
                "net_shares": int(net_shares),
                "notable_trades": notable_trades,
                "summary": summary,
                "latest_date": recent_transactions['Start Date'].max().strftime('%Y-%m-%d') if not recent_transactions.empty else None
            }
            
        except Exception as e:
            logger.error(f"Error fetching insider data for {symbol}: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return {
                "recent_trades": 0,
                "net_shares": 0,
                "notable_trades": [],
                "summary": {
                    "total_sales": 0,
                    "total_purchases": 0,
                    "total_awards": 0,
                    "sales_count": 0,
                    "purchases_count": 0,
                    "awards_count": 0,
                    "total_value": {
                        "sales": 0,
                        "purchases": 0,
                        "awards": 0
                    }
                },
                "latest_date": None
            }

    def get_investing_url(self, symbol: str, polygon_name: str = None, yf_name: str = None) -> str:
        """
        Generate Investing.com URL using Polygon.io name as primary source
        """
        try:
            # Common URL pattern transformations
            common_mappings = {
                "VERA": "vera-therapeutics",
                "BIIB": "biogen-idec",
                "GILD": "gilead-sciences",
                "ABBV": "abbvie"
            }
            
            if symbol in common_mappings:
                base_name = common_mappings[symbol]
            else:
                if polygon_name:
                    base_name = polygon_name.lower()
                    suffixes = [" inc", " inc.", " corporation", " corp", " corp.", 
                            " ltd", " ltd.", " limited", " llc", " llc.", 
                            " plc", " plc.", ", inc", ", inc."]
                    for suffix in suffixes:
                        base_name = base_name.replace(suffix, "")
                    
                    base_name = base_name.replace("&", "and")
                    base_name = base_name.replace(".", "")
                    base_name = base_name.replace(",", "")
                    base_name = base_name.replace("'", "")
                    base_name = base_name.replace('"', "")
                    base_name = base_name.replace('/', "-")
                    base_name = base_name.replace(" & ", "-")
                    base_name = base_name.replace(" ", "-")
                    base_name = base_name.strip("-")
                elif yf_name:
                    base_name = yf_name.lower()
                else:
                    base_name = symbol.lower()
            
            return f"https://www.investing.com/equities/{base_name}"
        
        except Exception as e:
            logger.error(f"Error generating Investing.com URL for {symbol}: {str(e)}")
            return f"https://www.investing.com/search/?q={symbol}"

    def get_company_details(self, symbol: str) -> Dict[str, Any]:
        """
        Get company details with Polygon.io name as primary source
        """
        try:
            company_details = {
                "sector": "Unknown",
                "industry": "Unknown",
                "description": None,
                "icon_url": None,
                "logo_url": None,
                "investing_url": None
            }
            
            # Get Polygon.io data first
            logger.info(f"Fetching data for {symbol} from Polygon.io")
            try:
                endpoint = f"/v3/reference/tickers/{symbol}"
                polygon_data = self._make_request(endpoint)
                
                if polygon_data and 'results' in polygon_data:
                    results = polygon_data['results']
                    branding = results.get('branding', {})
                    
                    polygon_name = results.get('name')
                    
                    icon_url = branding.get('icon_url')
                    logo_url = branding.get('logo_url')
                    
                    if icon_url:
                        icon_url = f"{icon_url}?apiKey={self.polygon_key}"
                    if logo_url:
                        logo_url = f"{logo_url}?apiKey={self.polygon_key}"
                    
                    company_details.update({
                        "name": polygon_name,
                        "description": results.get('description'),
                        "icon_url": icon_url,
                        "logo_url": logo_url,
                        "sector": results.get('sic_sector', 'Unknown'),
                        "industry": results.get('sic_industry', 'Unknown')
                    })
            except Exception as e:
                logger.error(f"Error fetching Polygon.io company data: {str(e)}")
                polygon_name = None

            # Get additional data from yfinance
            logger.info(f"Fetching additional data for {symbol} from yfinance")
            try:
                ticker = yf.Ticker(symbol)
                info = ticker.info
                yf_name = info.get('longName')
                
                if company_details["sector"] == "Unknown":
                    company_details["sector"] = info.get('sector', 'Unknown')
                if company_details["industry"] == "Unknown":
                    company_details["industry"] = info.get('industry', 'Unknown')
                
                company_details.update({
                    "names": {
                        "polygon": polygon_name,
                        "yfinance": yf_name,
                        "short": info.get('shortName', symbol)
                    }
                })
            except Exception as e:
                logger.error(f"Error fetching yfinance company data: {str(e)}")
                yf_name = None

            company_details["investing_url"] = self.get_investing_url(
                symbol, 
                polygon_name=polygon_name,
                yf_name=yf_name
            )
            
            return company_details
        
        except Exception as e:
            logger.error(f"Error in get_company_details: {str(e)}")
            return {
                "sector": "Unknown",
                "industry": "Unknown",
                "description": None,
                "icon_url": None,
                "logo_url": None,
                "investing_url": self.get_investing_url(symbol),
                "names": {
                    "polygon": None,
                    "yfinance": None,
                    "short": symbol
                }
            }

    def get_aggregates(self, symbol: str, days: int = 90) -> Dict:
        """
        Get daily aggregates from Polygon.io
        """
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        endpoint = f"/v2/aggs/ticker/{symbol}/range/1/day/{start_date.strftime('%Y-%m-%d')}/{end_date.strftime('%Y-%m-%d')}"
        return self._make_request(endpoint)

    def get_ticker_details(self, symbol: str) -> Dict:
        """
        Get company details from Polygon.io
        """
        endpoint = f"/v3/reference/tickers/{symbol}"
        return self._make_request(endpoint)

    def get_sma(self, symbol: str, window: int = 90) -> Dict:
        """
        Get Simple Moving Average (SMA) from Polygon.io API
        
        Args:
            symbol (str): Stock symbol
            window (int): SMA window size (default 90 days)
            
        Returns:
            Dict with SMA value or None if request fails
        """
        try:
            # Construct API endpoint
            endpoint = f"/v1/indicators/sma/{symbol}"
            
            params = {
                "timespan": "day",
                "adjusted": "true",
                "window": window,
                "series_type": "close",
                "order": "desc",
                "limit": 1  # We just need the most recent value
            }
            
            data = self._make_request(endpoint, params)
            
            if not data or 'results' not in data or not data['results']:
                logger.error(f"No SMA data available from Polygon.io for {symbol}")
                return None
                
            # Get the most recent SMA value
            sma_value = data['results'][0].get('value')
            
            if sma_value is not None:
                logger.info(f"Successfully got SMA for {symbol}: {sma_value:.2f}")
                return {'value': round(float(sma_value), 2)}
            else:
                logger.error(f"SMA value is None for {symbol}")
                return None
                
        except Exception as e:
            logger.error(f"Error getting SMA for {symbol}: {str(e)}")
            return None
    
    def get_rsi(self, symbol: str, period: int = 14) -> Dict[str, float]:
        """
        Get Relative Strength Index (RSI) from Polygon.io API
        
        Args:
            symbol (str): Stock symbol
            period (int): RSI window size (default 14 days)
            
        Returns:
            Dict with RSI value or None if calculation fails
        """
        try:
            # Construct API endpoint
            endpoint = f"/v1/indicators/rsi/{symbol}"
            
            params = {
                "timespan": "day",
                "adjusted": True,  # Changed from "true" string to True boolean
                "window": period,
                "series_type": "close",
                "order": "desc",
                "limit": 1  # We just need the most recent value
                # No need for the expand_underlying parameter
            }
            
            data = self._make_request(endpoint, params)
            
            if not data or 'results' not in data or not data['results'] or not data['results']['values']:
                logger.error(f"No RSI data available from Polygon.io for {symbol}")
                return {"value": None}
                
            # Get the most recent RSI value - structure is different than we thought
            rsi_value = data['results']['values'][0]['value']
            
            if rsi_value is not None:
                logger.info(f"Successfully got RSI for {symbol}: {rsi_value:.2f}")
                return {"value": round(float(rsi_value), 2)}
            else:
                logger.error(f"RSI value is None for {symbol}")
                return {"value": None}
                
        except Exception as e:
            logger.error(f"Error getting RSI for {symbol}: {str(e)}")
            return {"value": None}
    
    def get_volume_history(self, symbol: str, days: int = 5) -> Dict:
        """
        Get detailed volume history from Polygon.io
        """
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days + 1)
            
            endpoint = f"/v2/aggs/ticker/{symbol}/range/1/day/{start_date.strftime('%Y-%m-%d')}/{end_date.strftime('%Y-%m-%d')}"
            data = self._make_request(endpoint)
            
            if not data or 'results' not in data or not data['results']:
                logger.error(f"No volume history data available for {symbol}")
                return {
                    'volumes': [],
                    'dates': [],
                    'volume_changes': []
                }
                
            volume_data = data['results']
            volumes = [bar['v'] for bar in volume_data]
            dates = [datetime.fromtimestamp(bar['t']/1000).strftime('%Y-%m-%d') for bar in volume_data]
            
            volume_changes = []
            for i in range(1, len(volumes)):
                if volumes[i-1] > 0:
                    change = ((volumes[i] - volumes[i-1]) / volumes[i-1]) * 100
                    volume_changes.append(round(change, 2))
                else:
                    volume_changes.append(0.0)
                    
            return {
                'volumes': volumes,
                'dates': dates,
                'volume_changes': volume_changes
            }
        except Exception as e:
            logger.error(f"Error getting volume history for {symbol}: {str(e)}")
            return {
                'volumes': [],
                'dates': [],
                'volume_changes': []
            }

    def get_volume_metrics(self, symbol: str) -> Dict:
        """
        Get comprehensive volume metrics using both Polygon and yfinance data
        """
        try:
            volume_history = self.get_volume_history(symbol, days=5)
            recent_volumes = volume_history['volumes']
            
            if not recent_volumes:
                logger.error(f"No recent volume data from Polygon for {symbol}")
                return self._empty_volume_metrics()
            
            end_date = datetime.now()
            start_date = end_date - timedelta(days=90)
            
            aggs_endpoint = f"/v2/aggs/ticker/{symbol}/range/1/day/{start_date.strftime('%Y-%m-%d')}/{end_date.strftime('%Y-%m-%d')}"
            data = self._make_request(aggs_endpoint)
            
            if not data or 'results' not in data or not data['results']:
                logger.error(f"No aggregate data available for {symbol}")
                return self._empty_volume_metrics()
            
            volumes = [bar['v'] for bar in data['results']]
            if len(volumes) < 5:
                logger.error(f"Insufficient data points for {symbol}")
                return self._empty_volume_metrics()
            
            current_volume = recent_volumes[-1]
            prev_volume = recent_volumes[-2]
            volume_sma = sum(volumes) / len(volumes)
            
            volume_24h_change = ((current_volume - prev_volume) / prev_volume * 100) if prev_volume > 0 else 0
            volume_vs_avg = ((current_volume - volume_sma) / volume_sma * 100) if volume_sma > 0 else 0
            
            metrics = {
                'current_volume': current_volume,
                'prev_volume': prev_volume,
                'sma': volume_sma,
                'recent_volumes': recent_volumes[-5:],
                'volume_dates': volume_history['dates'][-5:],
                'daily_changes': volume_history['volume_changes'][-4:],
                'current_ratio': current_volume / volume_sma if volume_sma > 0 else None,
                'volume_24h_change': round(volume_24h_change, 2),
                'volume_vs_avg': round(volume_vs_avg, 2),
                'days_included': len(volumes)
            }
            
            logger.info(f"Calculated volume metrics for {symbol}: {metrics}")
            return metrics
            
        except Exception as e:
            logger.error(f"Error getting volume metrics for {symbol}: {str(e)}")
            return self._empty_volume_metrics()

    def _empty_volume_metrics(self) -> Dict:
        """Helper method to return empty metrics structure"""
        return {
            'current_volume': 0,
            'prev_volume': 0,
            'sma': None,
            'recent_volumes': [],
            'volume_dates': [],
            'daily_changes': [],
            'current_ratio': None,
            'volume_24h_change': 0,
            'volume_vs_avg': 0,
            'days_included': 0
        }
        
    def get_pe_ratios(self, symbol: str, current_price: float = None) -> Dict[str, Any]:
        """
        Calculate PE ratios using financial data from Polygon.io
        
        Args:
            symbol (str): Stock symbol
            current_price (float): Optional pre-fetched current price
            
        Returns:
            Dict containing:
                - trailing_pe: Based on last 12 months earnings
                - forward_pe: Based on estimated future earnings
        """
        try:
            # Use provided price or get current stock price
            if current_price is None:
                aggs = self.get_aggregates(symbol, days=1)
                if not aggs or 'results' not in aggs or not aggs['results']:
                    logger.error(f"Could not get current price for {symbol}")
                    return {
                        "trailing_pe": None,
                        "forward_pe": None,
                        "error": "No current price data"
                    }
                current_price = aggs['results'][-1]['c']
            
            # Get financial data
            endpoint = "/vX/reference/financials"
            params = {
                "ticker": symbol,
                "limit": 4,  # Get last 4 quarters
                "timeframe": "quarterly",
                "order": "desc",
                "sort": "period_of_report_date"
            }
            
            financials = self._make_request(endpoint, params)
            
            if not financials or 'results' not in financials or not financials['results']:
                logger.error(f"No financial data available for {symbol}")
                return {
                    "trailing_pe": None,
                    "forward_pe": None,
                    "error": "No financial data available"
                }
            
            # Calculate trailing PE using last 4 quarters
            trailing_eps = 0
            quarters_found = 0
            
            for quarter in financials['results']:
                if quarters_found >= 4:
                    break
                    
                if 'financials' in quarter and 'income_statement' in quarter['financials']:
                    income_stmt = quarter['financials']['income_statement']
                    
                    # Try to get diluted EPS first, then basic EPS
                    if 'diluted_earnings_per_share' in income_stmt:
                        eps = income_stmt['diluted_earnings_per_share']['value']
                    elif 'basic_earnings_per_share' in income_stmt:
                        eps = income_stmt['basic_earnings_per_share']['value']
                    else:
                        # If no EPS directly available, calculate from net income and shares
                        if ('net_income_loss' in income_stmt and 
                            'weighted_shares_outstanding' in quarter['financials']['balance_sheet']):
                            net_income = income_stmt['net_income_loss']['value']
                            shares = quarter['financials']['balance_sheet']['weighted_shares_outstanding']['value']
                            eps = net_income / shares if shares > 0 else 0
                        else:
                            continue
                    
                    trailing_eps += eps
                    quarters_found += 1
            
            # Calculate trailing P/E
            trailing_pe = None
            if quarters_found == 4 and trailing_eps != 0:
                trailing_pe = round(current_price / trailing_eps, 2)
            
            # For now, we'll return None for forward PE as we need additional data
            forward_pe = None
            
            result = {
                "trailing_pe": trailing_pe,
                "forward_pe": forward_pe,
                "price": current_price,
                "trailing_eps": round(trailing_eps, 2) if quarters_found == 4 else None,
                "quarters_found": quarters_found
            }
            
            logger.info(f"Calculated PE ratios for {symbol}: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Error calculating PE ratios for {symbol}: {str(e)}")
            return {
                "trailing_pe": None,
                "forward_pe": None,
                "error": str(e)
            }
   
    def get_news(self, symbol: str, limit: int = 5, days_back: int = 30) -> Dict:
        """
        Get enhanced news data from Polygon.io with sentiment analysis
        """
        try:
            endpoint = "/v2/reference/news"
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days_back)
            
            params = {
                'ticker': symbol,
                'limit': min(limit, 1000),
                'order': 'desc',
                'sort': 'published_utc',
                'published_utc.gte': start_date.strftime('%Y-%m-%d'),
                'published_utc.lte': end_date.strftime('%Y-%m-%d')
            }
            
            response = self._make_request(endpoint, params)
            
            if not response or 'results' not in response:
                logger.error(f"Failed to fetch news for {symbol}")
                return []
                
            processed_news = []
            
            for article in response['results']:
                sentiment = None
                sentiment_reasoning = None
                
                if 'insights' in article and article['insights']:
                    for insight in article['insights']:
                        if insight.get('ticker') == symbol:
                            sentiment = insight.get('sentiment')
                            sentiment_reasoning = insight.get('sentiment_reasoning')
                            break
                
                news_item = {
                    "title": article.get('title', ''),
                    "publisher": article.get('publisher', {}).get('name', 'Unknown'),
                    "timestamp": article.get('published_utc', ''),
                    "url": article.get('article_url', ''),
                    "type": symbol,
                    "description": article.get('description', ''),
                    "sentiment": sentiment,
                    "sentiment_reasoning": sentiment_reasoning
                }
                processed_news.append(news_item)
                
            return processed_news[:limit]
            
        except Exception as e:
            logger.error(f"Error fetching news for {symbol}: {str(e)}")
            return []
        
    def fetch_market_data(self, symbols: List[str]) -> List[Dict]:
        """
        Fetch comprehensive market data using both Polygon.io and yfinance
        """
        market_data = []
        
        for symbol in symbols:
            try:
                logger.info(f"Fetching data for {symbol}")
                
                company_details = self.get_company_details(symbol)
                if not company_details:
                    logger.error(f"Failed to get company details for {symbol}")
                    continue
                
                details = self.get_ticker_details(symbol)
                if not details or 'results' not in details:
                    logger.error(f"Failed to get details for {symbol}")
                    continue
                
                ticker_info = details['results']
                
                aggs = self.get_aggregates(symbol, days=5)
                if not aggs or 'results' not in aggs or not aggs['results']:
                    logger.error(f"Failed to get aggregates for {symbol}")
                    continue
                
                results = aggs['results']
                latest = results[-1]
                prev_day = results[-2] if len(results) > 1 else latest
                
                price_change = latest['c'] - prev_day['c']
                price_change_pct = (price_change / prev_day['c']) * 100
                
                volume_metrics = self.get_volume_metrics(symbol)
                
                # Get market data from yfinance
                try:
                    ticker = yf.Ticker(symbol)
                    info = ticker.info
                    fifty_two_week_high = info.get('fiftyTwoWeekHigh')
                    fifty_two_week_low = info.get('fiftyTwoWeekLow')
                    
                    current_price = latest['c']
                    high_proximity_pct = None
                    if fifty_two_week_high and current_price:
                        high_proximity_pct = ((fifty_two_week_high - current_price) / fifty_two_week_high) * 100
                    
                    near_high_alert = high_proximity_pct is not None and high_proximity_pct <= 5
                    
                except Exception as e:
                    logger.error(f"Error fetching yfinance data for {symbol}: {str(e)}")
                    fifty_two_week_high = None
                    fifty_two_week_low = None
                    high_proximity_pct = None
                    near_high_alert = False
                
                insider_summary = self.get_insider_data(symbol)
                news_summary = self.get_news(symbol, limit=5)
                rsi_data = self.get_rsi(symbol)
                rsi_value = rsi_data['value']

                # Calculate RSI signal based on value
                rsi_signal = None
                if rsi_value is not None:
                    if rsi_value > 70:
                        rsi_signal = "overbought"
                    elif rsi_value < 30:
                        rsi_signal = "oversold"

                alerts = sum([
                    abs(price_change_pct) > 5,
                    volume_metrics['volume_24h_change'] >= 10,
                    volume_metrics['volume_24h_change'] >= 20,
                    bool(insider_summary['notable_trades']),
                    bool(news_summary),
                    near_high_alert
                ])
                
                # Near where you get other market metrics:
                pe_ratios = self.get_pe_ratios(symbol, current_price=latest['c'])

                market_data.append({
                    "symbol": symbol,
                    "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    "sector": company_details['sector'],
                    "industry": company_details['industry'],
                    "description": company_details['description'],
                    "branding": {
                        "icon_url": company_details['icon_url'],
                        "logo_url": company_details['logo_url']
                    },
                    "price": latest['c'],
                    "priceChange": price_change_pct,
                    "openPrice": latest['o'],
                    "prevClose": prev_day['c'],
                    "dayHigh": latest['h'],
                    "dayLow": latest['l'],
                    "volume": volume_metrics['current_volume'],
                    "prevVolume": volume_metrics['prev_volume'],
                    "volumeMetrics": {
                        "recentVolumes": volume_metrics['recent_volumes'],
                        "volumeDates": volume_metrics['volume_dates'],
                        "dailyChanges": volume_metrics['daily_changes'],
                        "averageVolume": volume_metrics['sma'],
                        "volumeChange": volume_metrics['volume_24h_change'],
                        "volumeVsAvg": volume_metrics['volume_vs_avg']
                    },
                    "technicals": {
                        "rsi": rsi_value,
                        "rsi_signal": rsi_signal,
                        "volumeSMA": volume_metrics['sma']
                    },
                    # And in the market_data.append() call, add:
                    "valuation_metrics": {
                        "trailing_pe": pe_ratios.get("trailing_pe"),
                        "forward_pe": pe_ratios.get("forward_pe"),
                        "trailing_eps": pe_ratios.get("trailing_eps"),
                        "price": pe_ratios.get("price")
                    },
                    
                    "financials": self.get_financial_metrics(symbol),
                    
                    "fiftyTwoWeekHigh": fifty_two_week_high,
                    "fiftyTwoWeekLow": fifty_two_week_low,
                    "highProximityPct": high_proximity_pct,
                    "marketCap": ticker_info.get('market_cap', 0),
                    "insiderActivity": insider_summary,
                    "recentNews": news_summary,
                    "alerts": alerts,
                    "alertDetails": {
                        "priceAlert": abs(price_change_pct) > 5,
                        "volumeSpike10": volume_metrics['volume_24h_change'] >= 10,
                        "volumeSpike20": volume_metrics['volume_24h_change'] >= 20,
                        "highVolume": volume_metrics['volume_vs_avg'] > 50,
                        "insiderAlert": bool(insider_summary['notable_trades']),
                        "newsAlert": bool(news_summary),
                        "technicalAlert": {
                            "active": rsi_signal is not None,
                            "type": rsi_signal,
                            "value": rsi_value
                        },
                        "nearHighAlert": near_high_alert
                    }
                })
                
                logger.info(f"Successfully processed {symbol}")
                
            except Exception as e:
                logger.error(f"Unexpected error processing {symbol}: {str(e)}")
                continue
        
        try:
            with open('market_data.json', 'w') as f:
                json.dump(market_data, f, indent=2)
            logger.info(f"Saved data for {len(market_data)} stocks")
        except Exception as e:
            logger.error(f"Error saving to JSON: {str(e)}")
        
        return market_data
    
    def get_financial_metrics(self, symbol: str) -> Dict[str, Any]:
        """
        Get comprehensive financial metrics from Polygon.io API
        
        Args:
            symbol (str): Stock ticker symbol
            
        Returns:
            Dict containing financial metrics including:
            - Quarterly and annual results
            - Growth metrics
            - Key ratios
            - Income statement highlights
            - Balance sheet highlights
        """
        try:
            endpoint = "/vX/reference/financials"
            
            # Get quarterly financials for growth calculations
            quarterly_params = {
                "ticker": symbol,
                "timeframe": "quarterly",
                "limit": 8,  # Last 8 quarters for YoY comparison
                "order": "desc",
                "sort": "period_of_report_date"
            }
            
            quarterly_data = self._make_request(endpoint, quarterly_params)
            
            # Get annual financials for longer-term metrics
            annual_params = {
                "ticker": symbol,
                "timeframe": "annual",
                "limit": 3,  # Last 3 years
                "order": "desc",
                "sort": "period_of_report_date"
            }
            
            annual_data = self._make_request(endpoint, annual_params)
            
            if not quarterly_data or 'results' not in quarterly_data or not quarterly_data['results']:
                logger.error(f"No quarterly financial data available for {symbol}")
                return self._empty_financial_metrics()
                
            # Process quarterly data
            quarterly_results = quarterly_data['results']
            latest_quarter = quarterly_results[0] if quarterly_results else None
            year_ago_quarter = quarterly_results[4] if len(quarterly_results) >= 5 else None
            
            # Process annual data
            annual_results = annual_data['results'] if annual_data and 'results' in annual_data else []
            latest_year = annual_results[0] if annual_results else None
            
            if not latest_quarter or not latest_quarter.get('financials'):
                return self._empty_financial_metrics()
                
            # Extract key metrics from latest quarter
            financials = latest_quarter['financials']
            income_stmt = financials.get('income_statement', {})
            balance_sheet = financials.get('balance_sheet', {})
            
            # Calculate financial metrics
            metrics = {
                "quarterly": {
                    "revenue": self._get_value(income_stmt, 'revenues'),
                    "gross_profit": self._get_value(income_stmt, 'gross_profit'),
                    "operating_income": self._get_value(income_stmt, 'operating_income_loss'),
                    "net_income": self._get_value(income_stmt, 'net_income_loss'),
                    "eps": {
                        "basic": self._get_value(income_stmt, 'basic_earnings_per_share'),
                        "diluted": self._get_value(income_stmt, 'diluted_earnings_per_share')
                    }
                },
                "balance_sheet": {
                    "total_assets": self._get_value(balance_sheet, 'assets'),
                    "total_liabilities": self._get_value(balance_sheet, 'liabilities'),
                    "total_equity": self._get_value(balance_sheet, 'equity'),
                    "current_assets": self._get_value(balance_sheet, 'current_assets'),
                    "current_liabilities": self._get_value(balance_sheet, 'current_liabilities')
                },
                "growth_metrics": self._calculate_growth_metrics(latest_quarter, year_ago_quarter),
                "key_ratios": self._calculate_key_ratios(latest_quarter),
                "period_info": {
                    "fiscal_year": latest_quarter.get('fiscal_year'),
                    "fiscal_period": latest_quarter.get('fiscal_period'),
                    "start_date": latest_quarter.get('start_date'),
                    "end_date": latest_quarter.get('end_date')
                }
            }
            
            # Add TTM (Trailing Twelve Months) calculations
            metrics["ttm"] = self._calculate_ttm_metrics(quarterly_results[:4])
            
            # Add annual metrics if available
            if latest_year:
                metrics["annual"] = self._extract_annual_metrics(latest_year)
                
            logger.info(f"Successfully calculated financial metrics for {symbol}")
            return metrics
            
        except Exception as e:
            logger.error(f"Error calculating financial metrics for {symbol}: {str(e)}")
            return self._empty_financial_metrics()

    def _get_value(self, data: Dict, key: str) -> float:
        """Helper to safely extract values from financial data"""
        try:
            return data.get(key, {}).get('value', 0)
        except (TypeError, AttributeError):
            return 0

    def _calculate_growth_metrics(self, current: Dict, year_ago: Dict) -> Dict[str, float]:
        """Calculate year-over-year growth metrics"""
        if not current or not year_ago:
            return {
                "revenue_growth": None,
                "income_growth": None,
                "eps_growth": None
            }
            
        try:
            curr_fin = current.get('financials', {})
            prev_fin = year_ago.get('financials', {})
            
            curr_income = curr_fin.get('income_statement', {})
            prev_income = prev_fin.get('income_statement', {})
            
            def calc_growth(current_val, previous_val):
                if not previous_val or previous_val == 0:
                    return None
                return ((current_val - previous_val) / abs(previous_val)) * 100
                
            return {
                "revenue_growth": calc_growth(
                    self._get_value(curr_income, 'revenues'),
                    self._get_value(prev_income, 'revenues')
                ),
                "income_growth": calc_growth(
                    self._get_value(curr_income, 'net_income_loss'),
                    self._get_value(prev_income, 'net_income_loss')
                ),
                "eps_growth": calc_growth(
                    self._get_value(curr_income, 'diluted_earnings_per_share'),
                    self._get_value(prev_income, 'diluted_earnings_per_share')
                )
            }
        except Exception as e:
            logger.error(f"Error calculating growth metrics: {str(e)}")
            return {
                "revenue_growth": None,
                "income_growth": None,
                "eps_growth": None
            }

    def _calculate_key_ratios(self, quarter: Dict) -> Dict[str, float]:
        """Calculate key financial ratios from quarterly data"""
        try:
            financials = quarter.get('financials', {})
            balance = financials.get('balance_sheet', {})
            income = financials.get('income_statement', {})
            
            current_assets = self._get_value(balance, 'current_assets')
            current_liabilities = self._get_value(balance, 'current_liabilities')
            total_assets = self._get_value(balance, 'assets')
            total_liabilities = self._get_value(balance, 'liabilities')
            equity = self._get_value(balance, 'equity')
            revenue = self._get_value(income, 'revenues')
            
            return {
                "current_ratio": current_assets / current_liabilities if current_liabilities else None,
                "debt_to_equity": total_liabilities / equity if equity else None,
                "asset_turnover": revenue / total_assets if total_assets else None,
                "equity_ratio": equity / total_assets if total_assets else None
            }
        except Exception as e:
            logger.error(f"Error calculating key ratios: {str(e)}")
            return {
                "current_ratio": None,
                "debt_to_equity": None,
                "asset_turnover": None,
                "equity_ratio": None
            }

    def _calculate_ttm_metrics(self, quarters: List[Dict]) -> Dict[str, float]:
        """Calculate trailing twelve months metrics"""
        try:
            ttm_revenue = 0
            ttm_net_income = 0
            ttm_operating_income = 0
            
            for quarter in quarters:
                if not quarter or 'financials' not in quarter:
                    continue
                    
                income_stmt = quarter['financials'].get('income_statement', {})
                ttm_revenue += self._get_value(income_stmt, 'revenues')
                ttm_net_income += self._get_value(income_stmt, 'net_income_loss')
                ttm_operating_income += self._get_value(income_stmt, 'operating_income_loss')
                
            return {
                "revenue": ttm_revenue,
                "net_income": ttm_net_income,
                "operating_income": ttm_operating_income
            }
        except Exception as e:
            logger.error(f"Error calculating TTM metrics: {str(e)}")
            return {
                "revenue": None,
                "net_income": None,
                "operating_income": None
            }

    def _extract_annual_metrics(self, annual_data: Dict) -> Dict[str, Any]:
        """Extract key metrics from annual data"""
        try:
            financials = annual_data.get('financials', {})
            income_stmt = financials.get('income_statement', {})
            
            return {
                "revenue": self._get_value(income_stmt, 'revenues'),
                "net_income": self._get_value(income_stmt, 'net_income_loss'),
                "operating_income": self._get_value(income_stmt, 'operating_income_loss'),
                "eps": {
                    "basic": self._get_value(income_stmt, 'basic_earnings_per_share'),
                    "diluted": self._get_value(income_stmt, 'diluted_earnings_per_share')
                }
            }
        except Exception as e:
            logger.error(f"Error extracting annual metrics: {str(e)}")
            return {
                "revenue": None,
                "net_income": None,
                "operating_income": None,
                "eps": {
                    "basic": None,
                    "diluted": None
                }
            }

    def _empty_financial_metrics(self) -> Dict[str, Any]:
        """Return empty financial metrics structure"""
        return {
            "quarterly": {
                "revenue": None,
                "gross_profit": None,
                "operating_income": None,
                "net_income": None,
                "eps": {
                    "basic": None,
                    "diluted": None
                }
            },
            "balance_sheet": {
                "total_assets": None,
                "total_liabilities": None,
                "total_equity": None,
                "current_assets": None,
                "current_liabilities": None
            },
            "growth_metrics": {
                "revenue_growth": None,
                "income_growth": None,
                "eps_growth": None
            },
            "key_ratios": {
                "current_ratio": None,
                "debt_to_equity": None,
                "asset_turnover": None,
                "equity_ratio": None
            },
            "ttm": {
                "revenue": None,
                "net_income": None,
                "operating_income": None
            },
            "period_info": {
                "fiscal_year": None,
                "fiscal_period": None,
                "start_date": None,
                "end_date": None
            }
        }
        
def main():
    POLYGON_KEY = os.getenv('POLYGON_API_KEY')
    
    # Full list of tickers
    tickers = [
        "VERA", "ANIX"
    ]
    # tickers = [
    #     "VERA", "ANIX", "INMB", "GUTS", "MIRA", "EYPT", "GNPX", "GLUE", "TGTX", "AUPH", 
    #     "ITCI", "CLOV", "CERE", "IPHA", "MDWD", "ZYME", "ASMB", "JAZZ", "PRTA", "TMDX",
    #     "GILD", "NTNX", "INAB", "MNPR", "APVO", "HRMY", "BHC", "BCRX", "GRTX", "AXSM",
    #     "SMMT", "SAGE", "MYNZ", "GMAB", "LUMO", "NEO", "ARCT", "TEVA", "VMD", "VERU",
    #     "VRCA", "SIGA", "INMD", "EXEL", "CPRX", "HALO", "NVOS", "ATAI", "BNGO", "ENOV",
    #     "BIIB", "MIST", "ARDX", "CVM", "ACLS", "IDYA", "RYTM", "TWST", "STEM", "GERN",
    #     "VIR", "ALKS", "AMPH", "SVRA", "EVLO", "GH", "NTLA", "MRTX", "SRPT", "RARE",
    #     "TRVI", "PGEN", "EVH", "ARQT", "QNRX", "SYRS", "GTHX", "MNKD", "XERS", "SNDX",
    #     "PRTK", "PLRX", "MREO", "MDGL", "KZR", "GALT", "ETNB", "EPZM", "CMRX", "CDTX",
    #     "GYRE", "CBAY", "AGEN", "ABUS", "ABCL", "LOGC", "BLCM", "ADVM", "SNY", "MRSN",
    #     "TCRT", "ASRT", "ABBV", "ADMA", "RKLB"
    # ]

    # Initialize fetcher
    fetcher = HybridDataFetcher(POLYGON_KEY)
    market_data = fetcher.fetch_market_data(tickers)
    
    # Print summary header
    print("\n=== Biotech Stock Monitoring Report ===")
    print(f"Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Tracked Stocks: {len(market_data)}")
    
    # Process alerts
    alerts = [stock for stock in market_data if stock['alerts'] > 0]
    alerts.sort(key=lambda x: x['alerts'], reverse=True)
    
    print(f"\nStocks with Active Alerts: {len(alerts)}")
    print("=" * 50)
    
    for stock in alerts:
        print(f"\n{stock['symbol']} ({stock['sector']})")
        print(f"Alerts: {stock['alerts']}")
        print("-" * 30)
        
        # Price Information
        print(f"Price: ${stock['price']:.2f} ({stock['priceChange']:+.2f}%)")
        if stock['technicals']['rsi']:
            print(f"RSI: {stock['technicals']['rsi']:.2f}")
        
        # Alert Details
        print("\nActive Alerts:")
        if stock['alertDetails']['priceAlert']:
            print(f"  • Price Movement: {stock['priceChange']:+.2f}%")
        if stock['alertDetails']['volumeSpike20']:
            print(f"  • Volume Spike: {stock['volumeMetrics']['volumeChange']:+.2f}% vs previous day")
        if stock['alertDetails']['highVolume']:
            print(f"  • High Volume: {stock['volumeMetrics']['volumeVsAvg']:+.2f}% vs average")
        if stock['alertDetails']['insiderAlert']:
            trades = stock['insiderActivity']['notable_trades']
            print(f"  • Insider Activity: {len(trades)} notable trades")
            for trade in trades[:3]:  # Show latest 3 trades
                print(f"    - {trade['date']}: {trade['type']} of {trade['shares']:,} shares (${trade['value']:,.2f})")
        if stock['alertDetails']['newsAlert']:
            print("  • Recent News:")
            for news in stock['recentNews'][:2]:  # Show latest 2 news items
                print(f"    - {news['title']}")
        if stock['alertDetails']['technicalAlert']['active']:
            print(f"  • Technical Alert: RSI at {stock['technicals']['rsi']:.2f} ({stock['alertDetails']['technicalAlert']['type']})")
        if stock['alertDetails']['nearHighAlert']:
            print(f"  • Near 52-Week High: {stock['highProximityPct']:.2f}% from high")
        
        # Volume Analysis
        print("\nVolume Analysis:")
        print(f"Current Volume: {stock['volume']:,}")
        print(f"Avg Volume: {stock['volumeMetrics']['averageVolume']:,.0f}")
        print(f"Volume vs Avg: {stock['volumeMetrics']['volumeVsAvg']:+.2f}%")
        
        print("-" * 50)
    
    # Print stocks without alerts but significant changes
    print("\nOther Notable Movements (No Alerts):")
    no_alerts = [stock for stock in market_data if stock['alerts'] == 0 and 
                (abs(stock['priceChange']) > 3 or abs(stock['volumeMetrics']['volumeVsAvg']) > 30)]
    no_alerts.sort(key=lambda x: abs(x['priceChange']), reverse=True)
    
    for stock in no_alerts[:10]:  # Show top 10
        print(f"\n{stock['symbol']}: ${stock['price']:.2f} ({stock['priceChange']:+.2f}%)")
        print(f"Volume vs Avg: {stock['volumeMetrics']['volumeVsAvg']:+.2f}%")
    
    # Save timestamp of last run
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    try:
        with open('last_run.txt', 'w') as f:
            f.write(timestamp)
        print(f"\nReport completed and saved at {timestamp}")
    except Exception as e:
        print(f"\nError saving timestamp: {str(e)}")

if __name__ == "__main__":
    main()