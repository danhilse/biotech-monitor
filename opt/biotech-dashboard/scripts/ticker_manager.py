# backend/data/ticker_manager.py
import json
import os
from pathlib import Path
import logging
import yfinance as yf
import requests
from typing import Dict, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
POLYGON_KEY = os.getenv('POLYGON_API_KEY')

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)



class TickerManager:
    def __init__(self):
        if os.getenv('ENV') == 'development':
            root_dir = Path(__file__).parent.parent
        else:
            root_dir = Path("/opt/biotech-dashboard")
        self.tickers_file = root_dir / 'data' / 'tickers.json'
        self.tickers_file.parent.mkdir(parents=True, exist_ok=True)
        
        self.polygon_key = POLYGON_KEY
        
    def _make_polygon_request(self, endpoint: str) -> Dict:
        """Make a request to the Polygon.io API"""
        base_url = "https://api.polygon.io"
        url = f"{base_url}{endpoint}?apiKey={self.polygon_key}"
        
        try:
            response = requests.get(url)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Polygon API request failed: {str(e)}")
            return {}

    def get_company_details(self, symbol: str) -> Dict[str, Any]:
        """Get essential company details from Polygon.io with yfinance fallback"""
        try:
            company_details = {
                "name": "",
                "sector": "Unknown",
                "industry": "Unknown"
            }
            
            # Get Polygon.io data first
            logger.info(f"Fetching data for {symbol} from Polygon.io")
            try:
                endpoint = f"/v3/reference/tickers/{symbol}"
                polygon_data = self._make_polygon_request(endpoint)
                
                if polygon_data and 'results' in polygon_data:
                    results = polygon_data['results']
                    company_details.update({
                        "name": results.get('name', ''),
                        "sector": results.get('sic_sector', 'Unknown'),
                        "industry": results.get('sic_industry', 'Unknown')
                    })
                    
                    # If we got all the data we need from Polygon, return early
                    if all(v != "Unknown" and v != "" for v in company_details.values()):
                        return company_details
                        
            except Exception as e:
                logger.error(f"Error fetching Polygon.io company data: {str(e)}")

            # Get additional data from yfinance if needed
            logger.info(f"Fetching additional data for {symbol} from yfinance")
            try:
                ticker = yf.Ticker(symbol)
                info = ticker.info
                
                # Update with yfinance data only if Polygon didn't provide it
                if not company_details["name"]:
                    company_details["name"] = info.get('longName', '')
                if company_details["sector"] == "Unknown":
                    company_details["sector"] = info.get('sector', 'Unknown')
                if company_details["industry"] == "Unknown":
                    company_details["industry"] = info.get('industry', 'Unknown')
                
            except Exception as e:
                logger.error(f"Error fetching yfinance company data: {str(e)}")
            
            return company_details
        
        except Exception as e:
            logger.error(f"Error in get_company_details: {str(e)}")
            return {
                "name": symbol,
                "sector": "Unknown",
                "industry": "Unknown"
            }

    def get_tickers(self):
        """Read tickers from JSON file"""
        try:
            print(f"Attempting to read tickers from: {self.tickers_file.absolute()}")  # Debug line
            with open(self.tickers_file, 'r') as f:
                data = json.load(f)
                tickers = data.get('tickers', [])
                print(f"Found {len(tickers)} tickers")  # Debug line
                return tickers
        except FileNotFoundError:
            print(f"File not found: {self.tickers_file.absolute()}")  # Debug line
            self.save_tickers([])
            return []
        except json.JSONDecodeError:
            print(f"Invalid JSON in {self.tickers_file}")  # Debug line
            return []
    
    def get_ticker_details(self):
        """Read full ticker details from JSON file"""
        try:
            with open(self.tickers_file, 'r') as f:
                data = json.load(f)
                return data.get('ticker_details', {})
        except FileNotFoundError:
            return {}
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON in {self.tickers_file}")
            return {}
            
    def save_tickers(self, tickers, ticker_details=None):
        """Save tickers and their details to JSON file"""
        try:
            unique_tickers = sorted(list(set(tickers)))
            current_data = {
                'tickers': unique_tickers,
                'ticker_details': ticker_details or {}
            }
            
            # If updating just tickers, preserve existing details
            if ticker_details is None:
                try:
                    with open(self.tickers_file, 'r') as f:
                        existing_data = json.load(f)
                        current_data['ticker_details'] = existing_data.get('ticker_details', {})
                except (FileNotFoundError, json.JSONDecodeError):
                    pass
            
            with open(self.tickers_file, 'w') as f:
                json.dump(current_data, f, indent=2)
            logger.info(f"Saved {len(unique_tickers)} tickers to {self.tickers_file}")
            return True
        except Exception as e:
            logger.error(f"Error saving tickers: {str(e)}")
            return False

    def add_ticker(self, symbol: str) -> bool:
        """Add a new ticker after validation and fetch company details"""
        symbol = symbol.upper()
        try:
            # Get comprehensive company details
            company_details = self.get_company_details(symbol)
            
            # If we couldn't get any valid company details, consider it a failure
            if not company_details["name"]:
                logger.warning(f"Could not validate ticker: {symbol}")
                return False

            current_tickers = self.get_tickers()
            current_details = self.get_ticker_details()
            
            if symbol not in current_tickers:
                current_tickers.append(symbol)
                # Store the comprehensive company details
                current_details[symbol] = company_details
                return self.save_tickers(current_tickers, current_details)
            
            return True

        except Exception as e:
            logger.error(f"Error adding ticker {symbol}: {str(e)}")
            return False

    def remove_ticker(self, symbol: str) -> bool:
        """Remove a ticker from the list"""
        symbol = symbol.upper()
        try:
            current_tickers = self.get_tickers()
            current_details = self.get_ticker_details()
            
            if symbol not in current_tickers:
                logger.warning(f"Ticker {symbol} not found")
                return False

            current_tickers.remove(symbol)
            if symbol in current_details:
                del current_details[symbol]
            
            return self.save_tickers(current_tickers, current_details)

        except Exception as e:
            logger.error(f"Error removing ticker {symbol}: {str(e)}")
            return False

    def search_tickers(self, query: str):
        """Search through stored tickers and their details"""
        try:
            logger.info(f"Starting search with query: {query}")
            details = self.get_ticker_details()
            query = query.upper().strip()
            results = []
            
            # First search through stored tickers
            for symbol, info in details.items():
                # Check if query matches any of the fields
                if any([
                    query in symbol.upper(),
                    query in info.get('name', '').upper(),
                    query in info.get('sector', '').upper(),
                    query in info.get('industry', '').upper()
                ]):
                    results.append({
                        'symbol': symbol,
                        'name': info.get('name', ''),
                        'sector': info.get('sector', ''),
                        'industry': info.get('industry', '')
                    })
            
            logger.info(f"Search found {len(results)} results in stored tickers")
            
            # If no results found, try searching with Polygon
            if not results:
                try:
                    endpoint = f"/v3/reference/tickers?search={query}&active=true&limit=10"
                    polygon_data = self._make_polygon_request(endpoint)
                    
                    if polygon_data and 'results' in polygon_data:
                        for item in polygon_data['results']:
                            results.append({
                                'symbol': item.get('ticker', ''),
                                'name': item.get('name', ''),
                                'sector': item.get('sic_sector', ''),
                                'industry': item.get('sic_industry', '')
                            })
                except Exception as e:
                    logger.error(f"Polygon search error: {str(e)}")
            
            return results[:10]  # Limit to top 10 matches
                
        except Exception as e:
            logger.error(f"Search error: {str(e)}")
            return []