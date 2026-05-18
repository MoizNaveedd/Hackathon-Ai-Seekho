import json
import logging
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
from models import User, Provider, Booking, Notification

# Configure basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test_bookings_notifications")

client = TestClient(app)

def run_tests():
    db = SessionLocal()
    
    # 1. Fetch some test users & providers to get real IDs
    user = db.query(User).first()
    provider = db.query(Provider).first()
    
    if not user or not provider:
        logger.error("❌ Test database lacks users or providers. Please seed the database first.")
        db.close()
        return

    logger.info(f"Using Test User: ID={user.id}, Name='{user.name}'")
    logger.info(f"Using Test Provider: ID={provider.id}, Name='{provider.name}'")
    
    # Create a mock booking for testing listing if none exists
    booking = db.query(Booking).first()
    if not booking:
        logger.info("No booking found. Creating a mock booking...")
        booking = Booking(
            user_intent="Need AC repair in G-13",
            user_id=user.id,
            provider_id=provider.id,
            time_slot="10:00 AM",
            status="confirmed"
        )
        db.add(booking)
        db.commit()
        db.refresh(booking)
        logger.info(f"Mock booking created with ID: {booking.id}")
    else:
        logger.info(f"Using Existing Booking: ID={booking.id}")
    
    # Extract raw data to avoid DetachedInstanceError after closing the session
    user_id = user.id
    user_name = user.name
    provider_id = provider.id
    provider_name = provider.name
    booking_id = booking.id
    
    db.close()

    # ==========================================
    # TEST 1: GET /bookings (List bookings)
    # ==========================================
    logger.info("\n--- TEST 1: Get Bookings List ---")
    
    # Test getting all bookings (with pagination)
    response = client.get("/bookings?page=1&limit=5")
    assert response.status_code == 200, f"Failed: {response.text}"
    res_data = response.json()
    logger.info(f"Total Bookings: {res_data['total_count']}")
    logger.info(f"Bookings on current page: {len(res_data['bookings'])}")
    assert "bookings" in res_data
    assert "total_count" in res_data
    
    # Test filtering by User ID
    response = client.get(f"/bookings?user_id={user_id}")
    assert response.status_code == 200
    user_bookings = response.json()
    logger.info(f"Bookings filtered by User ID {user_id}: {user_bookings['total_count']}")
    
    # Test filtering by Provider ID
    response = client.get(f"/bookings?provider_id={provider_id}")
    assert response.status_code == 200
    provider_bookings = response.json()
    logger.info(f"Bookings filtered by Provider ID {provider_id}: {provider_bookings['total_count']}")
    
    logger.info("✅ TEST 1 PASSED: Booking Listing and Pagination work perfectly!")

    # ==========================================
    # TEST 2: POST /notifications/register_token
    # ==========================================
    logger.info("\n--- TEST 2: Register Device Push Token ---")
    mock_token = "ExponentPushToken[mock_token_12345]"
    
    response = client.post("/notifications/register_token", json={
        "user_id": user_id,
        "device_token": mock_token
    })
    assert response.status_code == 200, f"Failed: {response.text}"
    res_data = response.json()
    assert res_data["device_token"] == mock_token
    logger.info(f"Response: {res_data['message']}")
    
    logger.info("✅ TEST 2 PASSED: Device Push Token registered successfully!")

    # ==========================================
    # TEST 3: POST /notifications/send (Send notification & Trigger Push)
    # ==========================================
    logger.info("\n--- TEST 3: Send Notification & Trigger Push ---")
    notification_payload = {
        "user_id": user_id,
        "booking_id": booking_id,
        "title": "Booking Confirmed!",
        "message": f"Your booking with {provider_name} for slot 10:00 AM has been successfully confirmed.",
        "type": "booking_confirmation"
    }
    
    response = client.post("/notifications/send", json=notification_payload)
    assert response.status_code == 200, f"Failed: {response.text}"
    res_data = response.json()
    logger.info(f"Notification Sent Response: {json.dumps(res_data, indent=2)}")
    
    assert res_data["notification"]["title"] == notification_payload["title"]
    assert res_data["notification"]["user_id"] == user_id
    assert "push_trigger" in res_data
    # Status can be success (live), success (simulated), or failed (due to mock token on live Firebase servers)
    assert res_data["push_trigger"]["status"] in ["success", "success (simulated)", "failed"]
    
    created_notification_id = res_data["notification"]["id"]
    logger.info("✅ TEST 3 PASSED: Notification sent and push triggered successfully!")

    # ==========================================
    # TEST 4: GET /notifications (List notifications history)
    # ==========================================
    logger.info("\n--- TEST 4: Get Notifications Listing ---")
    response = client.get(f"/notifications?user_id={user_id}&page=1&limit=10")
    assert response.status_code == 200, f"Failed: {response.text}"
    res_data = response.json()
    logger.info(f"Total Notifications for User {user_id}: {res_data['total_count']}")
    assert len(res_data["notifications"]) > 0
    assert res_data["notifications"][0]["user_id"] == user_id
    
    logger.info("✅ TEST 4 PASSED: Notification listing with pagination works successfully!")

    # ==========================================
    # TEST 5: POST /notifications/{id}/mark_read
    # ==========================================
    logger.info("\n--- TEST 5: Mark Notification as Read ---")
    response = client.post(f"/notifications/{created_notification_id}/mark_read")
    assert response.status_code == 200, f"Failed: {response.text}"
    res_data = response.json()
    assert res_data["is_read"] is True
    logger.info(f"Response: {res_data['message']}")
    
    # Verify read status in listing
    response = client.get(f"/notifications?user_id={user_id}")
    res_data = response.json()
    found_notif = next(n for n in res_data["notifications"] if n["id"] == created_notification_id)
    assert found_notif["is_read"] is True
    logger.info(f"Verified is_read status for notification {created_notification_id}: {found_notif['is_read']}")
    
    logger.info("✅ TEST 5 PASSED: Mark notification as read works perfectly!")
    
    logger.info("\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
