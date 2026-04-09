from pydantic import BaseModel

class PasswordCheck(BaseModel):
    plain_password: str
    hashed_password: str