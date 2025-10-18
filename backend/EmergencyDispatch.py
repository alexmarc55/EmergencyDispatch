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
import asyncio
from datetime import datetime, timedelta


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


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class Status:
    ACTIVE = "Active"
    RESOLVED = "Resolved"
# Helper functions for incidents

def get_incident_by_id(incident_id: int, db: Session = Depends(get_db)):
    incident = db.query(IncidentDB).filter(IncidentDB.id == incident_id).first()
    return incident

def create_incident_in_db(incident: Incident, db: Session = Depends(get_db)):
    db_incident = IncidentDB(
        severity=incident.severity,
        status=incident.status,
        lat=incident.lat,
        lon=incident.lon,
        assigned_unit=incident.assigned_unit
    )
    db.add(db_incident)
    db.commit()
    db.refresh(db_incident)
    return db_incident

def convert_incident_to_response(incident: Incident, db: Session = Depends(get_db)):
    created =  Incident(
      id = db_incident.id,
      severity = db_incident.severity,
      status = db_incident.status,
      lat = db_incident.lat,
      lon = db_incident.lon,
      assigned_unit = db_incident.assigned_unit
  )
    return created

def update_incident_in_db(db_incident: Incident, updated_incident: Incident, db: Session = Depends(get_db)):
    db_updated_incident.severity = updated_incident.severity
    db_updated_incident.status = updated_incident.status
    db_updated_incident.lat = updated_incident.lat
    db_updated_incident.lon = updated_incident.lon
    db_updated_incident.assigned_unit = updated_incident.assigned_unit

    db.commit()
    db.refresh(db_updated_incident)
    return db_updated_incident

def delete_incident_in_db(incident_id: int, db: Session = Depends(get_db)):
    incident = get_incident_by_id(incident_id, db)
    if not incident:
        return False
    db.delete(incident)
    db.commit()
    return True



# Helper functions for ambulances
def get_ambulance_by_id(ambulance_id: int, db: Session = Depends(get_db)):
    ambulance = db.query(AmbulanceDB).filter(AmbulanceDB.id == ambulance_id).first()
    if not ambulance:
        logger.warning(f"Ambulance with ID {ambulance_id} was not found.")
        raise HTTPException(status_code=404, detail="Ambulance was not found")
    return ambulance

def create_ambulance_in_db(db_ambulance: Ambulance, db: Session = Depends(get_db)):
    db_ambulance = AmbulanceDB(
        status=ambulance.status,
        lat=ambulance.lat,
        lon=ambulance.lon
    )
    db.add(db_ambulance)
    db.commit()
    db.refresh(db_ambulance)
    logger.info(f"Ambulance with ID {db_ambulance.id} was successfully added to database.")
    return db_ambulance

def convert_ambulance_to_response(ambulance: Ambulance, db: Session = Depends(get_db)):
    ambulance = Ambulance(
        id=db_ambulance.id,
        status=db_ambulance.status,
        lat=db_ambulance.lat,
        lon=db_ambulance.lon,
        default_lat=db_ambulance.default_lat,
        default_lon=db_ambulance.default_lon
    )
    return ambulance

def update_ambulance_in_db(ambulance: Ambulance, updated_ambulance: Ambulance, db: Session = Depends(get_db)):
    ambulance.status = updated_ambulance.status
    ambulance.lat = updated_ambulance.lat
    ambulance.lon = updated_ambulance.lon

    db.commit()
    db.refresh(ambulance)

# API'S
@app.post("/create_incident", response_model= Incident)
async def create_incident(incident: Incident, db: Session = Depends(get_db)):
  db_incident = create_incident_in_db(incident, db)
  created_incident = convert_incident_to_response(db_incident, db)
  logger.info(f"Incident created: {created_incident}")
  return created_incident

@app.get("/incidents")
async def incidents(db: Session = Depends(get_db)):
    all_incidents = db.query(IncidentDB).all()
    return all_incidents

