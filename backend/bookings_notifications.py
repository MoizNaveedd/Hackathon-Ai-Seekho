import os
import json
import logging
import datetime
import requests
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from database import get_db
from models import Booking, Notification, User, Provider

# Configure logging
logger = logging.getLogger("bookings_notifications")
logger.setLevel(logging.INFO)

# Create routers
bookings_router = APIRouter(prefix="/bookings", tags=["Bookings"])
notifications_router = APIRouter(prefix="/notifications", tags=["Notifications"])


# ==========================================
# PYDANTIC SCHEMAS
# ==========================================

class ProviderSummary(BaseModel):
    id: int
    name: str
    service_type: str
    location: str
    rating: float

    class Config:
        from_attributes = True

class UserSummary(BaseModel):
    id: int
    name: str
    email: Optional[str] = None
    location: str

    class Config:
        from_attributes = True

class BookingDetailResponse(BaseModel):
    id: int
    user_intent: Optional[str] = None
    user_id: Optional[int] = None
    provider_id: int
    time_slot: str
    status: str
    provider: Optional[ProviderSummary] = None
    user: Optional[UserSummary] = None

    class Config:
        from_attributes = True

class BookingListResponse(BaseModel):
    bookings: List[BookingDetailResponse]
    total_count: int
    page: int
    limit: int
    total_pages: int

class NotificationSendRequest(BaseModel):
    user_id: Optional[int] = Field(None, description="Recipient User ID (optional)")
    provider_id: Optional[int] = Field(None, description="Recipient Provider ID (optional)")
    booking_id: Optional[int] = Field(None, description="Associated Booking ID (optional)")
    title: str = Field(..., min_length=1, description="Notification Title")
    message: str = Field(..., min_length=1, description="Notification Message Body")
    type: str = Field("general", description="Type of notification (booking_confirmation, reminder, etc.)")

class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    type: str
    is_read: bool
    created_at: Optional[str] = None
    user_id: Optional[int] = None
    provider_id: Optional[int] = None
    booking_id: Optional[int] = None

    class Config:
        from_attributes = True

class NotificationListResponse(BaseModel):
    notifications: List[NotificationResponse]
    total_count: int
    page: int
    limit: int
    total_pages: int

class TokenRegisterRequest(BaseModel):
    user_id: Optional[int] = None
    provider_id: Optional[int] = None
    device_token: str = Field(..., description="FCM, APNs or Expo push token")

class PushTriggerResult(BaseModel):
    status: str
    service: str
    recipient_token: Optional[str] = None
    response_details: Optional[str] = None


# ==========================================
# PUSH NOTIFICATION HELPER ENGINE
# ==========================================

