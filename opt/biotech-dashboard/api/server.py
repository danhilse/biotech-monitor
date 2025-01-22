# backend/server.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import requests
import os
import json
import sys
from pathlib import Path
from dotenv import load_dotenv
import asyncio
from fastapi.responses import JSONResponse

# Add root directory to Python path
root_dir = Path(__file__).parent.parent
sys.path.append(str(root_dir))

# Now use absolute imports
from scripts.ticker_manager import TickerManager
from scripts.progress_tracker import get_progress_tracker
from scripts.polygon_fetch import main as fetch_data

progress_tracker = get_progress_tracker()


# Load environment variables from known production path
env_path = Path("/opt/biotech-dashboard/.env")
load_dotenv(env_path)

POLYGON_KEY = os.getenv('POLYGON_API_KEY')



# Initialize FastAPI app once
app = FastAPI()

# In server.py, update the CORS middleware configuration
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://biotech-monitor.vercel.app"
]

if os.getenv('ENV') == 'production':
    # Add the nip.io domain
    origins.extend([
        "https://143-198-239-53.nip.io",
        "https://biotech-monitor.vercel.app"
    ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize manager once
manager = TickerManager()

# Helper functions
def get_project_root() -> Path:
    """Get the project root directory"""
    # For local development, use relative path
    if os.getenv('ENV') == 'development':
        return Path(__file__).parent.parent
    # For production, use absolute path
    return Path("/opt/biotech-dashboard")

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
    try:
        if progress_tracker.is_running:
            return JSONResponse(
                content={
                    "status": "error",
                    "message": "Data collection already in progress"
                },
                status_code=409
            )
        
        # Reset the tracker before starting new collection
        progress_tracker.reset()
        
        # Create task
        asyncio.create_task(run_data_collection())
        
        return JSONResponse(
            content={
                "status": "started",
                "message": "Market data refresh started"
            },
            status_code=200
        )
            
    except Exception as e:
        error_msg = str(e)
        progress_tracker.set_error(error_msg)
        return JSONResponse(
            content={
                "status": "error",
                "message": error_msg
            },
            status_code=500
        )

@app.get("/api/market-data/refresh/status")
async def get_refresh_status():
    """Get the current status of market data refresh"""
    return progress_tracker.get_status()

async def run_data_collection():
    """Run the data collection process"""
    try:
        # Get list of tickers to process
        tickers = manager.get_tickers()
        total_tickers = len(tickers)
        
        # Start collection with total tickers count
        progress_tracker.start_collection(total_tickers)
        
        success = await asyncio.to_thread(fetch_data)
        
        if success:
            progress_tracker.complete()
        else:
            progress_tracker.set_error("Data collection failed")
            
        return success
    except Exception as e:
        error_msg = f"Error in data collection: {str(e)}"
        progress_tracker.set_error(error_msg)
        return False

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

@app.exception_handler(Exception)
async def generic_exception_handler(request, exc):
    print(f"Unhandled exception: {str(exc)}")  # Debug log
    return JSONResponse(
        status_code=500,
        content={"status": "error", "message": str(exc)},
        headers={
            "Access-Control-Allow-Origin": "http://localhost:3000",
            "Access-Control-Allow-Credentials": "true",
        }
    )