@app.put("/update_incident", response_model= Incident)
async def update_incident(updated_incident: Incident, db: Session = Depends(get_db)):
    db_incident = get_incident_by_id(updated_incident.id, db)
    if not db_incident:
        logger.warning(f"Incident with ID {updated_incident.id} was not found.")
        raise HTTPException(status_code=404, detail=f"Incident not found")
    updated = convert_incident_to_response(update_incident, db)

    logger.info(f"Incident with ID {updated.id} was succesfully updated!")
    return updated

@app.delete("/delete_incident")
async def delete_incident(incident_id: int, db: Session = Depends(get_db)):
    success = delete_incident_in_db(incident_id, db)
    if not success:
        logger.warning(f"Incident with ID {incident_id} was not found.")
        raise HTTPException(status_code=404, detail=f"Incident not found")

    logger.info(f"Incident with ID {incident_id} was succesfully deleted!")
    return {"msg": "Incident was successfully deleted"}

@app.post("/create_ambulance", response_model= Ambulance)
async def create_ambulance(ambulance: Ambulance, db: Session = Depends(get_db)):
    db_ambulance = create_ambulance_in_db(ambulance, db)
    created_ambulance = convert_ambulance_to_response(db_ambulance, db)
    return created_ambulance

@app.get("/ambulances")
async def list_ambulances(db: Session = Depends(get_db)):
    ambulances = db.query(AmbulanceDB).all()
    return ambulances

@app.put("/update_ambulance")
async def update_ambulance(updated_ambulance: Ambulance, db: Session = Depends(get_db)):
    ambulance = get_ambulance_by_id(updated_ambulance.id, db)
    if not db_updated_ambulance:
        logger.warning(f"Incident with ID {updated_incident.id} was not found.")
        raise HTTPException(status_code=404, detail=f"Incident not found")
    updated = update_ambulance_in_db(ambulance, updated_ambulance)

    updated = convert_ambulance_to_response(updated_ambulance, db)

    logger.info(f"Incident with ID {updated.id} was succesfully updated!")
    return updated

@app.delete("/delete_ambulance")
async def delete_ambulance(ambulance_id: int, db: Session = Depends(get_db)):
    db_deleted_ambulance = db.query(AmbulanceDB).filter(AmbulanceDB.id == ambulance_id).first()
    if not db_deleted_ambulance:
        logger.warning(f"Ambulance with ID {ambulance_id} was not found.")
        raise HTTPException(status_code=404, detail=f"Ambulance not found")

    db.delete(db_deleted_ambulance)
    db.commit()
    logger.info(f"Ambulance with ID {ambulance_id} was succesfully deleted!")


@app.get("/ambulance_status/{ambulance_id}")
async def ambulance_status(ambulance_id: int, db: Session = Depends(get_db)):
    """
    Check if an ambulance is truly available (accounting for simulated time)
    """
    ambulance = db.query(AmbulanceDB).filter(AmbulanceDB.id == ambulance_id).first()

    if not ambulance:
        raise HTTPException(status_code=404, detail="Ambulance not found")

    now = datetime.now()
    is_available = (
            ambulance.status == "Available" or
            (ambulance.status == "Busy" and ambulance.available_at and ambulance.available_at <= now)
    )

    time_until_available = None
    if ambulance.available_at and ambulance.available_at > now:
        time_until_available = (ambulance.available_at - now).total_seconds() / 60

    return {
        "id": ambulance.id,
        "status": ambulance.status,
        "is_actually_available": is_available,
        "available_at": ambulance.available_at.isoformat() if ambulance.available_at else None,
        "minutes_until_available": round(time_until_available, 2) if time_until_available else 0
    }

