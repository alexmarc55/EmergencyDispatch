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
