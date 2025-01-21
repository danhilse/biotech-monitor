import requests
from dotenv import load_dotenv
import os

load_dotenv()

def get_company_name(ticker):
    base_url = "https://api.polygon.io/v3/reference/tickers/"
    api_key = os.getenv('POLYGON_API_KEY')
    
    url = f"{base_url}{ticker}?apiKey={api_key}"
    response = requests.get(url)
    
    if response.status_code == 200:
        data = response.json()
        name = data['results']['name']
        formatted_name = format_company_name(name)
        return formatted_name
    return None

def format_company_name(name):
    """
    Convert company name to lowercase, dash-separated format.
    Example: 'ADMA Biologics, Inc.' -> 'adma-biologics-inc'
    """
    # Remove periods and commas
    name = name.replace('.', '').replace(',', '')
    
    # Convert to lowercase and replace spaces with dashes
    name = name.lower().replace(' ', '-')
    
    return name

print(get_company_name('ADMA'))