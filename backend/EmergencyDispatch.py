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
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.date import DateTrigger
import atexit


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("dispatch.log"),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

app = FastAPI()
models.Base.metadata.create_all(bind=engine)

# Initialize APScheduler
scheduler = BackgroundScheduler()
scheduler.start()

# Gracefully shut down scheduler
atexit.register(lambda: scheduler.shutdown())


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class Status:
    ACTIVE = "Active"
    RESOLVED = "Resolved"


# Background job to return ambulance to service
def return_ambulance_to_service(ambulance_id: int, incident_id: int):
    """
    Scheduled job that runs after ETA to return ambulance to base.
    """
    try:
        db = SessionLocal()
        
        try:
            ambulance = db.query(AmbulanceDB).filter(AmbulanceDB.id == ambulance_id).first()
            if ambulance:
                ambulance.status = "Available"
                ambulance.lat = ambulance.default_lat
                ambulance.lon = ambulance.default_lon
                
                db.commit()
                db.refresh(ambulance)
                
                logger.info(
                    f"Ambulance {ambulance_id} returned to service after handling "
                    f"Incident {incident_id}. Returning to base: "
                    f"({ambulance.default_lat}, {ambulance.default_lon})"
                )
            else:
                logger.warning(f"Ambulance {ambulance_id} not found for return to service")
        finally:
            db.close()
    
    except Exception as e:
        logger.error(f"Error returning ambulance {ambulance_id} to service: {e}")


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


def convert_incident_to_response(db_incident: Incident, db: Session = Depends(get_db)):
    created = Incident(
        id=db_incident.id,
        severity=db_incident.severity,
        status=db_incident.status,
        lat=db_incident.lat,
        lon=db_incident.lon,
        assigned_unit=db_incident.assigned_unit
    )
    return created


def update_incident_in_db(db_incident: Incident, updated_incident: Incident, db: Session = Depends(get_db)):
    db_incident.severity = updated_incident.severity
    db_incident.status = updated_incident.status
    db_incident.lat = updated_incident.lat
    db_incident.lon = updated_incident.lon
    db_incident.assigned_unit = updated_incident.assigned_unit

    db.commit()
    db.refresh(db_incident)
    return db_incident


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


def create_ambulance_in_db(ambulance: Ambulance, db: Session = Depends(get_db)):
    db_ambulance = AmbulanceDB(
        status=ambulance.status,
        lat=ambulance.lat,
        lon=ambulance.lon,
        default_lat=ambulance.default_lat,
        default_lon=ambulance.default_lon
    )
    db.add(db_ambulance)
    db.commit()
    db.refresh(db_ambulance)
    logger.info(f"Ambulance with ID {db_ambulance.id} was successfully added to database.")
    return db_ambulance


def convert_ambulance_to_response(ambulance: Ambulance, db: Session = Depends(get_db)):
    db_ambulance = Ambulance(
        id=ambulance.id,
        status=ambulance.status,
        lat=ambulance.lat,
        lon=ambulance.lon,
        default_lat=ambulance.default_lat,
        default_lon=ambulance.default_lon
    )
    return db_ambulance


def update_ambulance_in_db(ambulance: Ambulance, updated_ambulance: Ambulance, db: Session = Depends(get_db)):
    ambulance.status = updated_ambulance.status
    ambulance.lat = updated_ambulance.lat
    ambulance.lon = updated_ambulance.lon

    db.commit()
    db.refresh(ambulance)
    return ambulance


def get_available_ambulances(db: Session):
    """Get all ambulances with 'Available' status"""
    available = db.query(AmbulanceDB).filter(
        AmbulanceDB.status == "Available"
    ).all()
    return available


# API ENDPOINTS

@app.post("/create_incident", response_model=Incident)
async def create_incident(incident: Incident, db: Session = Depends(get_db)):
    db_incident = create_incident_in_db(incident, db)
    created_incident = convert_incident_to_response(db_incident, db)
    logger.info(f"Incident created: {created_incident}")
    return created_incident


@app.get("/incidents")
async def incidents(db: Session = Depends(get_db)):
    all_incidents = db.query(IncidentDB).all()
    return all_incidents


@app.put("/update_incident", response_model=Incident)
async def update_incident(updated_incident: Incident, db: Session = Depends(get_db)):
    db_incident = get_incident_by_id(updated_incident.id, db)
    if not db_incident:
        logger.warning(f"Incident with ID {updated_incident.id} was not found.")
        raise HTTPException(status_code=404, detail="Incident not found")
    
    updated = update_incident_in_db(db_incident, updated_incident, db)
    logger.info(f"Incident with ID {updated.id} was successfully updated!")
    return updated


@app.delete("/delete_incident")
async def delete_incident(incident_id: int, db: Session = Depends(get_db)):
    success = delete_incident_in_db(incident_id, db)
    if not success:
        logger.warning(f"Incident with ID {incident_id} was not found.")
        raise HTTPException(status_code=404, detail="Incident not found")

    logger.info(f"Incident with ID {incident_id} was successfully deleted!")
    return {"msg": "Incident was successfully deleted"}


@app.post("/create_ambulance", response_model=Ambulance)
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
    if not ambulance:
        logger.warning(f"Ambulance with ID {updated_ambulance.id} was not found.")
        raise HTTPException(status_code=404, detail="Ambulance not found")
    
    updated = update_ambulance_in_db(ambulance, updated_ambulance, db)
    updated_response = convert_ambulance_to_response(updated, db)
    logger.info(f"Ambulance with ID {updated.id} was successfully updated!")
    return updated_response


