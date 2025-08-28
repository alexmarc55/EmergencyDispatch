from pydantic import BaseModel
from typing import Optional
from Location import *
class Ambulance(BaseModel):
  id: Optional[int]
  status: str
  location: Location
  default_location: Optional[Location] = None