from pydantic import BaseModel
from typing import Optional

class EmergencyCenter(BaseModel):
    id: Optional[int] = None
    name: str
    lat: float
    lon: float

class EmergencyCenterUpdate(BaseModel):
    id: int
    name: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None