def trigger_push_notification(device_token: str, title: str, message: str, data: dict = None) -> PushTriggerResult:
    """
    Sends a push notification to a device token using Firebase Cloud Messaging (FCM).
    Supports:
    1. FCM V1 HTTP API: If 'FCM_SERVICE_ACCOUNT_JSON' or 'GOOGLE_APPLICATION_CREDENTIALS' is provided.
    2. FCM Legacy HTTP API: If 'FCM_SERVER_KEY' or 'FIREBASE_SERVER_KEY' is provided.
    3. Mock simulation delivery: If no credentials are configured, logs the exact JSON payloads for V1 & Legacy APIs.
    """
    if not device_token:
        return PushTriggerResult(
            status="skipped",
            service="none",
            recipient_token=None,
            response_details="No device token provided"
        )

    # 1. Check for FCM V1 credentials
    fcm_service_account = os.environ.get("FCM_SERVICE_ACCOUNT_JSON") or os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    # Also look for a local firebase-service-account.json file
    if not fcm_service_account and os.path.exists("firebase-service-account.json"):
        fcm_service_account = "firebase-service-account.json"
        
    # 2. Check for FCM Legacy Server Key
    fcm_server_key = os.environ.get("FCM_SERVER_KEY") or os.environ.get("FIREBASE_SERVER_KEY")

    # Construct standard FCM payloads
    # FCM V1 Payload Format (nesting data under 'message' to be fully compliant)
    v1_payload = {
        "message": {
            "token": device_token,
            "notification": {
                "title": title,
                "body": message
            },
            "data": {str(k): str(v) for k, v in (data or {}).items()}  # FCM requires string-to-string values for data fields
        }
    }
    
    # FCM Legacy Payload Format
    legacy_payload = {
        "to": device_token,
        "notification": {
            "title": title,
            "body": message,
            "sound": "default"
        },
        "data": data or {}
    }

    # --- Mode 1: FCM V1 API (OAuth2) ---
    if fcm_service_account:
        try:
            logger.info("Attempting real push notification dispatch via FCM V1 API...")
            from google.oauth2 import service_account
            import google.auth.transport.requests
            
            SCOPES = ['https://www.googleapis.com/auth/firebase.messaging']
            
            # Load credentials dynamically
            if fcm_service_account.strip().startswith('{'):
                info = json.loads(fcm_service_account)
                credentials = service_account.Credentials.from_service_account_info(info, scopes=SCOPES)
            else:
                credentials = service_account.Credentials.from_service_account_file(fcm_service_account, scopes=SCOPES)
                
            # Request/Refresh token
            auth_request = google.auth.transport.requests.Request()
            credentials.refresh(auth_request)
            access_token = credentials.token
            project_id = credentials.project_id
            
            url = f"https://fcm.googleapis.com/v1/projects/{project_id}/messages:send"
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            
            response = requests.post(url, json=v1_payload, headers=headers, timeout=5)
            response_json = response.json()
            
            if response.status_code == 200:
                logger.info(f"FCM V1 notification successfully sent: {response_json}")
                return PushTriggerResult(
                    status="success",
                    service="FCM V1 API",
                    recipient_token=device_token,
                    response_details=json.dumps(response_json)
                )
            else:
                logger.error(f"FCM V1 notification failed with status {response.status_code}: {response.text}")
                return PushTriggerResult(
                    status="failed",
                    service="FCM V1 API",
                    recipient_token=device_token,
                    response_details=response.text
                )
        except Exception as e:
            logger.error(f"Error while dispatching FCM V1 notification: {e}")
            return PushTriggerResult(
                status="failed_error",
                service="FCM V1 API",
                recipient_token=device_token,
                response_details=str(e)
            )

    # --- Mode 2: FCM Legacy API (Server Key) ---
    elif fcm_server_key:
        try:
            logger.info("Attempting real push notification dispatch via FCM Legacy API...")
            url = "https://fcm.googleapis.com/fcm/send"
            headers = {
                "Authorization": f"key={fcm_server_key}",
                "Content-Type": "application/json"
            }
            response = requests.post(url, json=legacy_payload, headers=headers, timeout=5)
            response_json = response.json()
            
            if response.status_code == 200:
                logger.info(f"FCM Legacy notification successfully sent: {response_json}")
                return PushTriggerResult(
                    status="success",
                    service="FCM Legacy API",
                    recipient_token=device_token,
                    response_details=json.dumps(response_json)
                )
            else:
                logger.error(f"FCM Legacy notification failed with status {response.status_code}: {response.text}")
                return PushTriggerResult(
                    status="failed",
                    service="FCM Legacy API",
                    recipient_token=device_token,
                    response_details=response.text
                )
        except Exception as e:
            logger.error(f"Error while dispatching FCM Legacy notification: {e}")
            return PushTriggerResult(
                status="failed_error",
                service="FCM Legacy API",
                recipient_token=device_token,
                response_details=str(e)
            )

    # --- Mode 3: Mock Simulation ---
    logger.info("==================================================")
    logger.info("📢 SIMULATED FCM PUSH NOTIFICATION DISPATCH")
    logger.info(f"📱 Recipient Token: {device_token}")
    logger.info(f"🔔 Title:           {title}")
    logger.info(f"💬 Message:         {message}")
    logger.info("--------------------------------------------------")
    logger.info("🔥 FCM V1 HTTP API PAYLOAD FORMAT:")
    logger.info(json.dumps(v1_payload, indent=2))
    logger.info("--------------------------------------------------")
    logger.info("🔥 FCM LEGACY API PAYLOAD FORMAT:")
    logger.info(json.dumps(legacy_payload, indent=2))
    logger.info("==================================================")
    
    return PushTriggerResult(
        status="success (simulated)",
        service="FCM Mock Dispatcher",
        recipient_token=device_token,
        response_details=f"Generated and logged payloads for both FCM V1 and Legacy. Recipient: {device_token}"
    )


# ==========================================
# BOOKINGS ENDPOINTS
# ==========================================

@bookings_router.get("", response_model=BookingListResponse)
def list_bookings(
    user_id: Optional[int] = Query(None, description="Filter bookings by User ID"),
    provider_id: Optional[int] = Query(None, description="Filter bookings by Provider ID"),
    page: int = Query(1, ge=1, description="Page number for pagination"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db)
):
    """
    Get a list of bookings with optional filtering by User ID and/or Provider ID,
    complete with pagination support.
    """
    query = db.query(Booking)
    
    if user_id is not None:
        query = query.filter(Booking.user_id == user_id)
        
    if provider_id is not None:
        query = query.filter(Booking.provider_id == provider_id)
        
    # Calculate totals
    total_count = query.count()
    total_pages = (total_count + limit - 1) // limit if total_count > 0 else 1
    
    # Apply offset and limit
    offset = (page - 1) * limit
    bookings = query.order_by(Booking.id.desc()).offset(offset).limit(limit).all()
    
    return {
        "bookings": bookings,
        "total_count": total_count,
        "page": page,
        "limit": limit,
        "total_pages": total_pages
    }


# ==========================================
# NOTIFICATIONS ENDPOINTS
# ==========================================

