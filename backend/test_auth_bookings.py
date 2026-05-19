import io
import sys
import os
import json
import logging
from datetime import datetime

# Setup path and import test client
sys.path.insert(0, os.path.dirname(__file__))
from fastapi.testclient import TestClient
from main import app
from auth_bookings_api import decode_jwt

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(message)s")
log = logging.getLogger("test_auth_bookings")

client = TestClient(app)

def section(title):
    log.info(f"\n{'='*60}")
    log.info(f"  {title}")
    log.info(f"{'='*60}")

def check(label, condition, detail=""):
    status = "PASS" if condition else "FAIL"
    msg = f"  [{status}] {label}"
    if detail:
        msg += f" -- {detail}"
    log.info(msg)
    assert condition, f"Failed: {label}"

def run_tests():
    # Clean up existing test data if any to ensure idempotency
    try:
        from database import SessionLocal
        from models import Provider
        db = SessionLocal()
        p = db.query(Provider).filter(Provider.name == "Alex Khan").first()
        if p:
            db.delete(p)
            db.commit()
        db.close()
        log.info("Cleaned up existing test provider records.")
    except Exception as e:
        log.warning(f"Test cleanup skipped/failed: {e}")

    section("TEST 1: Provider Registration (POST /api/auth/register)")
    
    # Simulate avatar image upload
    avatar_data = b"fake image content"
    avatar_file = ("avatar.jpg", io.BytesIO(avatar_data), "image/jpeg")
    
    register_payload = {
        "name": "Alex Khan",
        "phone": "+92 300 1234567",
        "email": "alex@provider.com",
        "password": "securepass123",
        "service_type": "Electrical"
    }
    
    response = client.post(
        "/api/auth/register",
        data=register_payload,
        files={"avatar": avatar_file}
    )
    
    check("Register Status 201", response.status_code == 201)
    res_data = response.json()
    check("Register success is True", res_data.get("success") is True)
    check("Register returns message", bool(res_data.get("message")))
    check("Register has token", "token" in res_data.get("data", {}))
    
    user_info = res_data.get("data", {}).get("user", {})
    check("User name matches", user_info.get("name") == "Alex Khan")
    check("User email matches", user_info.get("email") == "alex@provider.com")
    check("User phone matches", user_info.get("phone") == "+92 300 1234567")
    check("User role is service_provider", user_info.get("role") == "service_provider")
    check("User service_type is Electrical", user_info.get("service_type") == "Electrical")
    check("User avatar returned", "avatar" in user_info)
    
    log.info("Registration Response Data:")
    log.info(json.dumps(res_data, indent=2))
    
    # Decode token to verify contents
    token = res_data["data"]["token"]
    decoded = decode_jwt(token)
    check("Decoded email matches", decoded.get("email") == "alex@provider.com")
    check("Decoded role matches", decoded.get("role") == "service_provider")
    provider_id = user_info.get("id")


    section("TEST 2: Provider Login (POST /api/auth/login)")
    
    login_payload = {
        "email": "alex@provider.com",
        "password": "securepass123"
    }
    
    response = client.post("/api/auth/login", json=login_payload)
    check("Login Status 200", response.status_code == 200)
    login_data = response.json()
    check("Login success is True", login_data.get("success") is True)
    check("Login has token", "token" in login_data.get("data", {}))
    
    user_info = login_data.get("data", {}).get("user", {})
    check("Login user name matches", user_info.get("name") == "Alex Khan")
    check("Login user role is service_provider", user_info.get("role") == "service_provider")


    section("TEST 3: Get Profile Details (GET /api/auth/me)")
    
    # Query parameter test
    response = client.get(f"/api/auth/me?id={provider_id}")
    check("GET Profile with ID Param Status 200", response.status_code == 200)
    profile_data = response.json()
    check("Profile success is True", profile_data.get("success") is True)
    check("Profile name matches", profile_data.get("data", {}).get("name") == "Alex Khan")
    
    # Path parameter test
    response = client.get(f"/api/auth/me/{provider_id}")
    check("GET Profile with Path Param Status 200", response.status_code == 200)
    profile_data_path = response.json()
    check("Path Profile success is True", profile_data_path.get("success") is True)
    check("Path Profile name matches", profile_data_path.get("data", {}).get("name") == "Alex Khan")
    
    # Authorization Header test
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/auth/me", headers=headers)
    check("GET Profile with Authorization Token Status 200", response.status_code == 200)
    profile_data_token = response.json()
    check("Token Profile success is True", profile_data_token.get("success") is True)
    check("Token Profile name matches", profile_data_token.get("data", {}).get("name") == "Alex Khan")

    log.info("\n" + "*"*60)
    log.info("  ALL AUTHENTICATION & PROFILE API TESTS PASSED SUCCESSFULLY!")
    log.info("*"*60)

if __name__ == "__main__":
    run_tests()
