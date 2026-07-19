from pydantic import BaseModel, Field

class Token(BaseModel):
    access_token: str
    token_type: str
    refresh_token: str | None = None

class TokenData(BaseModel):
    username: str | None = None

class UserCreate(BaseModel):
    name: str
    email: str
    phone: str | None = Field(default=None)
    password: str
    role: str = "CITIZEN"

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: str | None = None
    role: str
    organizationId: str
