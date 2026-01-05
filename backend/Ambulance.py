from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any

class Ambulance(BaseModel):
  model_config = ConfigDict(from_attributes=True)
  id: Optional[int] = None
  status: str
  lat: float
  lon: float
  capacity: int
  default_lat: Optional[float] = None
  default_lon: Optional[float] = None
  driver_id: Optional[int] = None
  base_hospital_id: Optional[int] = None
  available_at: Optional[str] = None
  route_to_assigned_unit: Optional[List[Any]] = None

class AmbulanceUpdate(BaseModel):
  id: int
  status: Optional[str] = None
  lat: Optional[float] = None
  lon: Optional[float] = None
  capacity: Optional[int] = None
  default_lat: Optional[float] = None
  default_lon: Optional[float] = None
  driver_id: Optional[int] = None
  available_at: Optional[str] = None
  base_hospital_id: Optional[int] = None