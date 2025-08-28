import logging
from fastapi import FastAPI
from Incident import *
from Ambulance import *
import math

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
    min_distance = 999
    closest_ambulance = None
    for amb_id, amb in ambulances.items():
      if amb.status == "Available":
          dist = haversine(incident.location, amb.location)
          if dist < min_distance:
              min_distance = dist
              closest_ambulance = amb

    # Assign that ambulance to the incident

    if closest_ambulance:
      closest_ambulance.status = "Busy"
      incident.assigned_unit = closest_ambulance.id
      active_incidents.pop(incident.id)

      logger.info(
          f"Ambulance {closest_ambulance.id} dispatched "
          f"to Incident {incident.id} at {min_distance} km"
      )
      return {
              "msg": f"Ambulance {closest_ambulance.id} dispatched",
              "distance_km": round(min_distance, 2),
              "incident": incident,
              "ambulance": closest_ambulance
          }

    return {"msg": "No available ambulances"}



    # TODO: We need to treat corner cases when one ambulance is available and there are 2 incidents,
    #  one more severe but further


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
