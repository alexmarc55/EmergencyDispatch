from pydantic import BaseModel
from typing import Optional

class Incident(BaseModel):
    id: Optional[int]
    severity: int
    lat: float
    lon: float
    assigned_unit: Optional[int] = None
