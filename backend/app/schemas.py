from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class TreeResponse(BaseModel):
    id: int
    tree_name: str
    location: str
    latitude: float
    longitude: float
    description: str
    photo_path: str
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FeedAnimalResponse(BaseModel):
    id: int
    evidence_paths: list[str]
    location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    animal_type: str
    description: str
    status: str
    karma_points: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RescueResponse(BaseModel):
    id: int
    photo_path: str
    location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    description: str
    priority: str
    status: str
    karma_points: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdoptionResponse(BaseModel):
    id: int
    photo_path: str
    animal_name: str
    animal_type: str
    age: Optional[str] = None
    gender: Optional[str] = None
    location: str
    details: str
    contact: str
    status: str
    karma_points: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AnimalHistoryItem(BaseModel):
    id: int
    activity_type: str
    title: str
    date: datetime
    location: str
    details: str
    status: str
    karma_points: int
    evidence_paths: list[str] = []


class AnimalHistoryResponse(BaseModel):
    total_karma_points: int
    feed_count: int
    rescue_count: int
    adoption_count: int
    records: list[AnimalHistoryItem]


class RegistrationRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    username: str = Field(min_length=3, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class RegistrationResponse(BaseModel):
    id: int
    full_name: str
    username: str
    email: EmailStr
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: RegistrationResponse


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=150)
    username: Optional[str] = Field(default=None, min_length=3, max_length=80)


class ProfileResponse(BaseModel):
    id: int
    full_name: str
    username: str
    email: EmailStr
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)