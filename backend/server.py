# backend/server.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from data.ticker_manager import TickerManager
from typing import List, Dict, Any
import requests
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
POLYGON_KEY = os.getenv('POLYGON_API_KEY')

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

manager = TickerManager()

class TickerSymbol(BaseModel):
    symbol: str

class TickerDetail(BaseModel):
    symbol: str
    name: str
    sector: str | None = None
    industry: str | None = None

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

@app.get("/api/search")
async def search_tickers(query: str):
    """
    Search for tickers in both stored data and Polygon API
    """
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
        
        # Filter out any results we're already tracking
        tracked_symbols = {r['symbol'] for r in results}
        new_results = [
            {**r, 'isTracked': False} 
            for r in polygon_results 
            if r['symbol'] not in tracked_symbols
        ]
        
        results.extend(new_results[:10 - len(results)])
    
    return {"results": results}

@app.get("/api/tickers", response_model=List[str])
async def get_tickers():
    return manager.get_tickers()

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

@app.get("/api/ticker-details/{symbol}")
async def get_ticker_details(symbol: str):
    details = manager.get_ticker_details()
    if symbol in details:
        return details[symbol]
    raise HTTPException(status_code=404, detail="Ticker not found")