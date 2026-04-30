from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any, Dict

class Incident(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: Optional[int] = None
    severity: int
    type: str
    status: Optional[str] = None
    lat: float
    lon: float
    nr_patients: Optional[int] = 1
    total_patients: Optional[int] = 1
    assigned_units: Optional[List[int]] = None
    patient_ids: Optional[List[int]] = None # Added patient_ids field
    assigned_hospital: Optional[int] = None
    route_to_incident: Optional[Dict[int, List[Any]]] = {}
    route_to_hospital: Optional[Dict[int, List[Any]]] = {}
    started_at: Optional[str] = None
    ended_at: Optional[str] = None
    processing_time_seconds: Optional[int] = None


class IncidentUpdate(BaseModel):
    id: int
    severity: Optional[int] = None
    status: Optional[str] = None
    type: Optional[str] = None
    nr_patients: Optional[int] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    assigned_unit: Optional[int] = None
    assigned_hospital: Optional[int] = None
    patient_ids: Optional[List[int]] = None # Added patient_ids to update model