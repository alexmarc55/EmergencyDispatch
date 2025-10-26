from pydantic import BaseModel
from typing import Optional

class Hospital(BaseModel):
    id: Optional[int]
    name: str
    type: str
    lat: float
    lon: float
