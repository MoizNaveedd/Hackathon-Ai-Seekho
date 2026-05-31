from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
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
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)

    bookings = relationship("Booking", back_populates="user")
    chat_sessions = relationship("ChatSession", back_populates="user")

class Provider(Base):
    __tablename__ = "providers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    service_type = Column(String, index=True)
    location = Column(String, index=True)
    rating = Column(Float)
    hourly_rate = Column(Float, default=500.0)  # PKR per hour
    available_slots = Column(Text, default="{}")  # JSON: {"2026-05-19": ["10:00 AM", "2:00 PM"], ...}
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    device_token = Column(String, nullable=True)
    email = Column(String, unique=True, index=True, nullable=True)
    phone = Column(String, nullable=True)
    password_hash = Column(String, nullable=True)
    avatar = Column(String, nullable=True)
    role = Column(String, default="service_provider")
    created_at = Column(DateTime, server_default=func.now())

    bookings = relationship("Booking", back_populates="provider")

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    user_intent = Column(String)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    provider_id = Column(Integer, ForeignKey("providers.id"))
    time_slot = Column(String)
    booking_date = Column(String, nullable=True)  # "2026-05-19"
    status = Column(String)
    service_type = Column(String, nullable=True)
    price = Column(Float, nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    feedback = Column(Text, nullable=True)  # provider's feedback
    customer_feedback = Column(Text, nullable=True)  # user's feedback comment
    customer_rating = Column(Float, nullable=True)  # user's raw 1-5 star rating
    effective_rating = Column(Float, nullable=True)  # sentiment-adjusted rating used in provider aggregate
    prompt = Column(Text, nullable=True)  # concise chat summary after booking

    provider = relationship("Provider", back_populates="bookings")
    user = relationship("User", back_populates="bookings")

    # Service location derived from the booking's user (where the service is delivered)
    @property
    def location(self):
        return self.user.location if self.user else None

    @property
    def latitude(self):
        return self.user.latitude if self.user else None

    @property
    def longitude(self):
        return self.user.longitude if self.user else None

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    type = Column(String, default="general")
    is_read = Column(Boolean, default=False)
    created_at = Column(String, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    provider_id = Column(Integer, ForeignKey("providers.id"), nullable=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=True)

    user = relationship("User")
    provider = relationship("Provider")
    booking = relationship("Booking")

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String, default="active")  # active, completed
    extracted_state = Column(Text, default="{}")  # JSON: cached intent state
    context_summary = Column(Text, nullable=True)  # summarized older messages
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", order_by="ChatMessage.id")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"), nullable=False)
    role = Column(String, nullable=False)  # "user" or "assistant"
    content = Column(Text, nullable=False)
    state_snapshot = Column(Text, nullable=True)   # JSON snapshot of session state at message time
    extra_data = Column(Text, nullable=True)       # JSON for additional metadata (e.g. requires_location, provider selection)
    created_at = Column(DateTime, server_default=func.now())

    session = relationship("ChatSession", back_populates="messages")
