from pydantic import BaseModel, ConfigDict
from typing import Optional

class Incident(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: Optional[int]
    severity: int
    type: str
    status: Optional[str] = None
    lat: float
    lon: float
    nr_patients: Optional[int] = 1
    assigned_unit: Optional[int] = None
    assigned_hospital: Optional[int] = None
    route_to_incident: Optional[dict] = None
    route_to_hospital: Optional[dict] = None
    started_at: Optional[str] = None
    ended_at: Optional[str] = None
