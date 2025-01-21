# backend/scripts/manage_tickers.py
import sys
import json
import os
from pathlib import Path
import logging
from typing import Dict, List, Optional, Union
import requests
import yfinance as yf
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

class TickerManager:
    def __init__(self):
        self.polygon_key = os.getenv('POLYGON_API_KEY')
        self.tickers_file = Path(__file__).parent.parent / 'data' / 'tickers.json'
        self.market_data_file = Path(__file__).parent.parent.parent / 'frontend' / 'public' / 'data' / 'market_data.json'
        
        # Ensure directories exist
        self.tickers_file.parent.mkdir(parents=True, exist_ok=True)
        self.market_data_file.parent.mkdir(parents=True, exist_ok=True)

    def search_tickers(self, query: str) -> List[Dict[str, str]]:
        """Search for tickers using both Polygon.io and yfinance"""
        results = []
        
        # Search Polygon.io
        try:
            url = f"https://api.polygon.io/v3/reference/tickers"
            params = {
                'apiKey': self.polygon_key,
                'search': query,
                'active': True,
                'market': 'stocks',
                'sort': 'ticker',
                'order': 'asc',
                'limit': 10
            }
            response = requests.get(url, params=params)
            
            if response.status_code == 200:
                data = response.json()
                for item in data.get('results', []):
                    # Get additional info from yfinance
                    try:
                        yf_ticker = yf.Ticker(item['ticker'])
                        info = yf_ticker.info
                        results.append({
                            'symbol': item['ticker'],
                            'name': item['name'],
                            'sector': info.get('sector', item.get('sic_sector')),
                            'industry': info.get('industry', item.get('sic_industry')),
                            'price': info.get('regularMarketPrice'),
                            'marketCap': info.get('marketCap')
                        })
                    except Exception as e:
                        logger.warning(f"Failed to get yfinance data for {item['ticker']}: {e}")
                        results.append({
                            'symbol': item['ticker'],
                            'name': item['name'],
                            'sector': item.get('sic_sector'),
                            'industry': item.get('sic_industry')
                        })
        except Exception as e:
            logger.error(f"Polygon.io search failed: {e}")
            
        return results

    def get_tickers(self) -> List[str]:
        """Get list of managed tickers"""
        try:
            if self.tickers_file.exists():
                with open(self.tickers_file) as f:
                    data = json.load(f)
                return data.get('tickers', [])
            return []
        except Exception as e:
            logger.error(f"Failed to read tickers: {e}")
            return []

    def save_tickers(self, tickers: List[str]) -> bool:
        """Save tickers to file"""
        try:
            with open(self.tickers_file, 'w') as f:
                json.dump({'tickers': sorted(list(set(tickers)))}, f, indent=2)
            return True
        except Exception as e:
            logger.error(f"Failed to save tickers: {e}")
            return False

    def add_ticker(self, symbol: str) -> bool:
        """Add a ticker to managed list"""
        try:
            # Validate ticker exists
            yf_ticker = yf.Ticker(symbol)
            info = yf_ticker.info
            if not info:
                return False

            tickers = self.get_tickers()
            if symbol not in tickers:
                tickers.append(symbol)
                return self.save_tickers(tickers)
            return True
        except Exception as e:
            logger.error(f"Failed to add ticker {symbol}: {e}")
            return False

    def remove_ticker(self, symbol: str) -> bool:
        """Remove a ticker from managed list"""
        try:
            tickers = self.get_tickers()
            if symbol in tickers:
                tickers.remove(symbol)
                return self.save_tickers(tickers)
            return True
        except Exception as e:
            logger.error(f"Failed to remove ticker {symbol}: {e}")
            return False

def main():
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No action specified'}))
        sys.exit(1)

    action = sys.argv[1]
    params = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
    
    manager = TickerManager()
    
    try:
        if action == 'search':
            results = manager.search_tickers(params['query'])
            print(json.dumps({'results': results}))
        elif action == 'list':
            tickers = manager.get_tickers()
            print(json.dumps({'results': tickers}))
        elif action == 'add':
            success = manager.add_ticker(params['symbol'])
            print(json.dumps({'success': success}))
        elif action == 'remove':
            success = manager.remove_ticker(params['symbol'])
            print(json.dumps({'success': success}))
        else:
            print(json.dumps({'error': f'Unknown action: {action}'}))
            sys.exit(1)
    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()