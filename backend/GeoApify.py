import requests
import os
from dotenv import load_dotenv

load_dotenv()

GEO_APIKEY = os.getenv("GEO_APIKEY")

def convert_address_to_coordinates(address: str):
    url = "https://api.geoapify.com/v1/geocode/search"
    address = address + ", Maramures, Romania"
    params = {
        "text" : address,
        "format": "json",
        "filter": "countrycode:ro",
        "apiKey": GEO_APIKEY
    }
    response = requests.get(url,params=params)
    data = response.json()
    print("Geoapify response:", data)

    results = data.get("results", [])
    if results:
        lat = results[0]["lat"]
        lon = results[0]["lon"]
        return lat, lon

    # Dacă nu a găsit nimic
    raise ValueError(f"Address '{address}' was not found in Romania")