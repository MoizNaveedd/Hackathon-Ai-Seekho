import json
import logging
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
from models import Provider

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test_providers")

client = TestClient(app)

def run_tests():
    db = SessionLocal()
    
    # Check if we have providers seeded
    provider = db.query(Provider).first()
    if not provider:
        logger.error("❌ Test database lacks providers. Please seed the database first.")
        db.close()
        return

    logger.info(f"Using Test Provider for detail checks: ID={provider.id}, Name='{provider.name}'")
    
    # Store provider parameters safely
    provider_id = provider.id
    provider_name = provider.name
    provider_service = provider.service_type
    provider_location = provider.location
    provider_rating = provider.rating
    
    db.close()

    # ==========================================
    # TEST 1: GET /providers (Basic List & Pagination)
    # ==========================================
    logger.info("\n--- TEST 1: Get Providers List (Basic) ---")
    response = client.get("/providers?page=1&limit=5")
    assert response.status_code == 200, f"Failed: {response.text}"
    res_data = response.json()
    logger.info(f"Total Providers: {res_data['total_count']}")
    logger.info(f"Providers on current page (limit=5): {len(res_data['providers'])}")
    assert "providers" in res_data
    assert "total_count" in res_data
    assert len(res_data["providers"]) <= 5
    
    # Check that keys are parsed correctly
    p_item = res_data["providers"][0]
    assert "id" in p_item
    assert "name" in p_item
    assert "service_type" in p_item
    assert "available_slots" in p_item
    assert "available_dates" in p_item
    assert isinstance(p_item["available_slots"], dict)
    assert isinstance(p_item["available_dates"], list)
    logger.info("✅ TEST 1 PASSED: Basic list and pagination attributes are perfect!")

    # ==========================================
    # TEST 2: GET /providers (Filter by Service Type)
    # ==========================================
    logger.info("\n--- TEST 2: Filter by Service Type ---")
    # Exact and partial case-insensitive filtering
    service_query = provider_service[:6].lower()  # e.g., "techni" or "plumbe"
    response = client.get(f"/providers?service_type={service_query}")
    assert response.status_code == 200, f"Failed: {response.text}"
    res_data = response.json()
    logger.info(f"Providers found for service '{service_query}': {res_data['total_count']}")
    for p in res_data["providers"]:
        assert service_query in p["service_type"].lower(), f"Unexpected service type: {p['service_type']}"
    logger.info("✅ TEST 2 PASSED: Filtering by service_type is accurate and case-insensitive!")

    # ==========================================
    # TEST 3: GET /providers (Filter by Location)
    # ==========================================
    logger.info("\n--- TEST 3: Filter by Location ---")
    location_query = provider_location.lower()
    response = client.get(f"/providers?location={location_query}")
    assert response.status_code == 200, f"Failed: {response.text}"
    res_data = response.json()
    logger.info(f"Providers found for location '{location_query}': {res_data['total_count']}")
    for p in res_data["providers"]:
        assert location_query in p["location"].lower(), f"Unexpected location: {p['location']}"
    logger.info("✅ TEST 3 PASSED: Filtering by location is accurate and case-insensitive!")

    # ==========================================
    # TEST 4: GET /providers (Filter by Min Rating)
    # ==========================================
    logger.info("\n--- TEST 4: Filter by Minimum Rating ---")
    min_rating = 4.5
    response = client.get(f"/providers?min_rating={min_rating}")
    assert response.status_code == 200, f"Failed: {response.text}"
    res_data = response.json()
    logger.info(f"Providers with rating >= {min_rating}: {res_data['total_count']}")
    for p in res_data["providers"]:
        assert p["rating"] >= min_rating, f"Provider rating {p['rating']} is less than {min_rating}"
    logger.info("✅ TEST 4 PASSED: Filtering by minimum rating is highly precise!")

    # ==========================================
    # TEST 5: GET /providers (Geolocation Distance Sort & Filter)
    # ==========================================
    logger.info("\n--- TEST 5: Geolocation Distance Sort & Filter ---")
    # Coordinates of G-13
    user_lat, user_lon = 33.6331, 72.9691
    max_dist = 5.0
    
    # 5a. Test sorting by distance
    response = client.get(f"/providers?latitude={user_lat}&longitude={user_lon}&sort_by=distance&limit=100")
    assert response.status_code == 200, f"Failed: {response.text}"
    res_data = response.json()
    logger.info(f"Retrieved {len(res_data['providers'])} providers sorted by distance")
    
    distances = [p["distance_km"] for p in res_data["providers"] if p["distance_km"] is not None]
    # Ensure they are sorted ascending
    assert distances == sorted(distances), "Distances are not properly sorted in ascending order"
    logger.info(f"Closest provider: '{res_data['providers'][0]['name']}' at {res_data['providers'][0]['distance_km']} km")
    
    # 5b. Test filtering by max distance
    response = client.get(f"/providers?latitude={user_lat}&longitude={user_lon}&max_distance_km={max_dist}")
    assert response.status_code == 200, f"Failed: {response.text}"
    res_data = response.json()
    logger.info(f"Providers within {max_dist} km of user: {res_data['total_count']}")
    for p in res_data["providers"]:
        assert p["distance_km"] is not None and p["distance_km"] <= max_dist, f"Provider at {p['distance_km']} km exceeded limit of {max_dist} km"
        
    logger.info("✅ TEST 5 PASSED: Geolocation distance calculations, sorting, and max radius filtering work perfectly!")

    # ==========================================
    # TEST 6: GET /providers (Filter by Booking Date Availability)
    # ==========================================
    logger.info("\n--- TEST 6: Filter by Specific Booking Date ---")
    test_date = datetime.now().strftime("%Y-%m-%d")
    
    response = client.get(f"/providers?booking_date={test_date}&limit=10")
    assert response.status_code == 200, f"Failed: {response.text}"
    res_data = response.json()
    logger.info(f"Providers available on date '{test_date}': {res_data['total_count']}")
    for p in res_data["providers"]:
        # Ensure the date requested actually exists and has slots
        assert test_date in p["available_slots"]
        assert len(p["available_slots"][test_date]) > 0
        # Check that we only return the slots for the requested date
        assert list(p["available_slots"].keys()) == [test_date]
        
    logger.info("✅ TEST 6 PASSED: Filtering by booking date and formatting response slots is working!")

    # ==========================================
    # TEST 7: GET /providers/services (Service Categories Summary)
    # ==========================================
    logger.info("\n--- TEST 7: Get Service Type Summaries ---")
    response = client.get("/providers/services")
    assert response.status_code == 200, f"Failed: {response.text}"
    res_data = response.json()
    logger.info(f"Found {len(res_data)} active service categories:")
    for service in res_data:
        logger.info(f" - {service['service_type']}: {service['provider_count']} provider(s)")
        assert "service_type" in service
        assert "provider_count" in service
        assert service["provider_count"] > 0
        
    logger.info("✅ TEST 7 PASSED: Service summary metrics retrieved successfully!")

    # ==========================================
    # TEST 8: GET /providers/{id} (Single Provider Details)
    # ==========================================
    logger.info("\n--- TEST 8: Get Provider Details By ID ---")
    # Get details with coordinates
    user_lat, user_lon = 33.6331, 72.9691
    response = client.get(f"/providers/{provider_id}?latitude={user_lat}&longitude={user_lon}")
    assert response.status_code == 200, f"Failed: {response.text}"
    res_data = response.json()
    
    assert res_data["id"] == provider_id
    assert res_data["name"] == provider_name
    assert res_data["distance_km"] is not None
    assert isinstance(res_data["available_slots"], dict)
    assert isinstance(res_data["available_dates"], list)
    logger.info(f"Provider details retrieved: Name='{res_data['name']}', Distance={res_data['distance_km']} km")
    
    # Non-existent provider check
    invalid_id = 99999
    response = client.get(f"/providers/{invalid_id}")
    assert response.status_code == 404
    logger.info("✅ TEST 8 PASSED: Single provider retrieval and invalid ID handling are fully operational!")

    # ==========================================
    # TEST 9: POST /providers (Provider Registration)
    # ==========================================
    logger.info("\n--- TEST 9: Register a New Provider ---")
    new_provider_payload = {
        "name": "Super Fast Plumber",
        "service_type": "Plumber",
        "location": "G-11",
        "rating": 4.9,
        "latitude": 33.6650,
        "longitude": 72.9900,
        "available_slots": {
            "2026-05-20": ["09:00 AM", "11:00 AM", "03:00 PM"]
        }
    }
    
    response = client.post("/providers", json=new_provider_payload)
    assert response.status_code == 201, f"Failed: {response.text}"
    res_data = response.json()
    logger.info(f"Successfully registered: Name='{res_data['name']}', Assigned ID={res_data['id']}")
    
    assert res_data["name"] == new_provider_payload["name"]
    assert res_data["service_type"] == new_provider_payload["service_type"]
    assert res_data["location"] == new_provider_payload["location"]
    assert res_data["rating"] == new_provider_payload["rating"]
    assert res_data["latitude"] == new_provider_payload["latitude"]
    assert res_data["longitude"] == new_provider_payload["longitude"]
    assert res_data["available_slots"] == new_provider_payload["available_slots"]
    assert "2026-05-20" in res_data["available_dates"]
    
    created_id = res_data["id"]
    logger.info("✅ TEST 9 PASSED: Provider registration works seamlessly with full attributes!")

    # ==========================================
    # TEST 10: PUT /providers/{id}/slots (Update Available Slots)
    # ==========================================
    logger.info("\n--- TEST 10: Update Provider Available Slots ---")
    updated_slots = {
        "2026-05-20": ["10:00 AM", "04:00 PM"],
        "2026-05-21": ["09:00 AM", "01:00 PM"]
    }
    
    response = client.put(f"/providers/{created_id}/slots", json={"available_slots": updated_slots})
    assert response.status_code == 200, f"Failed: {response.text}"
    res_data = response.json()
    
    assert res_data["id"] == created_id
    assert res_data["available_slots"] == updated_slots
    assert "2026-05-20" in res_data["available_dates"]
    assert "2026-05-21" in res_data["available_dates"]
    assert len(res_data["available_dates"]) == 2
    logger.info(f"Successfully updated slots for provider ID={created_id}. Available dates: {res_data['available_dates']}")
    
    # Try updating slot for non-existent provider
    response = client.put("/providers/99999/slots", json={"available_slots": updated_slots})
    assert response.status_code == 404

    # Clean up test provider from DB to avoid database clutter
    db = SessionLocal()
    test_p = db.query(Provider).filter(Provider.id == created_id).first()
    if test_p:
        db.delete(test_p)
        db.commit()
        logger.info(f"Cleaned up test provider ID={created_id} from database successfully.")
    db.close()
    
    logger.info("✅ TEST 10 PASSED: Provider slot updates and cleanups are complete!")
    
    logger.info("\n🎉 ALL PROVIDER ENDPOINT TESTS COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
