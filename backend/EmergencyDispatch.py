import logging
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from Incident import *
from Ambulance import *
from ORS import *
from GeoApify import *
from Hospital import *
from EmergencyCenter import *
import math
import models
from models import *
from database import engine, SessionLocal
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.date import DateTrigger
from fastapi.middleware.cors import CORSMiddleware
import atexit
import asyncio

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

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class Status:
    ACTIVE = "Active"
    RESOLVED = "Resolved"
    ASSIGNED = "Assigned"
    AVAILABLE = "Available"
    BUSY = "Busy"



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
        assigned_unit=incident.assigned_unit,
        assigned_hospital=incident.assigned_hospital
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
        assigned_unit=db_incident.assigned_unit,
        assigned_hospital=db_incident.assigned_hospital
    )
    return created


def update_incident_in_db(db_incident: Incident, updated_incident: Incident, db: Session = Depends(get_db)):
    db_incident.severity = updated_incident.severity
    db_incident.status = updated_incident.status
    db_incident.lat = updated_incident.lat
    db_incident.lon = updated_incident.lon
    db_incident.assigned_unit = updated_incident.assigned_unit
    db_incident.assigned_hospital = updated_incident.assigned_hospital

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
        AmbulanceDB.status == Status.AVAILABLE
    ).all()
    return available

def return_ambulance_to_service(ambulance_id: int, incident_id: int, db: Session = Depends(get_db)):
    """
    Scheduled job that runs after ETA to return ambulance to base.
    """
    try:

            ambulance = get_ambulance_by_id(ambulance_id, db)
            incident = get_incident_by_id(incident_id, db)
            if ambulance:
                ambulance.status = Status.AVAILABLE
                ambulance.lat = ambulance.default_lat
                ambulance.lon = ambulance.default_lon
                incident.status = Status.RESOLVED
                
                db.commit()
                db.refresh(ambulance)
                db.refresh(incident)
                
                logger.info(
                    f"Ambulance {ambulance_id} returned to service after handling "
                    f"Incident {incident_id}. Returning to base: "
                    f"({ambulance.default_lat}, {ambulance.default_lon})"
                )
            else:
                logger.warning(f"Ambulance {ambulance_id} not found for return to service")
 
    except Exception as e:
        logger.error(f"Error returning ambulance {ambulance_id} to service: {e}")


# Hospital helper functions

def get_hospital_by_id(hospital_id: int, db: Session = Depends(get_db)):
    hospital = db.query(HospitalDB).filter(HospitalDB.id == hospital_id).first()
    return hospital

def create_hospital_in_db(hospital: Hospital, db: Session = Depends(get_db)):
    db_hospital = HospitalDB(
        name=hospital.name,
        type=hospital.type,
        lat=hospital.lat,
        lon=hospital.lon
    )
    db.add(db_hospital)
    db.commit()
    db.refresh(db_hospital)
    logger.info(f"Hospital with ID {db_hospital.id} was successfully added to database.")
    return db_hospital

def convert_hospital_to_response(hospital: Hospital, db: Session = Depends(get_db)):
    db_hospital = Hospital(
        id=hospital.id,
        name=hospital.name,
        type=hospital.type,
        lat=hospital.lat,
        lon=hospital.lon
    )
    return db_hospital

def update_hospital_in_db(hospital: Hospital, updated_hospital: Hospital, db: Session = Depends(get_db)):
    hospital.name = updated_hospital.name
    hospital.type = updated_hospital.type
    hospital.lat = updated_hospital.lat
    hospital.lon = updated_hospital.lon

    db.commit()
    db.refresh(hospital)
    return hospital

# Emergency Center helper functions

def get_emergency_center_by_id(emergency_center_id: int, db: Session = Depends(get_db)):
    emergency_center = db.query(EmergencyCentersDB).filter(EmergencyCentersDB.id == emergency_center_id).first()
    return emergency_center

def create_emergency_center_in_db(emergency_center: EmergencyCenter, db: Session = Depends(get_db)):
    db_emergency_center = EmergencyCentersDB(
        name=emergency_center.name,
        lat=emergency_center.lat,
        lon=emergency_center.lon
    )
    db.add(db_emergency_center)
    db.commit()
    db.refresh(db_emergency_center)
    logger.info(f"Emergency Center with ID {db_emergency_center.id} was successfully added to database.")
    return db_emergency_center

def convert_emergency_center_to_response(emergency_center: EmergencyCenter, db: Session = Depends(get_db)):
    db_emergency_center = EmergencyCenter(
        id=emergency_center.id,
        name=emergency_center.name,
        lat=emergency_center.lat,
        lon=emergency_center.lon
    )
    return db_emergency_center

