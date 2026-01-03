from pydantic import BaseModel
from typing import Optional

class User(BaseModel):
    id: Optional[int] = None
    username: str = None
    password: str = None
    role: str = None
    badge_number: Optional[str] = None
