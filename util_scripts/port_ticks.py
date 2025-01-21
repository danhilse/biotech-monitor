import json
import os

def update_ticker_details():
    # Print current working directory and list files
    current_dir = os.getcwd()
    print(f"Current working directory: {current_dir}")
    print(f"Files in directory: {os.listdir(current_dir)}")

    # Read the market data
    try:
        with open('market_data.json', 'r') as f:
            market_data = json.load(f)
            print("Successfully read market_data.json")
    except FileNotFoundError:
        print("Error: market_data.json not found")
        print(f"Looked for file at: {os.path.abspath('market_data.json')}")
        return
    
    # Read the existing tickers file
    try:
        with open('tickers.json', 'r') as f:
            tickers_data = json.load(f)
            print("Successfully read tickers.json")
    except FileNotFoundError:
        print("Error: tickers.json not found")
        print(f"Looked for file at: {os.path.abspath('tickers.json')}")
        return
    except json.JSONDecodeError as e:
        print(f"Error decoding tickers.json: {e}")
        return
    
    # For each stock in market data
    for stock in market_data:
        symbol = stock['symbol']
        
        # Create ticker detail entry using the new names structure
        ticker_detail = {
            "name": stock.get('names', {}).get('long', ''),
            "sector": stock.get('sector', ''),
            "industry": stock.get('industry', ''),
            "names": {
                "polygon": stock.get('names', {}).get('polygon', ''),
                "yfinance": stock.get('names', {}).get('long', ''),
                "short": stock.get('names', {}).get('short', '')
            }
        }
        
        # Add to ticker_details if not already present
        if symbol not in tickers_data['ticker_details']:
            tickers_data['ticker_details'][symbol] = ticker_detail
    
    # Write updated data back to tickers.json
    try:
        with open('tickers.json', 'w') as f:
            json.dump(tickers_data, f, indent=2)
        print("Successfully updated ticker details")
    except Exception as e:
        print(f"Error writing to tickers.json: {e}")

if __name__ == "__main__":
    update_ticker_details()