def update_emergency_center_in_db(emergency_center: EmergencyCenter, updated_emergency_center: EmergencyCenter, db: Session = Depends(get_db)):
    emergency_center.name = updated_emergency_center.name
    emergency_center.lat = updated_emergency_center.lat
    emergency_center.lon = updated_emergency_center.lon

    db.commit()
    db.refresh(emergency_center)
    return emergency_center

# API ENDPOINTS

# Incident Endpoints

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

# Ambulance Endpoints

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

# Hospital Endpoints

@app.post("/create_hospital", response_model=Hospital)
async def create_hospital(hospital: Hospital, db: Session = Depends(get_db)):
    hospiital = create_hospital_in_db(hospital, db)
    created_hospital = convert_hospital_to_response(hospiital, db) 
    return created_hospital

@app.get("/hospitals")
async def list_hospitals(db: Session = Depends(get_db)):
    hospitals = db.query(HospitalDB).all()
    return hospitals

@app.put("/update_hospital")
async def update_hospital(updated_hospital: Hospital, db: Session = Depends(get_db)):
    hospital = get_hospital_by_id(updated_hospital.id, db)
    if not hospital:
        logger.warning(f"Hospital with ID {updated_hospital.id} was not found.")
        raise HTTPException(status_code=404, detail="Hospital not found")
    
    updated = update_hospital_in_db(hospital, updated_hospital, db)
    logger.info(f"Hospital with ID {updated.id} was successfully updated!")
    return updated

@app.delete("/delete_hospital")
async def delete_hospital(hospital_id: int, db: Session = Depends(get_db)):
    hospital = get_hospital_by_id(hospital_id, db)
    if not hospital:
        logger.warning(f"Hospital with ID {hospital_id} was not found.")
        raise HTTPException(status_code=404, detail="Hospital not found")

    db.delete(hospital)
    db.commit()
    logger.info(f"Hospital with ID {hospital_id} was successfully deleted!")
    return {"msg": "Hospital was successfully deleted"}

# Emergency Center Endpoints
@app.post("/create_emergency_center", response_model=EmergencyCenter)
async def create_emergency_center(emergency_center: EmergencyCenter, db: Session = Depends(get_db)):
    emergency_center_db = create_emergency_center_in_db(emergency_center, db)
    created_emergency_center = convert_emergency_center_to_response(emergency_center_db, db) 
    return created_emergency_center

@app.get("/emergency_centers")
async def list_emergency_centers(db: Session = Depends(get_db)):
    emergency_centers = db.query(EmergencyCentersDB).all()
    return emergency_centers

@app.put("/update_emergency_center")
async def update_emergency_center(updated_emergency_center: EmergencyCenter, db: Session = Depends(get_db)):
    emergency_center = get_emergency_center_by_id(updated_emergency_center.id, db)
    if not emergency_center:
        logger.warning(f"Emergency Center with ID {updated_emergency_center.id} was not found.")
        raise HTTPException(status_code=404, detail="Emergency Center not found")
    
    updated = update_emergency_center_in_db(emergency_center, updated_emergency_center, db)
    logger.info(f"Emergency Center with ID {updated.id} was successfully updated!")
    return updated

@app.delete("/delete_emergency_center")
async def delete_emergency_center(emergency_center_id: int, db: Session = Depends(get_db)):
    emergency_center = get_emergency_center_by_id(emergency_center_id, db)
    if not emergency_center:
        logger.warning(f"Emergency Center with ID {emergency_center_id} was not found.")
        raise HTTPException(status_code=404, detail="Emergency Center not found")

    db.delete(emergency_center)
    db.commit()
    logger.info(f"Emergency Center with ID {emergency_center_id} was successfully deleted!")
    return {"msg": "Emergency Center was successfully deleted"}
    
# Emergency Dispatch Endpoints

