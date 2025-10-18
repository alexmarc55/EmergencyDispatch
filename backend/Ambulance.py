from pydantic import BaseModel
from typing import Optional

class Ambulance(BaseModel):
  id: Optional[int]
  status: str
  lat: float
  lon: float
  default_lat: Optional[float] = None
  default_lon: Optional[float] = None