@notifications_router.post("/send", response_model=dict)
def send_notification(request: NotificationSendRequest, db: Session = Depends(get_db)):
    """
    Manually send a notification to a user and/or provider.
    This saves a notification record in the database and also triggers a real/mock push notification.
    """
    # Validate recipient existence
    recipient_token = None
    recipient_name = ""
    
    if request.user_id:
        user = db.query(User).filter(User.id == request.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail=f"User with ID {request.user_id} not found")
        recipient_token = user.device_token
        recipient_name = user.name
        
    if request.provider_id:
        provider = db.query(Provider).filter(Provider.id == request.provider_id).first()
        if not provider:
            raise HTTPException(status_code=404, detail=f"Provider with ID {request.provider_id} not found")
        if not recipient_token:  # Prefer user's token if both are set, or combine
            recipient_token = provider.device_token
            recipient_name = provider.name
            
    if request.booking_id:
        booking = db.query(Booking).filter(Booking.id == request.booking_id).first()
        if not booking:
            raise HTTPException(status_code=404, detail=f"Booking with ID {request.booking_id} not found")

    # Save to database
    db_notification = Notification(
        title=request.title,
        message=request.message,
        type=request.type,
        is_read=False,
        created_at=datetime.datetime.utcnow().isoformat(),
        user_id=request.user_id,
        provider_id=request.provider_id,
        booking_id=request.booking_id
    )
    
    db.add(db_notification)
    db.commit()
    db.refresh(db_notification)
    
    # Prepare payload for push notification
    push_data = {
        "notification_id": db_notification.id,
        "type": request.type,
        "booking_id": request.booking_id
    }
    
    # Trigger push notification
    push_result = {"status": "skipped", "reason": "No registered token found for the recipient."}
    if recipient_token:
        push_dispatch = trigger_push_notification(
            device_token=recipient_token,
            title=request.title,
            message=request.message,
            data=push_data
        )
        push_result = {
            "status": push_dispatch.status,
            "service": push_dispatch.service,
            "recipient_name": recipient_name,
            "recipient_token": push_dispatch.recipient_token,
            "response_details": push_dispatch.response_details
        }
    else:
        logger.warning(f"No token registered for recipient {recipient_name}. Skipping push dispatch.")
        
    return {
        "message": "Notification processed successfully",
        "notification": {
            "id": db_notification.id,
            "title": db_notification.title,
            "message": db_notification.message,
            "type": db_notification.type,
            "is_read": db_notification.is_read,
            "created_at": db_notification.created_at,
            "user_id": db_notification.user_id,
            "provider_id": db_notification.provider_id,
            "booking_id": db_notification.booking_id
        },
        "push_trigger": push_result
    }

@notifications_router.get("", response_model=NotificationListResponse)
def list_notifications(
    user_id: Optional[int] = Query(None, description="Filter notifications by recipient User ID"),
    provider_id: Optional[int] = Query(None, description="Filter notifications by recipient Provider ID"),
    page: int = Query(1, ge=1, description="Page number for pagination"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db)
):
    """
    Get all notifications with optional filtering by recipient User ID or Provider ID,
    complete with pagination support.
    """
    query = db.query(Notification)
    
    if user_id is not None:
        query = query.filter(Notification.user_id == user_id)
        
    if provider_id is not None:
        query = query.filter(Notification.provider_id == provider_id)
        
    # Calculate totals
    total_count = query.count()
    total_pages = (total_count + limit - 1) // limit if total_count > 0 else 1
    
    # Apply offset and limit
    offset = (page - 1) * limit
    notifications = query.order_by(Notification.id.desc()).offset(offset).limit(limit).all()
    
    return {
        "notifications": notifications,
        "total_count": total_count,
        "page": page,
        "limit": limit,
        "total_pages": total_pages
    }

@notifications_router.post("/register_token", response_model=dict)
def register_device_token(request: TokenRegisterRequest, db: Session = Depends(get_db)):
    """
    Registers a device's push notification token for a user or provider.
    This allows push notifications to be correctly delivered to their respective devices.
    """
    if not request.user_id and not request.provider_id:
        raise HTTPException(
            status_code=400,
            detail="Must specify either user_id or provider_id to register a token."
        )
        
    entity_name = ""
    if request.user_id:
        user = db.query(User).filter(User.id == request.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail=f"User with ID {request.user_id} not found")
        user.device_token = request.device_token
        entity_name = f"User '{user.name}'"
        
    if request.provider_id:
        provider = db.query(Provider).filter(Provider.id == request.provider_id).first()
        if not provider:
            raise HTTPException(status_code=404, detail=f"Provider with ID {request.provider_id} not found")
        provider.device_token = request.device_token
        if not entity_name:
            entity_name = f"Provider '{provider.name}'"
        else:
            entity_name += f" and Provider '{provider.name}'"
            
    db.commit()
    return {
        "message": f"Successfully registered device token for {entity_name}",
        "device_token": request.device_token
    }

@notifications_router.post("/{notification_id}/mark_read", response_model=dict)
def mark_notification_as_read(notification_id: int, db: Session = Depends(get_db)):
    """
    Marks a specific notification as read.
    """
    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notification:
        raise HTTPException(status_code=404, detail=f"Notification with ID {notification_id} not found")
        
    notification.is_read = True
    db.commit()
    
    return {
        "message": f"Notification {notification_id} marked as read",
        "notification_id": notification_id,
        "is_read": True
    }
