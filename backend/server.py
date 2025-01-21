# backend/server.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from data.ticker_manager import TickerManager
from typing import List, Dict, Any
import requests
import os
import json
from pathlib import Path
from dotenv import load_dotenv
import asyncio
from services.progress_tracker import ProgressTracker as progress_tracker
from services.polygon_fetch import main as fetch_data

# Load environment variables
load_dotenv()
POLYGON_KEY = os.getenv('POLYGON_API_KEY')

# Initialize FastAPI app once
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize manager once
manager = TickerManager()

# Helper functions
def get_project_root() -> Path:
    """Get the project root directory"""
    return Path(__file__).resolve().parent

# Models
class TickerSymbol(BaseModel):
    symbol: str

class TickerDetail(BaseModel):
    symbol: str
    name: str
    sector: str | None = None
    industry: str | None = None

# Endpoints
@app.get("/api/tickers")
async def get_tickers():
    """Get all tracked tickers"""
    try:
        print("Fetching tickers...")  # Debug log
        tickers = manager.get_tickers()
        print(f"Found tickers: {tickers}")  # Debug log
        details = manager.get_ticker_details()
        print(f"Found details: {details}")  # Debug log
        
        response = []
        for symbol in tickers:
            detail = details.get(symbol, {})
            response.append({
                "symbol": symbol,
                "name": detail.get("name", ""),
                "sector": detail.get("sector", ""),
                "industry": detail.get("industry", ""),
                "names": detail.get("names", {})
            })
        
        print(f"Returning {len(response)} tickers")  # Debug log
        return {"tickers": response}
    except Exception as e:
        print(f"Error in get_tickers: {str(e)}")  # Debug log
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/search")
async def search_tickers(query: str):
    """Search for tickers in both stored data and Polygon API"""
    if len(query.strip()) < 2:
        return {"results": []}
        
    results = []
    stored_details = manager.get_ticker_details()
    query = query.upper().strip()
    
    # First, search through stored tickers
    for symbol, info in stored_details.items():
        if any([
            query in symbol.upper(),
            query in info.get('name', '').upper(),
            query in info.get('sector', '').upper(),
            query in info.get('industry', '').upper()
        ]):
            results.append({
                'symbol': symbol,
                'name': info.get('name', ''),
                'sector': info.get('sector', 'Unknown'),
                'industry': info.get('industry', 'Unknown'),
                'isTracked': True
            })
    
    # Then search Polygon API if we have fewer than 10 results
    if len(results) < 10:
        polygon_results = search_polygon(query)
        tracked_symbols = {r['symbol'] for r in results}
        new_results = [
            {**r, 'isTracked': False} 
            for r in polygon_results 
            if r['symbol'] not in tracked_symbols
        ]
        results.extend(new_results[:10 - len(results)])
    
    return {"results": results}

@app.post("/api/tickers")
async def add_ticker(ticker: TickerSymbol):
    if manager.add_ticker(ticker.symbol):
        return {"success": True}
    raise HTTPException(status_code=400, detail="Failed to add ticker")

@app.delete("/api/tickers/{symbol}")
async def remove_ticker(symbol: str):
    if manager.remove_ticker(symbol):
        return {"success": True}
    raise HTTPException(status_code=400, detail="Failed to remove ticker")

@app.get("/api/market-data")
async def get_market_data():
    """Get current market data for all tracked stocks"""
    try:
        market_data_path = get_project_root() / "data" / "market_data.json"
        print(f"Looking for market data at: {market_data_path}")
        
        if not market_data_path.exists():
            possible_locations = list(Path(os.getcwd()).rglob("market_data.json"))
            print(f"Found market_data.json files in: {possible_locations}")
            raise HTTPException(
                status_code=404,
                detail=f"Market data file not found at {market_data_path}"
            )
            
        with open(market_data_path, 'r') as f:
            data = json.load(f)
        return data
        
    except Exception as e:
        print(f"Error accessing market data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/market-data/refresh/status")
async def get_refresh_status():
    """Get the current status of market data refresh"""
    return progress_tracker.get_status()

@app.post("/api/market-data/refresh")
async def refresh_market_data():
    """Trigger a refresh of market data"""
    if progress_tracker.is_running:
        return {"status": "error", "message": "Data collection already in progress"}
    
    try:
        asyncio.create_task(run_data_collection())
        return {"status": "started", "message": "Market data refresh started"}
    except Exception as e:
        progress_tracker.set_error(str(e))
        raise HTTPException(status_code=500, detail=f"Failed to start market data refresh: {str(e)}")

async def run_data_collection():
    """Run the data collection process"""
    success = await asyncio.to_thread(fetch_data)
    if success:
        # Trigger any necessary cleanup or notifications
        pass
    return success

def search_polygon(query: str) -> List[Dict[str, Any]]:
    """Search for tickers using Polygon.io API"""
    try:
        base_url = "https://api.polygon.io"
        endpoint = f"/v3/reference/tickers"
        url = f"{base_url}{endpoint}?search={query}&active=true&limit=10&apiKey={POLYGON_KEY}"
        
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        
        if data and 'results' in data:
            return [{
                'symbol': item.get('ticker', ''),
                'name': item.get('name', ''),
                'sector': item.get('sic_sector', ''),
                'industry': item.get('sic_industry', '')
            } for item in data['results']]
    except Exception as e:
        print(f"Polygon search error: {str(e)}")
        return []
    
    return []