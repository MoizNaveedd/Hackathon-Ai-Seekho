"""Agent 2 - Provider Discovery: finds candidate providers for the requested service."""

import json
from datetime import datetime
from sqlalchemy.orm import Session
from models import Provider, User
from .common import haversine, AgentExecutionLog


class ProviderDiscoveryAgent:
    """Finds nearest active providers with available slots for the requested date."""

    def __init__(self):
        self.name = "Provider Discovery Agent"

    def process(self, intent_data: dict, user: User, db: Session, logger: AgentExecutionLog, exclude_ids: list = None):
        service = intent_data.get("service_type")
        booking_date = intent_data.get("booking_date")
        exclude_ids = exclude_ids or []

        # Get user coordinates from state (passed via chat API) or user profile
        user_lat = intent_data.get("latitude")
        user_lon = intent_data.get("longitude")
        if not user_lat or not user_lon:
            if user and user.latitude and user.longitude:
                user_lat, user_lon = user.latitude, user.longitude

        query = db.query(Provider).filter(
            Provider.service_type.ilike(f"%{service}%"),
        )
        if exclude_ids:
            query = query.filter(~Provider.id.in_(exclude_ids))

        providers = query.all()

        logger.add_log(self.name, "DB Query", f"Found {len(providers)} providers for '{service}' (excluded {len(exclude_ids)}).")

        if not providers:
            return {"recommended_providers": [], "message": "No available providers found."}

        provider_list = []
        for p in providers:
            try:
                slots_data = json.loads(p.available_slots) if p.available_slots else {}
            except (json.JSONDecodeError, TypeError):
                slots_data = {}

            if isinstance(slots_data, list):
                today_str = datetime.now().strftime("%Y-%m-%d")
                slots_data = {today_str: slots_data} if slots_data else {}

            if not slots_data:
                continue

            if booking_date:
                date_slots = slots_data.get(booking_date, [])
                if not date_slots:
                    continue
            else:
                date_slots = slots_data

            distance_km = None
            if user_lat and user_lon and p.latitude and p.longitude:
                distance_km = haversine(user_lat, user_lon, p.latitude, p.longitude)

            provider_entry = {
                "id": p.id,
                "name": p.name,
                "location": p.location,
                "rating": p.rating,
                "hourly_rate": p.hourly_rate or 500,
                "distance_km": distance_km,
            }

            if booking_date:
                provider_entry["available_slots"] = date_slots
                provider_entry["booking_date"] = booking_date
            else:
                provider_entry["available_slots_by_date"] = slots_data

            provider_list.append(provider_entry)

        # Rank by a weighted rating + distance score. Some providers may have no
        # coordinates (distance_km is None) — they must NOT crash the sort, so they
        # score on rating alone and rank after providers that do have a distance.
        distances = [p["distance_km"] for p in provider_list if p["distance_km"] is not None]
        if distances:
            max_distance = max(distances) or 1

            def _score(p):
                rating_part = (p["rating"] or 0) / 5.0 * 0.4
                if p["distance_km"] is None:
                    # No distance: rating-only, and pushed below those with a distance.
                    return -rating_part
                return -(rating_part + (1 - p["distance_km"] / max_distance) * 0.6)

            provider_list.sort(key=_score)
        else:
            provider_list.sort(key=lambda p: -(p["rating"] or 0))

        top_providers = provider_list[:3]

        logger.add_log(self.name, "Provider Ranking", {
            "total_found": len(provider_list),
            "top_3": [p["name"] for p in top_providers]
        })

        return {"recommended_providers": top_providers, "message": None}
