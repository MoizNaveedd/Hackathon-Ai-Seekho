from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db, engine, Base
from agents import AntigravityOrchestrator
from agents_v2 import OrchestratorV2
from typing import Dict, Any, List, Optional
from models import User
from bookings_notifications import bookings_router, notifications_router

# Ensure tables exist
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Karigar AI Service Orchestrator API")
app.include_router(bookings_router)
app.include_router(notifications_router)

class Message(BaseModel):
    role: str
    content: str

class ServiceRequest(BaseModel):
    messages: List[Message]
    user_id: Optional[int] = None

class BookingRequest(BaseModel):
    user_id: int
    provider_id: int
    slot: str
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

# ============ V1 Endpoints (Legacy) ============

@app.post("/v1/process_request", response_model=Dict[str, Any])
def process_request_v1(request: ServiceRequest, db: Session = Depends(get_db)):
    user = None
    if request.user_id:
        user = db.query(User).filter(User.id == request.user_id).first()
    orchestrator = AntigravityOrchestrator()
    chat_history = [{"role": msg.role, "content": msg.content} for msg in request.messages]
    response = orchestrator.process_request(chat_history, db, user=user)
    return response

# ============ V2 Endpoints (Current) ============

@app.post("/chat", response_model=Dict[str, Any])
def chat(request: ServiceRequest, db: Session = Depends(get_db)):
    """Conversational endpoint: extracts intent, validates, returns providers with selectable slots."""
    user = None
    if request.user_id:
        user = db.query(User).filter(User.id == request.user_id).first()

    orchestrator = OrchestratorV2()
    chat_history = [{"role": msg.role, "content": msg.content} for msg in request.messages]
    response = orchestrator.process_chat(chat_history, db, user=user)
    return response

@app.post("/book", response_model=Dict[str, Any])
def book(request: BookingRequest, db: Session = Depends(get_db)):
    """Booking endpoint: called after user selects a provider + slot from FE."""
    orchestrator = OrchestratorV2()
    response = orchestrator.process_booking(
        user_id=request.user_id,
        provider_id=request.provider_id,
        slot=request.slot,
        db=db,
        language=request.language
    )
    return response

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
    """SSO Login & Registration Endpoint:
    Matches users by google_id or email. If the user doesn't exist, it auto-registers them
    with fallback coordinates in Islamabad (G-13).
    """
    google_user = request.data.user
    
    # Check if user already exists in DB
    user = db.query(User).filter(
        (User.google_id == google_user.id) | (User.email == google_user.email)
    ).first()
    
    if not user:
        # Create a new User
        user = User(
            name=google_user.name,
            email=google_user.email,
            google_id=google_user.id,
            photo=google_user.photo,
            given_name=google_user.givenName,
            family_name=google_user.familyName,
            # Assign fallback default location parameters
            location="G-13",
            latitude=33.6331,
            longitude=72.9691
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        message = "User registered successfully via SSO"
    else:
        # Update existing user profile details from Google
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
