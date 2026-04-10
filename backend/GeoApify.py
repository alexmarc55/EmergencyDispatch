import requests
import os
from dotenv import load_dotenv
import time

load_dotenv()

GEO_APIKEY = os.getenv("GEO_APIKEY")

def convert_address_to_coordinates(address: str):
    url = "https://api.geoapify.com/v1/geocode/search"
    address = address + ", Baia Mare, Maramures, Romania"
    params = {
        "text" : address,
        "format": "json",
        "filter": "countrycode:ro",
        "apiKey": GEO_APIKEY
    }
    response = requests.get(url,params=params)
    data = response.json()

    results = data.get("results", [])
    if results:
        lat = results[0]["lat"]
        lon = results[0]["lon"]
        return lat, lon

    raise ValueError(f"Address '{address}' was not found in Romania")

def check_geoapify_health():
    """
     Health check for Geoapify API 
    """
    url = "https://api.geoapify.com/v1/geocode/reverse"
    params = {
        "lat": 47.6567, 
        "lon": 23.5850,
        "apiKey": GEO_APIKEY
    }
    
    try:
        start = time.time()
        response = requests.get(url, params=params, timeout=5)
        latency = round((time.time() - start) * 1000, 2)
        
        if response.status_code == 200:
            return {"status": "Healthy", "latency_ms": latency}
        elif response.status_code == 429:
            return {"status": "Rate Limited", "latency_ms": latency}
        return {"status": "Error", "code": response.status_code}
    except Exception as e:
        return {"status": "Down", "error": str(e)}