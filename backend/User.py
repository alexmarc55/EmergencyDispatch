from pydantic import BaseModel
from typing import Optional

class User(BaseModel):
    id: Optional[int]
    username: str
    password: str
    role: str
    badge_number: Optional[str] = None