def get_available_ambulances(db: Session):
    """
    Get ambulances that are either Available or whose available_at time has passed
    """
    now = datetime.now()

    # Get truly available ambulances
    available = db.query(AmbulanceDB).filter(
        AmbulanceDB.status == "Available"
    ).all()

    # Get ambulances whose time has expired
    expired_busy = db.query(AmbulanceDB).filter(
        AmbulanceDB.status == "Busy",
        AmbulanceDB.available_at <= now
    ).all()

    # Update expired ambulances to Available
    for amb in expired_busy:
        amb.status = "Available"
        amb.lat = amb.default_lat
        amb.lon = amb.default_lon
        amb.available_at = None
        logger.info(f"Ambulance {amb.id} automatically returned to service")

    db.commit()

    return available + expired_busy


@app.post("/dispatch/{incident_id}")
async def dispatch(incident_id: int, db: Session = Depends(get_db)):
    """
    Smart dispatch with timestamp-based simulation (no actual waiting)
    """
    incident = db.query(IncidentDB).filter(
        IncidentDB.id == incident_id,
        IncidentDB.status == "Active"
    ).first()

    if not incident:
        logger.warning(f"Dispatch failed: Incident {incident_id} not found or not active")
        return {"msg": "Incident not found or already resolved"}

    # Get all active incidents ordered by severity
    all_active_incidents = db.query(IncidentDB).filter(
        IncidentDB.status == "Active"
    ).order_by(IncidentDB.severity).all()

    # Find available ambulances (including those whose time has expired)
    available_ambulances = get_available_ambulances(db)

    if not available_ambulances:
        logger.warning(f"Dispatch failed: No available ambulances for incident {incident_id}")
        return {
            "msg": "No available ambulances",
            "incident_id": incident_id,
            "position_in_queue": all_active_incidents.index(incident) + 1,
            "total_active_incidents": len(all_active_incidents)
        }

    # Check priority
    num_ambulances = len(available_ambulances)
    num_incidents = len(all_active_incidents)

    if num_incidents > num_ambulances:
        priority_incidents = all_active_incidents[:num_ambulances]

        if incident not in priority_incidents:
            logger.info(
                f"Incident {incident_id} (severity {incident.severity}) "
                f"not in priority queue"
            )
            return {
                "msg": "Incident queued - higher priority incidents being handled first",
                "incident_id": incident_id,
                "severity": incident.severity,
                "position_in_queue": all_active_incidents.index(incident) + 1,
                "total_active_incidents": num_incidents,
                "available_ambulances": num_ambulances
            }

    # Dispatch ambulance
    best_amb, eta = get_eta(available_ambulances, incident)

    if best_amb and eta is not None:
        # Calculate when ambulance will be available again
        available_at = datetime.now() + timedelta(minutes=eta)

        # Update ambulance status
        best_amb.status = "Busy"
        best_amb.available_at = available_at

        # Update incident status
        incident.status = "Resolved"
        incident.assigned_unit = best_amb.id

        db.commit()
        db.refresh(incident)
        db.refresh(best_amb)

        logger.info(
            f"Ambulance {best_amb.id} dispatched to Incident {incident.id} "
            f"(severity {incident.severity}) - ETA: {eta} min, "
            f"Available at: {available_at.strftime('%H:%M:%S')}"
        )

        return {
            "msg": f"Ambulance {best_amb.id} dispatched",
            "eta_minutes": eta,
            "available_at": available_at.isoformat(),
            "incident": {
                "id": incident.id,
                "severity": incident.severity,
                "status": incident.status,
                "assigned_unit": incident.assigned_unit
            },
            "ambulance": {
                "id": best_amb.id,
                "status": best_amb.status,
                "available_at": best_amb.available_at.isoformat()
            }
        }
    else:
        logger.warning(f"Could not calculate ETA for incident {incident_id}")
        return {"msg": "Could not find suitable ambulance or calculate route"}


