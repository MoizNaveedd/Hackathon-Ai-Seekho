from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True, nullable=True)
    google_id = Column(String, unique=True, index=True, nullable=True)
    photo = Column(String, nullable=True)
    given_name = Column(String, nullable=True)
    family_name = Column(String, nullable=True)
    location = Column(String, index=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    device_token = Column(String, nullable=True)

    bookings = relationship("Booking", back_populates="user")

class Provider(Base):
    __tablename__ = "providers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    service_type = Column(String, index=True)
    location = Column(String, index=True)
    rating = Column(Float)
    available_slots = Column(String, default="[]")  # JSON string
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    device_token = Column(String, nullable=True)

    bookings = relationship("Booking", back_populates="provider")

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    user_intent = Column(String)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    provider_id = Column(Integer, ForeignKey("providers.id"))
    time_slot = Column(String)
    status = Column(String)

    provider = relationship("Provider", back_populates="bookings")
    user = relationship("User", back_populates="bookings")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    type = Column(String, default="general")  # e.g., booking_confirmation, reminder, alert, general
    is_read = Column(Boolean, default=False)
    created_at = Column(String, nullable=True)  # ISO string timestamp
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    provider_id = Column(Integer, ForeignKey("providers.id"), nullable=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=True)

    user = relationship("User")
    provider = relationship("Provider")
    booking = relationship("Booking")