@app.delete("/delete_ambulance")
async def delete_ambulance(ambulance_id: int, db: Session = Depends(get_db)):
    db_deleted_ambulance = db.query(AmbulanceDB).filter(AmbulanceDB.id == ambulance_id).first()
    if not db_deleted_ambulance:
        logger.warning(f"Ambulance with ID {ambulance_id} was not found.")
        raise HTTPException(status_code=404, detail="Ambulance not found")

    db.delete(db_deleted_ambulance)
    db.commit()
    logger.info(f"Ambulance with ID {ambulance_id} was successfully deleted!")
    return {"msg": "Ambulance was successfully deleted"}


@app.get("/ambulance_status/{ambulance_id}")
async def ambulance_status(ambulance_id: int, db: Session = Depends(get_db)):
    """Get current status of an ambulance"""
    ambulance = get_ambulance_by_id(ambulance_id, db)

    return {
        "id": ambulance.id,
        "status": ambulance.status,
        "current_lat": ambulance.lat,
        "current_lon": ambulance.lon,
        "base_lat": ambulance.default_lat,
        "base_lon": ambulance.default_lon
    }


@app.post("/dispatch/{incident_id}")
async def dispatch(incident_id: int, db: Session = Depends(get_db)):
    """
    Dispatch an ambulance to an incident.
    Scheduler handles the ambulance return to service after ETA.
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

    # Get available ambulances
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
        # Update ambulance status
        best_amb.status = "Busy"
        best_amb.lat = incident.lat
        best_amb.lon = incident.lon

        # Update incident status
        incident.status = "Resolved"
        incident.assigned_unit = best_amb.id

        db.commit()
        db.refresh(incident)
        db.refresh(best_amb)

        # Schedule job to return ambulance to service
        return_time = datetime.now() + timedelta(minutes=eta * 2) # Here we do twice the size of the eta
                                                                  # because the ambulance also needs to
                                                                  # return back
        scheduler.add_job(
            return_ambulance_to_service,
            trigger=DateTrigger(run_date=return_time),
            args=[best_amb.id, incident.id],
            id=f"amb_{best_amb.id}_incident_{incident.id}",
            replace_existing=True
        )

        logger.info(
            f"Ambulance {best_amb.id} dispatched to Incident {incident.id} "
            f"(severity {incident.severity}) - ETA: {eta} min. "
            f"Scheduled return at {return_time.strftime('%H:%M:%S')}"
        )

        return {
            "msg": f"Ambulance {best_amb.id} dispatched",
            "eta_minutes": eta,
            "estimated_return_time": return_time.isoformat(),
            "incident": {
                "id": incident.id,
                "severity": incident.severity,
                "status": incident.status,
                "assigned_unit": incident.assigned_unit
            },
            "ambulance": {
                "id": best_amb.id,
                "status": best_amb.status,
                "current_location": {"lat": best_amb.lat, "lon": best_amb.lon}
            }
        }
    else:
        logger.warning(f"Could not calculate ETA for incident {incident_id}")
        return {"msg": "Could not find suitable ambulance or calculate route"}


@app.post("/dispatch_all")
async def dispatch_all(db: Session = Depends(get_db)):
    """
    Automatically dispatch all available ambulances to highest priority incidents.
    Scheduler handles ambulance returns to service.
    """
    # Get all active incidents ordered by severity
    all_active_incidents = db.query(IncidentDB).filter(
        IncidentDB.status == "Active"
    ).order_by(IncidentDB.severity).all()

    # Get all available ambulances
    available_ambulances = get_available_ambulances(db)

    if not all_active_incidents:
        return {"msg": "No active incidents"}

    if not available_ambulances:
        return {
            "msg": "No available ambulances",
            "pending_incidents": len(all_active_incidents)
        }

    dispatched = []
    ambulances_copy = available_ambulances.copy()

    # Dispatch ambulances to highest priority incidents
    for incident in all_active_incidents:
        if not ambulances_copy:
            break

        best_amb, eta = get_eta(ambulances_copy, incident)

        if best_amb and eta is not None:
            # Update statuses
            best_amb.status = "Busy"
            best_amb.lat = incident.lat
            best_amb.lon = incident.lon
            incident.status = "Resolved"
            incident.assigned_unit = best_amb.id

            # Remove from available list
            ambulances_copy.remove(best_amb)

            # Schedule job to return ambulance to service
            return_time = datetime.now() + timedelta(minutes=eta)
            scheduler.add_job(
                return_ambulance_to_service,
                trigger=DateTrigger(run_date=return_time),
                args=[best_amb.id, incident.id],
                id=f"amb_{best_amb.id}_incident_{incident.id}",
                replace_existing=True
            )

            dispatched.append({
                "incident_id": incident.id,
                "severity": incident.severity,
                "ambulance_id": best_amb.id,
                "eta_minutes": eta,
                "estimated_return_time": return_time.isoformat()
            })

            logger.info(
                f"Batch dispatch: Ambulance {best_amb.id} -> "
                f"Incident {incident.id} (severity {incident.severity}). "
                f"Return scheduled at {return_time.strftime('%H:%M:%S')}"
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

    available_ambulances = get_available_ambulances(db)

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


@app.get("/scheduled_jobs")
async def get_scheduled_jobs():
    """Get all currently scheduled jobs for returning ambulances"""
    jobs = scheduler.get_jobs()
    return {
        "scheduled_returns": len(jobs),
        "jobs": [
            {
                "job_id": job.id,
                "next_run_time": job.next_run_time.isoformat() if job.next_run_time else None
            }
            for job in jobs
        ]
    }