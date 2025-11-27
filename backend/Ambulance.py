from pydantic import BaseModel
from typing import Optional

class Ambulance(BaseModel):
  id: Optional[int]
  status: str
  lat: float
  lon: float
  capacity: int
  default_lat: Optional[float] = None
  default_lon: Optional[float] = None
  route_to_assigned_unit: Optional[dict] = None