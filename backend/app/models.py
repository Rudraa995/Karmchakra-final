import json
from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Float,
    DateTime,
    CheckConstraint
)

from .database import Base


class TreeSubmission(Base):
    __tablename__ = "tree_submissions"

    id = Column(Integer, primary_key=True, index=True)
    tree_name = Column(String(100), nullable=False)
    location = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    description = Column(Text, nullable=False)
    photo_path = Column(String(500), nullable=False)
    status = Column(String(20), nullable=False, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        CheckConstraint(
            "latitude >= -90 AND latitude <= 90",
            name="valid_latitude"
        ),
        CheckConstraint(
            "longitude >= -180 AND longitude <= 180",
            name="valid_longitude"
        ),
        CheckConstraint(
            "char_length(description) <= 500",
            name="description_max_length"
        ),
    )


class EmergencyReport(Base):
    __tablename__ = "emergency_reports"

    id = Column(Integer, primary_key=True, index=True)
    incident_type = Column(String(100), nullable=False)
    photo_path = Column(String(500), nullable=False)
    location = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    description = Column(Text, nullable=False)
    status = Column(String(50), nullable=False, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        CheckConstraint(
            "latitude IS NULL OR (latitude >= -90 AND latitude <= 90)",
            name="emergency_valid_latitude"
        ),
        CheckConstraint(
            "longitude IS NULL OR (longitude >= -180 AND longitude <= 180)",
            name="emergency_valid_longitude"
        ),
        CheckConstraint(
            "char_length(description) <= 500",
            name="emergency_description_max_length"
        ),
    )


class FeedAnimalSubmission(Base):
    __tablename__ = "feed_animal_submissions"

    id = Column(Integer, primary_key=True, index=True)
    evidence_paths = Column(Text, nullable=False)
    location = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    animal_type = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String(30), nullable=False, default="pending")
    karma_points = Column(Integer, nullable=False, default=10)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        CheckConstraint(
            "latitude IS NULL OR (latitude >= -90 AND latitude <= 90)",
            name="feed_valid_latitude"
        ),
        CheckConstraint(
            "longitude IS NULL OR (longitude >= -180 AND longitude <= 180)",
            name="feed_valid_longitude"
        ),
        CheckConstraint(
            "karma_points >= 0",
            name="feed_valid_karma"
        ),
    )


class RescueReport(Base):
    __tablename__ = "rescue_reports"

    id = Column(Integer, primary_key=True, index=True)
    photo_path = Column(String(500), nullable=False)
    location = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    description = Column(Text, nullable=False)
    priority = Column(String(20), nullable=False, default="normal")
    status = Column(String(30), nullable=False, default="pending")
    karma_points = Column(Integer, nullable=False, default=10)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        CheckConstraint(
            "latitude IS NULL OR (latitude >= -90 AND latitude <= 90)",
            name="rescue_valid_latitude"
        ),
        CheckConstraint(
            "longitude IS NULL OR (longitude >= -180 AND longitude <= 180)",
            name="rescue_valid_longitude"
        ),
        CheckConstraint(
            "priority IN ('normal', 'emergency')",
            name="rescue_valid_priority"
        ),
        CheckConstraint(
            "karma_points >= 0",
            name="rescue_valid_karma"
        ),
    )


class AdoptionHelpSubmission(Base):
    __tablename__ = "adoption_help_submissions"

    id = Column(Integer, primary_key=True, index=True)
    photo_path = Column(String(500), nullable=False)
    animal_name = Column(String(100), nullable=False)
    animal_type = Column(String(100), nullable=False)
    age = Column(String(50), nullable=True)
    gender = Column(String(30), nullable=True)
    location = Column(String(255), nullable=False)
    details = Column(Text, nullable=False)
    contact = Column(String(150), nullable=False)
    status = Column(String(30), nullable=False, default="pending")
    karma_points = Column(Integer, nullable=False, default=20)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        CheckConstraint(
            "karma_points >= 0",
            name="adoption_valid_karma"
        ),
    )