@app.post("/dispatch_all")
async def dispatch_all(db: Session = Depends(get_db)):
    """
    Automatically dispatches all available ambulances to the
    highest priority active incidents. Used to process the entire queue.
    """
    # Get all active incidents ordered by severity
    all_active_incidents = db.query(IncidentDB).filter(
        IncidentDB.status == "Active"
    ).order_by(IncidentDB.severity).all()

    # Get all available ambulances
    available_ambulances = db.query(AmbulanceDB).filter(
        AmbulanceDB.status == "Available"
    ).all()

    if not all_active_incidents:
        return {"msg": "No active incidents"}

    if not available_ambulances:
        return {
            "msg": "No available ambulances",
            "pending_incidents": len(all_active_incidents)
        }

    dispatched = []

    # Dispatch ambulances to highest priority incidents
    for incident in all_active_incidents:
        if not available_ambulances:
            break

        best_amb, eta = get_eta(available_ambulances, incident)

        if best_amb and eta is not None:
            # Update statuses
            best_amb.status = "Busy"
            incident.status = "Resolved"
            incident.assigned_unit = best_amb.id

            # Remove from available list
            available_ambulances.remove(best_amb)

            dispatched.append({
                "incident_id": incident.id,
                "severity": incident.severity,
                "ambulance_id": best_amb.id,
                "eta_minutes": eta
            })

            logger.info(
                f"Batch dispatch: Ambulance {best_amb.id} -> "
                f"Incident {incident.id} (severity {incident.severity})"
            )

    # Commit all changes
    db.commit()

    remaining_incidents = len(all_active_incidents) - len(dispatched)

    return {
        "msg": f"Dispatched {len(dispatched)} ambulance(s)",
        "dispatched": dispatched,
        "remaining_incidents": remaining_incidents,
        "remaining_incident_ids": [inc.id for inc in all_active_incidents[len(dispatched):]]
    }


@app.get("/dispatch_status")
async def dispatch_status(db: Session = Depends(get_db)):
    """
    Get current dispatch status: active incidents, available ambulances,
    and priority queue information.
    """
    all_active_incidents = db.query(IncidentDB).filter(
        IncidentDB.status == "Active"
    ).order_by(IncidentDB.severity).all()

    available_ambulances = db.query(AmbulanceDB).filter(
        AmbulanceDB.status == "Available"
    ).all()

    busy_ambulances = db.query(AmbulanceDB).filter(
        AmbulanceDB.status == "Busy"
    ).all()

    return {
        "active_incidents": len(all_active_incidents),
        "available_ambulances": len(available_ambulances),
        "busy_ambulances": len(busy_ambulances),
        "queue_status": "Critical" if len(all_active_incidents) > len(available_ambulances) else "Normal",
        "priority_queue": [
            {
                "incident_id": inc.id,
                "severity": inc.severity,
                "lat": inc.lat,
                "lon": inc.lon
            } for inc in all_active_incidents[:5]
        ]
    }

@app.post("/convert_address")
async def convert_address(address: str):
    lat, lon = convert_address_to_coordinates(address)
    return {"lat": lat, "lon": lon}


@app.post("/advance_time")
async def advance_time(minutes: int, db: Session = Depends(get_db)):
    """
    For testing: Advance time by X minutes to simulate time passing
    This makes all ambulances with available_at in the past become Available
    """
    now = datetime.now()
    future_time = now + timedelta(minutes=minutes)

    busy_ambulances = db.query(AmbulanceDB).filter(
        AmbulanceDB.status == "Busy",
        AmbulanceDB.available_at <= future_time
    ).all()

    freed_ambulances = []
    for amb in busy_ambulances:
        amb.status = "Available"
        amb.lat = amb.default_lat
        amb.lon = amb.default_lon
        old_time = amb.available_at
        amb.available_at = None
        freed_ambulances.append({
            "id": amb.id,
            "was_available_at": old_time.isoformat()
        })

    db.commit()

    return {
        "msg": f"Simulated {minutes} minutes passing",
        "freed_ambulances": len(freed_ambulances),
        "ambulances": freed_ambulances
    }
