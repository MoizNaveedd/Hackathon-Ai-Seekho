import json
import logging
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db, engine, Base
from agents_v2 import OrchestratorV2
from typing import Dict, Any, List, Optional
from models import User, ChatSession, ChatMessage
from bookings_notifications import bookings_router, notifications_router
from providers import providers_router
from auth_bookings_api import router as auth_bookings_router

# Configure logging — shows agent activity, LLM provider used, errors
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)-20s | %(levelname)-7s | %(message)s",
    datefmt="%H:%M:%S",
)

# Ensure tables exist
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Karigar AI Service Orchestrator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(bookings_router)
app.include_router(notifications_router)
app.include_router(providers_router)
app.include_router(auth_bookings_router)


# ============ Request Schemas ============

class ChatRequest(BaseModel):
    message: Optional[str] = None
    user_id: Optional[int] = None
    session_id: Optional[int] = None  # None = new conversation
    latitude: Optional[float] = None             # GPS from map picker
    longitude: Optional[float] = None            # GPS from map picker
    location_name: Optional[str] = None          # Location name from map picker (e.g. "Gulshan")
    selected_provider_id: Optional[int] = None   # When user selects a provider from FE
    selected_slot: Optional[str] = None           # Selected time slot
    selected_date: Optional[str] = None           # Selected date (YYYY-MM-DD)
    selected_cancel_booking_id: Optional[int] = None  # When user taps a booking card to cancel

class BookingRequest(BaseModel):
    user_id: int
    provider_id: int
    slot: str
    booking_date: str  # "2026-05-19"
    language: Optional[str] = "english"

class LocationUpdateRequest(BaseModel):
    user_id: int
    latitude: float
    longitude: float

class GoogleUser(BaseModel):
    id: str
    email: str
    name: str
    givenName: Optional[str] = None
    familyName: Optional[str] = None
    photo: Optional[str] = None

class GoogleUserData(BaseModel):
    user: GoogleUser
    scopes: Optional[List[str]] = None
    serverAuthCode: Optional[str] = None
    idToken: Optional[str] = None

class SSOLoginRequest(BaseModel):
    type: str
    data: GoogleUserData

# ============ V2 Endpoints (Current) ============

@app.post("/chat/v2", response_model=Dict[str, Any])
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    """Conversational endpoint: handles all phases of the booking flow.

    - Phase 1 (gathering_intent): send message only
    - Phase 2 (selecting_provider): send selected_provider_id + selected_slot + selected_date
    - Phase 3 (confirming_booking): send message (yes/no/change time/change provider)
    """
    orchestrator = OrchestratorV2()
    response = orchestrator.process_chat(
        message=request.message,
        user_id=request.user_id,
        db=db,
        session_id=request.session_id,
        latitude=request.latitude,
        longitude=request.longitude,
        location_name=request.location_name,
        selected_provider_id=request.selected_provider_id,
        selected_slot=request.selected_slot,
        selected_date=request.selected_date,
        selected_cancel_booking_id=request.selected_cancel_booking_id,
    )
    return response




@app.post("/book", response_model=Dict[str, Any])
def book(request: BookingRequest, db: Session = Depends(get_db)):
    """Booking endpoint: called after user selects a provider + slot + date from FE."""
    orchestrator = OrchestratorV2()
    response = orchestrator.process_booking(
        user_id=request.user_id,
        provider_id=request.provider_id,
        slot=request.slot,
        booking_date=request.booking_date,
        db=db,
        language=request.language
    )
    return response

@app.get("/chat/{session_id}/history")
def get_chat_history(
    session_id: int,
    limit: int = Query(50, ge=1, le=200, description="Max messages to return"),
    offset: int = Query(0, ge=0, description="Messages to skip, counting back from newest"),
    db: Session = Depends(get_db),
):
    """Get a session's chat history, paginated. Newest messages first by page
    (offset walks back in time); messages within a page are chronological."""
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    base_query = db.query(ChatMessage).filter(ChatMessage.session_id == session_id)
    total = base_query.count()

    # Page from newest backward, then flip to chronological order for rendering.
    rows = (
        base_query.order_by(ChatMessage.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    rows.reverse()

    messages = [
        {
            "role": msg.role,
            "content": msg.content,
            "created_at": msg.created_at.isoformat() if msg.created_at else None
        }
        for msg in rows
    ]

    return {
        "session_id": session.id,
        "user_id": session.user_id,
        "status": session.status,
        "total": total,
        "limit": limit,
        "offset": offset,
        "has_more": offset + len(messages) < total,
        "messages": messages
    }

@app.get("/users/{user_id}/sessions")
def list_user_sessions(
    user_id: int,
    limit: int = Query(20, ge=1, le=100, description="Max sessions to return"),
    offset: int = Query(0, ge=0, description="Number of sessions to skip"),
    db: Session = Depends(get_db),
):
    """List a user's chat sessions (most recent first) with a short preview, paginated."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Filter out empty sessions in the query so pagination counts stay consistent.
    base_query = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == user_id, ChatSession.messages.any())
    )
    total = base_query.count()
    sessions = (
        base_query.order_by(ChatSession.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    result = []
    for s in sessions:
        msgs = s.messages
        last_msg = msgs[-1]
        try:
            state = json.loads(s.extracted_state) if s.extracted_state else {}
        except (json.JSONDecodeError, TypeError):
            state = {}

        result.append({
            "session_id": s.id,
            "status": s.status,
            "service_type": state.get("service_type"),
            "phase": state.get("phase"),
            "message_count": len(msgs),
            "last_message": last_msg.content,
            "last_message_at": last_msg.created_at.isoformat() if last_msg.created_at else None,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        })

    return {
        "user_id": user_id,
        "total": total,
        "limit": limit,
        "offset": offset,
        "has_more": offset + len(result) < total,
        "sessions": result,
    }

@app.post("/update_user_location")
def update_user_location(request: LocationUpdateRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == request.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.latitude = request.latitude
    user.longitude = request.longitude
    db.commit()
    return {"message": "Location updated successfully"}

@app.post("/sso_login")
def sso_login(request: SSOLoginRequest, db: Session = Depends(get_db)):
    """SSO Login & Registration Endpoint"""
    google_user = request.data.user

    user = db.query(User).filter(
        (User.google_id == google_user.id) | (User.email == google_user.email)
    ).first()

    if not user:
        user = User(
            name=google_user.name,
            email=google_user.email,
            google_id=google_user.id,
            photo=google_user.photo,
            given_name=google_user.givenName,
            family_name=google_user.familyName,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        message = "User registered successfully via SSO"
    else:
        user.name = google_user.name
        user.photo = google_user.photo
        user.given_name = google_user.givenName
        user.family_name = google_user.familyName
        db.commit()
        db.refresh(user)
        message = "User logged in successfully via SSO"

    return {
        "message": message,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "google_id": user.google_id,
            "photo": user.photo,
            "location": user.location,
            "latitude": user.latitude,
            "longitude": user.longitude
        }
    }

@app.get("/")
def read_root():
    return {"message": "Welcome to Karigar AI Service Orchestrator"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
