import json
import math
import logging
from datetime import datetime
from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session
from database import get_db
from models import Provider

# Configure logging
logger = logging.getLogger("providers")
logger.setLevel(logging.INFO)

# Create router
providers_router = APIRouter(prefix="/providers", tags=["Providers"])


# ==========================================
# PYDANTIC SCHEMAS
# ==========================================

class ProviderDetailResponse(BaseModel):
    id: int
    name: str
    service_type: str
    location: str
    rating: float
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    distance_km: Optional[float] = None
    available_slots: Dict[str, List[str]] = Field(default_factory=dict)
    available_dates: List[str] = Field(default_factory=list)

    class Config:
        from_attributes = True


class ProviderListResponse(BaseModel):
    providers: List[ProviderDetailResponse]
    total_count: int
    page: int
    limit: int
    total_pages: int


class ServiceTypeSummary(BaseModel):
    service_type: str
    provider_count: int


class ProviderCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, description="Name of the service provider")
    service_type: str = Field(..., min_length=1, description="Type of service (e.g. Plumber, Electrician)")
    location: str = Field(..., min_length=1, description="General neighborhood or region (e.g. G-13)")
    rating: float = Field(5.0, ge=0.0, le=5.0, description="Initial rating (out of 5.0)")
    latitude: Optional[float] = Field(None, description="GPS Latitude coordinate")
    longitude: Optional[float] = Field(None, description="GPS Longitude coordinate")
    available_slots: Optional[Dict[str, List[str]]] = Field(
        None, 
        description='Initial available slots dictionary, e.g. {"2026-05-19": ["10:00 AM", "02:00 PM"]}'
    )


class SlotsUpdateRequest(BaseModel):
    available_slots: Dict[str, List[str]] = Field(
        ..., 
        description='Updated available slots dictionary, e.g. {"2026-05-19": ["10:00 AM", "02:00 PM"]}'
    )


# ==========================================
# GEOLOCATION HELPER
# ==========================================

