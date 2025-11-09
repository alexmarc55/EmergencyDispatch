from pydantic import BaseModel
from typing import Optional

class Incident(BaseModel):
    id: Optional[int]
    severity: int
    status: Optional[str] = None
    lat: float
    lon: float
    assigned_unit: Optional[int] = None
    assigned_hospital: Optional[int] = None
    route_to_incident: Optional[dict] = None
    route_to_hospital: Optional[dict] = None
