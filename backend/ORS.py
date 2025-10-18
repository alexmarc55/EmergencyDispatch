import requests
import os
from dotenv import load_dotenv

load_dotenv()
ORS_API_KEY = os.getenv("ORS_API_KEY")
sorted_etas = []
def get_eta(ambulances, incident):
    url = "https://api.openrouteservice.org/v2/matrix/driving-car"
    headers = {
        "Authorization": ORS_API_KEY,
        "Content-Type": "application/json"
    }

    # Here we append all the ambulances locations to minimise the requests we make to the API
    # and add the incident at the end
    locations = [ [amb.lon, amb.lat] for amb in ambulances ]
    locations.append([incident.lon, incident.lat])

    body = {
        "locations": locations,
        "metrics": ["duration", "distance"]
    }

    response = requests.post(url, json=body, headers=headers)
    if response.status_code != 200:
        print("ORS Error:", response.status_code, response.text)
        return None, None

    data = response.json()
    if "durations" not in data:
        print("No durations in response:", data)
        return None, None

    data = response.json()
    print(data)

    incident_index = len(locations) - 1
    best_eta = float("inf")
    best_ambulance = None
    results = []
    # We go through all the ETA's to see which one's the closest ( in minutes )
    for i, amb in enumerate(ambulances):
        duration = data["durations"][i][incident_index]
        if duration is None:
            continue
        eta = duration / 60
        results.append((amb,round(eta,1)))
        if eta < best_eta:
            best_eta = eta
            best_ambulance = amb
    results.sort(key=lambda x: x[1])
    sorted_etas = results
    return best_ambulance, round(best_eta, 1)