@app.post("/dispatch/{incident_id}")
async def dispatch(incident_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db),):
    """
    Dispatch an ambulance to an incident.
    Scheduler handles the ambulance return to service after ETA.
    """
    incident = db.query(IncidentDB).filter(
        IncidentDB.id == incident_id,
        IncidentDB.status == Status.ACTIVE
    ).first()

    if not incident:
        logger.warning(f"Dispatch failed: Incident {incident_id} not found or not active")
        return {"msg": "Incident not found or already resolved"}

    # Get all active incidents ordered by severity
    all_active_incidents = db.query(IncidentDB).filter(
        IncidentDB.status == Status.ACTIVE
    ).order_by(IncidentDB.severity).all()

    # Get available ambulances
    available_ambulances = get_available_ambulances(db)

    # Get hospitals
    hospitals = db.query(HospitalDB).all()
    
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
    closest_hospital , hospital_eta = get_eta(hospitals, incident)

    if best_amb and eta is not None and closest_hospital and hospital_eta is not None:
        
        route_to_incident = get_route_geometry(
            best_amb.lon, best_amb.lat,
            incident.lon, incident.lat
        )

        route_to_hospital = get_route_geometry(
            incident.lon, incident.lat,
            closest_hospital.lon, closest_hospital.lat
        )
        
        # Update ambulance status
        best_amb.status = Status.BUSY
        # best_amb.lat = incident.lat
        # best_amb.lon = incident.lon

        # Update incident status
        incident.status = Status.ASSIGNED
        incident.assigned_unit = best_amb.id
        incident.assigned_hospital = closest_hospital.id
        incident.route_to_incident = route_to_incident
        incident.route_to_hospital = route_to_hospital

        db.commit()
        db.refresh(incident)
        db.refresh(best_amb)

        scene_time = 5  # minutes spent at the incident scene
        hospital_time = 5 # minutes spent at the hospital

        total_time = eta + scene_time + hospital_eta + hospital_time
        
        # Schedule job to return ambulance to service
        return_time = datetime.now() + timedelta(minutes= total_time)
        
        best_amb.available_at = return_time
        
        scheduler.add_job(
            return_ambulance_to_service,
            trigger=DateTrigger(run_date=return_time),
            args=[best_amb.id, incident.id],
            id=f"amb_{best_amb.id}_incident_{incident.id}",
            replace_existing=True
        )

        background_tasks.add_task(
            animate_ambulance_movement,
            best_amb,
            incident,
            route_to_incident,
            route_to_hospital,
            eta,
            scene_time,
            hospital_eta,
            hospital_time,
            db
        )

        logger.info(
            f"Ambulance {best_amb.id} dispatched to Incident {incident.id} "
            f"(severity {incident.severity}), then to Hospital {closest_hospital.id} ({closest_hospital.name}). "
            f"Journey: {eta}min (to incident) + {scene_time}min (scene) + {hospital_eta}min (to hospital) "
            f"+ {hospital_time}min (at hospital) = {total_time}min total. "
            f"Available at {return_time.strftime('%H:%M:%S')}"
        )

        return {
            "msg": f"Ambulance {best_amb.id} dispatched",
            "ambulance_to_incident_eta": eta,
            "scene_time": scene_time,
            "incident_to_hospital_eta": hospital_eta,
            "hospital_time": hospital_time,
            "total_time_minutes": total_time,
            "estimated_available_time": return_time.isoformat(),
            "route_to_incident": route_to_incident,
            "route_to_hospital": route_to_hospital,
            "hospital": {
                "id": closest_hospital.id,
                "name": closest_hospital.name,
                "lat": closest_hospital.lat,
                "lon": closest_hospital.lon
            },
            "incident": {
                "id": incident.id,
                "severity": incident.severity,
                "status": incident.status,
                "assigned_unit": incident.assigned_unit,
                "assigned_hospital": incident.assigned_hospital
            },
            "ambulance": {
                "id": best_amb.id,
                "status": best_amb.status,
                "current_location": {"lat": best_amb.lat, "lon": best_amb.lon}
            }
       }
    else:
        logger.warning(f"Could not calculate ETA for incident {incident_id}")
        return {"msg": "Could not find suitable ambulance/hospital or calculate route"}


