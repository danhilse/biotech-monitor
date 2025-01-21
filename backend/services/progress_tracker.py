from typing import Dict, Optional
from datetime import datetime

class ProgressTracker:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._init()
        return cls._instance
    
    def _init(self):
        self.reset()
    
    def reset(self):
        self.total_tickers = 0
        self.processed_tickers = 0
        self.current_ticker = ""
        self.start_time = None
        self.is_running = False
        self.error = None
    
    def start_collection(self, total_tickers: int):
        self.total_tickers = total_tickers
        self.processed_tickers = 0
        self.start_time = datetime.now()
        self.is_running = True
        self.error = None
    
    def update_progress(self, ticker: str):
        self.current_ticker = ticker
        self.processed_tickers += 1
    
    def set_error(self, error: str):
        self.error = error
        self.is_running = False
    
    def complete(self):
        self.is_running = False
    
    def get_status(self) -> Dict:
        if not self.start_time:
            return {
                "status": "idle",
                "progress": 0,
                "current_ticker": "",
                "total_tickers": 0,
                "processed_tickers": 0,
                "error": self.error
            }
        
        progress = (self.processed_tickers / self.total_tickers * 100) if self.total_tickers > 0 else 0
        
        return {
            "status": "running" if self.is_running else "complete",
            "progress": round(progress, 2),
            "current_ticker": self.current_ticker,
            "total_tickers": self.total_tickers,
            "processed_tickers": self.processed_tickers,
            "error": self.error
        }

progress_tracker = ProgressTracker()