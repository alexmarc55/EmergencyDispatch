import logging
from fastapi import FastAPI, Depends, HTTPException
from Incident import *
from Ambulance import *
from ORS import *
from GeoApify import *
import math
import models
from models import *
from database import engine, SessionLocal
from sqlalchemy.orm import Session



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
models.Base.metadata.create_all(bind = engine) # Creates the database when starting the app
ambulances = {}


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/create_incident", response_model= Incident)
async def create_incident(incident: Incident, db: Session = Depends(get_db)):
  db_incident = IncidentDB(
      severity = incident.severity,
      status = incident.status,
      lat = incident.lat,
      lon = incident.lon,
      assigned_unit = incident.assigned_unit
  )
  db.add(db_incident)
  db.commit()
  db.refresh(db_incident)
  created_incident = Incident(
      id = db_incident.id,
      severity = db_incident.severity,
      status = db_incident.status,
      lat = db_incident.lat,
      lon = db_incident.lon,
      assigned_unit = db_incident.assigned_unit
  )

  logger.info(f"Incident created: {created_incident}")
  return created_incident

@app.get("/incidents")
async def incidents(db: Session = Depends(get_db)):
    all_incidents = db.query(IncidentDB).all()
    return all_incidents

@app.put("/update_incident", response_model= Incident)
async def update_incident(updated_incident: Incident, db: Session = Depends(get_db)):
   db_updated_incident = db.query(IncidentDB).filter(IncidentDB.id == updated_incident.id).first()
   if not db_updated_incident:
       logger.warning(f"Incident with ID {updated_incident.id} was not found.")
       raise HTTPException(status_code=404, detail=f"Incident not found")

   db_updated_incident.severity = updated_incident.severity
   db_updated_incident.status = updated_incident.status
   db_updated_incident.lat = updated_incident.lat
   db_updated_incident.lon = updated_incident.lon
   db_updated_incident.assigned_unit = updated_incident.assigned_unit

   db.commit()
   db.refresh(db_updated_incident)

   updated = Incident(
       id = db_updated_incident.id,
       severity = db_updated_incident.severity,
       status = db_updated_incident.status,
       lat = db_updated_incident.lat,
       lon = db_updated_incident.lon,
       assigned_unit = db_updated_incident.assigned_unit
   )

   logger.info(f"Incident with ID {updated.id} was succesfully updated!")
   return updated

@app.delete("/delete_incident")
async def delete_incident(incident_id: int, db: Session = Depends(get_db)):
    db_deleted_incident = db.query(IncidentDB).filter(IncidentDB.id == incident_id).first()
    if not db_deleted_incident:
        logger.warning(f"Incident with ID {incident_id} was not found.")
        raise HTTPException(status_code=404, detail=f"Incident not found")

    db.delete(db_deleted_incident)
    db.commit()
    logger.info(f"Incident with ID {incident_id} was succesfully deleted!")


@app.post("/create_ambulance", response_model= Ambulance)
async def create_ambulance(ambulance: Ambulance, db: Session = Depends(get_db)):
    db_ambulance = AmbulanceDB(
        status=ambulance.status,
        lat=ambulance.lat,
        lon=ambulance.lon
    )
    db.add(db_ambulance)
    db.commit()
    db.refresh(db_ambulance)

    created_ambulance = Ambulance(
        id=db_ambulance.id,
        status=db_ambulance.status,
        lat=db_ambulance.lat,
        lon=db_ambulance.lon,
        default_lat=db_ambulance.default_lat,
        default_lon=db_ambulance.default_lon
    )

    ambulances[created_ambulance.id] = created_ambulance

    return created_ambulance

@app.get("/ambulances")
async def list_ambulances(db: Session = Depends(get_db)):
    ambulances = db.query(AmbulanceDB).all()
    return ambulances

@app.put("/update_ambulance")
async def update_ambulance(updated_ambulance: Ambulance, db: Session = Depends(get_db)):
    db_updated_ambulance = db.query(AmbulanceDB).filter(AmbulanceDB.id == updated_ambulance.id).first()
    if not db_updated_ambulance:
        logger.warning(f"Incident with ID {updated_incident.id} was not found.")
        raise HTTPException(status_code=404, detail=f"Incident not found")

    db_updated_ambulance.severity = updated_ambulance.severity
    db_updated_ambulance.status = updated_ambulance.status
    db_updated_ambulance.lat = updated_ambulance.lat
    db_updated_ambulance.lon = updated_ambulance.lon

    db.commit()
    db.refresh(db_updated_ambulance)

    updated = Ambulance(
        id=db_updated_ambulance.id,
        status=db_updated_ambulance.status,
        lat=db_updated_ambulance.lat,
        lon=db_updated_ambulance.lon,
        default_lat = db_updated_ambulance.default_lat,
        default_lon = db_updated_ambulance.default_lon
    )

    logger.info(f"Incident with ID {updated.id} was succesfully updated!")
    return updated


@app.post("/dispatch/{incident_id}")
async def dispatch(incident_id: int, db: Session = Depends(get_db)):
    # Query for the specific incident - check if it exists and is Active
    incident = db.query(IncidentDB).filter(
        IncidentDB.id == incident_id,
        IncidentDB.status == "Active"
    ).first()

    if not incident:
        logger.warning(f"Dispatch failed: Incident {incident_id} not found or not active")
        return {"msg": "Incident not found or already resolved"}

    # Find the nearest available ambulance
    available_ambulances = db.query(AmbulanceDB).filter(AmbulanceDB.status == "Available").all()

    if not available_ambulances:
        logger.warning(f"Dispatch failed: No available ambulances for incident {incident_id}")
        return {"msg": "No available ambulances"}

    best_amb, eta = get_eta(available_ambulances, incident)

    # Assign that ambulance to the incident
    if best_amb and eta is not None:
        # Update ambulance status
        best_amb.status = "Busy"

        # Update incident status and assign unit
        incident.status = "Resolved"
        incident.assigned_unit = best_amb.id

        # Commit changes to database
        db.commit()
        db.refresh(incident)
        db.refresh(best_amb)

        logger.info(
            f"Ambulance {best_amb.id} dispatched "
            f"to Incident {incident.id} at {eta} min away"
        )

        # Convert to Pydantic models for response
        incident_response = Incident(
            id=incident.id,
            severity=incident.severity,
            status=incident.status,
            lat=incident.lat,
            lon=incident.lon,
            assigned_unit=incident.assigned_unit
        )

        ambulance_response = Ambulance(
            id=best_amb.id,
            status=best_amb.status,
            lat=best_amb.lat,
            lon=best_amb.lon,
            default_lat=best_amb.default_lat,
            default_lon=best_amb.default_lon
        )

        return {
            "msg": f"Ambulance {best_amb.id} dispatched",
            "eta_minutes": eta,
            "incident": incident_response.dict(),
            "ambulance": ambulance_response.dict()
        }
    else:
        logger.warning(f"Dispatch failed: Could not calculate ETA for incident {incident_id}")
        return {"msg": "Could not find suitable ambulance or calculate route"}

    # TODO: We need to treat corner cases when one ambulance is available and there are 2 incidents,
    #  one more severe but further

@app.post("/convert_address")
async def convert_address(address: str):
    lat, lon = convert_address_to_coordinates(address)
    return {"lat": lat, "lon": lon}