@app.post("/dispatch_all")
async def dispatch_all(db: Session = Depends(get_db)):
    """
    Automatically dispatch all available ambulances to highest priority incidents.
    Scheduler handles ambulance returns to service.
    """
    # Get all active incidents ordered by severity
    all_active_incidents = db.query(IncidentDB).filter(
        IncidentDB.status == Status.ACTIVE
    ).order_by(IncidentDB.severity).all()

    # Get all available ambulances
    available_ambulances = get_available_ambulances(db)

    hospitals = db.query(HospitalDB).all()

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
        closest_hospital , hospital_eta = get_eta(hospitals, incident)

        if best_amb and eta is not None and closest_hospital and hospital_eta is not None:
            
            route_to_incident = get_route_geometry(
                best_amb.lon, best_amb.lat,
                incident.lon, incident.lat
            )

            route_to_hospital = get_route_geometry(
                incident.lon, incident.lat,
                closest_hospital.lon, closest_hospital.lat
            )

            # Update statuses
            best_amb.status = Status.BUSY
            
            for route in route_to_incident:
                if not route:
                    logger.warning(f"Batch dispatch failed: Could not get route geometry for Ambulance {best_amb.id} to Incident {incident.id}")
                    continue
                best_amb.lat = route[0]
                best_amb.lon = route[1]
                asyncio.sleep(1)  # Simulate time taken to update location
            
            for route in route_to_hospital:
                if not route:
                    logger.warning(f"Batch dispatch failed: Could not get route geometry for Ambulance {best_amb.id} to Hospital {closest_hospital.id}")
                    continue
                best_amb.lat = route[0]
                best_amb.lon = route[1]
                asyncio.sleep(1)  # Simulate time taken to update location

            # best_amb.lat = incident.lat
            # best_amb.lon = incident.lon
            incident.status = Status.ASSIGNED
            incident.assigned_unit = best_amb.id
            incident.assigned_hospital = closest_hospital.id
            incident.route_to_incident = route_to_incident
            incident.route_to_hospital = route_to_hospital


            ambulances_copy.remove(best_amb)

            # Schedule job to return ambulance to service
            scene_time = 5  # minutes spent at the incident scene
            hospital_time = 5 # minutes spent at the hospital

            total_time = eta + scene_time + hospital_eta + hospital_time
            # Schedule job to return ambulance to service
            return_time = datetime.now() + timedelta(minutes = total_time)

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
                "hospital_id": closest_hospital.id,
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
        IncidentDB.status == Status.ACTIVE
    ).order_by(IncidentDB.severity).all()

    available_ambulances = get_available_ambulances(db)

    busy_ambulances = db.query(AmbulanceDB).filter(
        AmbulanceDB.status == Status.BUSY
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

@app.get("/get_route/{ambulance_id}/{incident_id}")
async def get_route(ambulance_id: int, incident_id: int, db: Session = Depends(get_db)):
    print("Generating route for:", ambulance_id, incident_id)

    ambulance = get_ambulance_by_id(ambulance_id, db)
    incident = get_incident_by_id(incident_id, db)

    if not ambulance or not incident:
        logger.warning(f"Route retrieval failed: Ambulance {ambulance_id} or Incident {incident_id} not found")
        raise HTTPException(status_code=404, detail="Ambulance or Incident not found")

    # Debug print coordinates
    print(f"Ambulance coords: lon={ambulance.lon}, lat={ambulance.lat}")
    print(f"Incident coords: lon={incident.lon}, lat={incident.lat}")

    geometry = get_route_geometry(
        ambulance.lon, ambulance.lat,
        incident.lon, incident.lat
    )
    
    print("Geometry result:", geometry)
    
    if not geometry:
        logger.warning(f"Route retrieval failed: Could not get route geometry for Ambulance {ambulance_id} to Incident {incident_id}")
        raise HTTPException(status_code=500, detail="Could not retrieve route geometry")

    return {
        "ambulance_id": ambulance_id,
        "incident_id": incident_id,
        "route_geometry": geometry
    }

async def animate_ambulance_movement(ambulance: Ambulance, incident: Incident, route_to_incident, route_to_hospital, eta, scene_time, hospital_eta, hospital_time, db: Session = Depends(get_db)):
    try:
        if not ambulance or not incident:
            return
        total_time = eta + scene_time + hospital_eta + hospital_time
        logger.info(f"Ambulance {ambulance.id} starting journey to incident {incident.id}")
        
        for i, coord in enumerate(route_to_incident):
            if not coord or len(coord) < 2:
                continue
            
            ambulance.lon = coord[0]
            ambulance.lat = coord[1]
            
            db.commit()
            db.refresh(ambulance)
            
            await asyncio.sleep((eta/len(route_to_incident)) * 60)
            
            logger.debug(f"Ambulance {ambulance.id} at position {i+1}/{len(route_to_incident)}")
        
        # Ambulance arrives at incident
        logger.info(f"Ambulance {ambulance.id} arrived at incident {incident.id}")
        
        # Simulate scene time
        await asyncio.sleep(scene_time * 60)
        
        # Move along route to hospital
        logger.info(f"Ambulance {ambulance.id} heading to hospital")
        
        for i, coord in enumerate(route_to_hospital):
            if not coord or len(coord) < 2:
                continue
            
            ambulance.lon = coord[0]
            ambulance.lat = coord[1]
            
            db.commit()
            db.refresh(ambulance)
            
            await asyncio.sleep((hospital_eta/len(route_to_hospital)) * 60)
            
            logger.debug(f"Ambulance {ambulance.id} at position {i+1}/{len(route_to_hospital)} to hospital")
        
        # Arrived at hospital
        logger.info(f"Ambulance {ambulance.id} arrived at hospital")
        
        # Simulate hospital time
        await asyncio.sleep(hospital_time * 60)
        logger.info(f"Ambulance {ambulance.id} completed hospital procedures")

    except Exception as e:
        logger.error(f"Error animating ambulance {ambulance.id}: {e}")



