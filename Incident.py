from pydantic import BaseModel
from typing import Optional
from Location import *
class Incident(BaseModel):
    id: Optional[int]
    severity: int
    location: Location
    assigned_unit: Optional[int] = None