def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees) in kilometers.
    """
    R = 6371.0  # Earth's radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 + 
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * 
         math.sin(dlon / 2) ** 2)
    c = 2 * math.asin(math.sqrt(a))
    return round(R * c, 2)


# ==========================================
# CORE LISTING ENDPOINT
# ==========================================

@providers_router.get("", response_model=ProviderListResponse)
def list_providers(
    service_type: Optional[str] = Query(None, description="Filter by service type (partial, case-insensitive)"),
    location: Optional[str] = Query(None, description="Filter by location/area (partial, case-insensitive)"),
    min_rating: Optional[float] = Query(0.0, ge=0.0, le=5.0, description="Filter by minimum provider rating"),
    latitude: Optional[float] = Query(None, description="User current latitude for distance sorting/filtering"),
    longitude: Optional[float] = Query(None, description="User current longitude for distance sorting/filtering"),
    max_distance_km: Optional[float] = Query(None, ge=0.0, description="Filter providers within this distance (km)"),
    booking_date: Optional[str] = Query(None, description="Filter to providers available on this date (YYYY-MM-DD)"),
    sort_by: str = Query("rating", description="Sort by field: 'rating' (descending), 'distance' (ascending), 'name' (ascending)"),
    page: int = Query(1, ge=1, description="Page number for pagination"),
    limit: int = Query(10, ge=1, le=100, description="Number of items per page"),
    db: Session = Depends(get_db)
):
    """
    List, search, filter, and sort home service providers with pagination.
    Supports geolocation (distance calculation and sorting) and availability filters.
    """
    if sort_by == "distance" and (latitude is None or longitude is None):
        raise HTTPException(
            status_code=400,
            detail="User coordinates (latitude and longitude) are required to sort by distance."
        )

    if max_distance_km is not None and (latitude is None or longitude is None):
        raise HTTPException(
            status_code=400,
            detail="User coordinates (latitude and longitude) are required to filter by max_distance_km."
        )

    # Base query for all providers
    query = db.query(Provider)

    # Apply standard database filters
    if service_type:
        query = query.filter(Provider.service_type.ilike(f"%{service_type}%"))
    if location:
        query = query.filter(Provider.location.ilike(f"%{location}%"))
    if min_rating > 0.0:
        query = query.filter(Provider.rating >= min_rating)

    # Fetch all candidates first (needed for complex dynamic filters like distance and slot calculations)
    candidates = query.all()
    filtered_providers = []

    for p in candidates:
        # Load and parse available slots JSON
        try:
            slots_data = json.loads(p.available_slots) if p.available_slots else {}
        except (json.JSONDecodeError, TypeError):
            slots_data = {}

        # Handle legacy format where slots were stored as a flat list
        if isinstance(slots_data, list):
            today_str = datetime.now().strftime("%Y-%m-%d")
            slots_data = {today_str: slots_data} if slots_data else {}

        # Extract list of available dates (dates with > 0 slots)
        available_dates = sorted([
            date_str for date_str, slots in slots_data.items() 
            if isinstance(slots, list) and len(slots) > 0
        ])

        # Filter by booking date if requested
        if booking_date:
            date_slots = slots_data.get(booking_date, [])
            if not date_slots:
                # Skip provider if they have no slots for this specific date
                continue
            # Keep only the slots for the requested date in the response for cleaner UX
            slots_data = {booking_date: date_slots}

        # Calculate distance if coords are provided
        distance_km = None
        if latitude is not None and longitude is not None and p.latitude is not None and p.longitude is not None:
            distance_km = haversine(latitude, longitude, p.latitude, p.longitude)

        # Filter by distance if max_distance_km is specified
        if max_distance_km is not None and distance_km is not None and distance_km > max_distance_km:
            continue

        # Map to dictionary including calculated attributes
        p_dict = {
            "id": p.id,
            "name": p.name,
            "service_type": p.service_type,
            "location": p.location,
            "rating": p.rating,
            "latitude": p.latitude,
            "longitude": p.longitude,
            "distance_km": distance_km,
            "available_slots": slots_data,
            "available_dates": available_dates
        }
        filtered_providers.append(p_dict)

    # Apply sorting logic
    if sort_by == "distance" and latitude is not None and longitude is not None:
        # Sort by distance (closest first), fallback to rating if distance is None
        filtered_providers.sort(
            key=lambda item: (item["distance_km"] is None, item["distance_km"], -item["rating"])
        )
    elif sort_by == "name":
        # Alphabetical sort
        filtered_providers.sort(key=lambda item: item["name"].lower())
    else:
        # Default: sort by rating (highest first)
        filtered_providers.sort(key=lambda item: -item["rating"])

    # Calculate pagination details
    total_count = len(filtered_providers)
    total_pages = (total_count + limit - 1) // limit if total_count > 0 else 1
    
    # Slice list for current page
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_providers = filtered_providers[start_idx:end_idx]

    return {
        "providers": paginated_providers,
        "total_count": total_count,
        "page": page,
        "limit": limit,
        "total_pages": total_pages
    }


# ==========================================
# SERVICE TYPE SUMMARY ENDPOINT
# ==========================================

@providers_router.get("/services", response_model=List[ServiceTypeSummary])
def get_service_summaries(db: Session = Depends(get_db)):
    """
    Get a list of all unique service types and counts of active providers for each type.
    """
    results = db.query(
        Provider.service_type, 
        func.count(Provider.id).label("provider_count")
    ).group_by(Provider.service_type).all()

    return [
        {"service_type": r[0], "provider_count": r[1]}
        for r in results
    ]


# ==========================================
# SINGLE PROVIDER DETAILS ENDPOINT
# ==========================================

@providers_router.get("/{provider_id}", response_model=ProviderDetailResponse)
def get_provider_details(
    provider_id: int,
    latitude: Optional[float] = Query(None, description="User current latitude to calculate distance"),
    longitude: Optional[float] = Query(None, description="User current longitude to calculate distance"),
    db: Session = Depends(get_db)
):
    """
    Retrieve details of a single provider by ID, with optional distance calculation.
    """
    p = db.query(Provider).filter(Provider.id == provider_id).first()
    if not p:
        raise HTTPException(
            status_code=404, 
            detail=f"Provider with ID {provider_id} not found."
        )

    # Load and parse slots JSON
    try:
        slots_data = json.loads(p.available_slots) if p.available_slots else {}
    except (json.JSONDecodeError, TypeError):
        slots_data = {}

    if isinstance(slots_data, list):
        today_str = datetime.now().strftime("%Y-%m-%d")
        slots_data = {today_str: slots_data} if slots_data else {}

    available_dates = sorted([
        date_str for date_str, slots in slots_data.items() 
        if isinstance(slots, list) and len(slots) > 0
    ])

    distance_km = None
    if latitude is not None and longitude is not None and p.latitude is not None and p.longitude is not None:
        distance_km = haversine(latitude, longitude, p.latitude, p.longitude)

    return {
        "id": p.id,
        "name": p.name,
        "service_type": p.service_type,
        "location": p.location,
        "rating": p.rating,
        "latitude": p.latitude,
        "longitude": p.longitude,
        "distance_km": distance_km,
        "available_slots": slots_data,
        "available_dates": available_dates
    }


# ==========================================
# ADMIN ENDPOINTS: REGISTRATION & SLOTS
# ==========================================

@providers_router.post("", response_model=ProviderDetailResponse, status_code=201)
def create_provider(request: ProviderCreateRequest, db: Session = Depends(get_db)):
    """
    Register a new provider. Administrative or provider registration endpoint.
    """
    # Serialize slots dict to JSON string
    slots_json = "{}"
    if request.available_slots:
        slots_json = json.dumps(request.available_slots)

    p = Provider(
        name=request.name,
        service_type=request.service_type,
        location=request.location,
        rating=request.rating,
        latitude=request.latitude,
        longitude=request.longitude,
        available_slots=slots_json
    )

    db.add(p)
    db.commit()
    db.refresh(p)

    logger.info(f"Registered new provider: '{p.name}' (ID={p.id})")

    # Map back for response
    available_dates = sorted([
        d for d, s in (request.available_slots or {}).items() if len(s) > 0
    ])

    return {
        "id": p.id,
        "name": p.name,
        "service_type": p.service_type,
        "location": p.location,
        "rating": p.rating,
        "latitude": p.latitude,
        "longitude": p.longitude,
        "distance_km": None,
        "available_slots": request.available_slots or {},
        "available_dates": available_dates
    }


@providers_router.put("/{provider_id}/slots", response_model=ProviderDetailResponse)
def update_provider_slots(
    provider_id: int, 
    request: SlotsUpdateRequest, 
    db: Session = Depends(get_db)
):
    """
    Directly update the slots mapping for an existing provider.
    """
    p = db.query(Provider).filter(Provider.id == provider_id).first()
    if not p:
        raise HTTPException(
            status_code=404, 
            detail=f"Provider with ID {provider_id} not found."
        )

    # Update slots
    p.available_slots = json.dumps(request.available_slots)
    db.commit()
    db.refresh(p)

    logger.info(f"Updated available slots for provider ID={p.id}")

    available_dates = sorted([
        d for d, s in request.available_slots.items() if len(s) > 0
    ])

    return {
        "id": p.id,
        "name": p.name,
        "service_type": p.service_type,
        "location": p.location,
        "rating": p.rating,
        "latitude": p.latitude,
        "longitude": p.longitude,
        "distance_km": None,
        "available_slots": request.available_slots,
        "available_dates": available_dates
    }
