from pydantic import BaseModel
from typing import Optional

class Patient(BaseModel):
    id: Optional[int]
    name: str
    age: Optional[int] = None
    phone_number: Optional[str] = None
    medical_history: Optional[list] = None