from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

class Registration(Base):
    __tablename__ = "registrations"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(150), nullable=False)
    username = Column(String(80), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    login_records = relationship(
        "Login",
        back_populates="user",
        cascade="all, delete-orphan"
    )

class Login(Base):
    __tablename__ = "logins"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("registrations.id", ondelete="CASCADE"), nullable=True, index=True)
    attempted_email = Column(String(255), nullable=False)
    login_time = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    success = Column(Boolean, nullable=False)

    user = relationship("Registration", back_populates="login_records")