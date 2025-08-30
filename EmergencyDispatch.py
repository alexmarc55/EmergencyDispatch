import logging
from fastapi import FastAPI
from Incident import *
from Ambulance import *
from ORS import *
from GeoApify import *
import math
import requests


logging.basicConfig(
    level=logging.INFO,  # DEBUG, INFO, WARNING, ERROR
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("dispatch.log"),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

app = FastAPI()

all_incidents = {}
active_incidents = {}
ambulances = {}

@app.post("/create_incident", response_model= Incident)
async def create_incident(incident: Incident):
  all_incidents[incident.id] = incident
  active_incidents[incident.id] = incident
  logger.info(f"Incident created: {incident}")
  return incident

@app.get("/incidents")
async def incidents():
    return all_incidents

@app.post("/create_ambulance", response_model= Ambulance)
async def create_ambulance(ambulance: Ambulance):
    ambulances[ambulance.id] = ambulance
    logger.info(f"Ambulance created: {ambulance}")
    return ambulance

@app.get("/ambulances")
async def list_ambulances():
    return ambulances

@app.post("/dispatch/{incident_id}")
async def dispatch(incident_id: int):
    if incident_id not in active_incidents:
        logger.warning(f"Dispatch failed: Incident {incident_id} not found")
        return {"msg": "Incident not found or already resolved"}

    incident = active_incidents[incident_id]

    # Find the nearest ambulance available
    ambs = list(ambulances.values())
    best_amb, eta = get_eta(ambs, incident)

    # Assign that ambulance to the incident

    if best_amb:
      best_amb.status = "Busy"
      incident.assigned_unit = best_amb.id
      active_incidents.pop(incident.id)

      logger.info(
          f"Ambulance {best_amb.id} dispatched "
          f"to Incident {incident.id} at {eta} min away"
      )
      return {
          "msg": f"Ambulance {best_amb.id} dispatched",
          "eta_minutes": round(eta, 1),
          "incident": incident.dict(),
          "ambulance": best_amb.dict()
      }

    return {"msg": "No available ambulances"}



    # TODO: We need to treat corner cases when one ambulance is available and there are 2 incidents,
    #  one more severe but further

@app.post("/convert_address")
async def convert_address(address: str):
    lat, lon = convert_address_to_coordinates(address)
    return {"lat": lat, "lon": lon}



def haversine(incident_location: Location, ambulance_location: Location): # Mathematics formula to calculate the real distance between two coordinates
    R = 6371.0  # Earth's radius

    lat1_rad = math.radians(incident_location.lat)
    lon1_rad = math.radians(incident_location.lon)
    lat2_rad = math.radians(ambulance_location.lat)
    lon2_rad = math.radians(ambulance_location.lon)

    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad

    a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    distance = R * c
    return distance
