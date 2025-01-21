from typing import Dict, Optional
from datetime import datetime

class ProgressTracker:
    def __init__(self):
        self.reset()
    
    def reset(self):
        """Reset all tracking variables to initial state"""
        self.total_tickers = 0
        self.processed_tickers = 0
        self.current_ticker = ""
        self.start_time = None
        self.is_running = False
        self.error = None
    
    def start_collection(self, total_tickers: int):
        """Start a new collection process"""
        self.total_tickers = total_tickers
        self.processed_tickers = 0
        self.start_time = datetime.now()
        self.is_running = True
        self.error = None
    
    def update_progress(self, ticker: str):
        """Update progress with the current ticker being processed"""
        self.current_ticker = ticker
        self.processed_tickers += 1
    
    def set_error(self, error: str):
        """Set an error message and stop the collection"""
        self.error = error
        self.is_running = False
    
    def complete(self):
        """Mark the collection as complete"""
        self.is_running = False
    
    def get_status(self) -> Dict:
        """Get the current status of the collection process"""
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

# Create a single instance to be used throughout the application
_progress_tracker = ProgressTracker()

def get_progress_tracker() -> ProgressTracker:
    """Get the singleton instance of the progress tracker"""
    return _progress_tracker