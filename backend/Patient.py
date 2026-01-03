from pydantic import BaseModel, ConfigDict
from typing import Optional

class Patient(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: Optional[int] = None
    name: str
    age: Optional[int] = None
    phone_number: Optional[str] = None
    medical_history: Optional[list] = None

class PatientUpdate(BaseModel):
    id: int
    name: Optional[str] = None
    age: Optional[int] = None
    phone_number: Optional[str] = None
    medical_history: Optional[list] = None