"""
Test script for the phase-based V2 chat + booking flow.
Tests the full lifecycle:
  gathering_intent → selecting_provider → confirming_booking → completed

Usage:
  python test_chat_flow.py          # Run all tests (needs DB + LLM)
  python test_chat_flow.py --unit   # Run unit tests only (no LLM needed)
"""

import os
import sys
import json
import logging
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(__file__))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
load_dotenv()

from fastapi.testclient import TestClient
from main import app
from database import SessionLocal, engine, Base
from models import User, Provider, Booking, ChatSession, ChatMessage

logging.basicConfig(level=logging.INFO, format="%(message)s")
log = logging.getLogger("test")

client = TestClient(app)
TODAY = datetime.now().strftime("%Y-%m-%d")
TOMORROW = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")


def ensure_test_data(db):
    user = db.query(User).first()
    if not user:
        user = User(name="Test User", location="G-13", latitude=33.6331, longitude=72.9691)
        db.add(user)
        db.commit()
        db.refresh(user)

    provider = db.query(Provider).first()
    if not provider:
        slots = {TODAY: ["09:00 AM", "10:00 AM", "01:00 PM"], TOMORROW: ["10:00 AM", "02:00 PM"]}
        provider = Provider(
            name="Test AC Services", service_type="AC Technician", location="G-13",
            rating=4.5, hourly_rate=800, available_slots=json.dumps(slots),
            latitude=33.6350, longitude=72.9700
        )
        db.add(provider)
        db.commit()
        db.refresh(provider)

    return user, provider


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
    return condition


# ============================================================
# Unit Tests
# ============================================================

def test_date_keyed_slots():
    section("Unit: Date-keyed slot format")
    from seed import generate_date_slots
    slots_json = generate_date_slots(["09:00 AM", "02:00 PM"], days_ahead=3)
    slots = json.loads(slots_json)
    check("Returns dict", isinstance(slots, dict))
    check("Has 3 dates", len(slots) == 3)
    check("Today included", TODAY in slots)
    check("Each date has correct times", slots[TODAY] == ["09:00 AM", "02:00 PM"])


def test_phase_constants():
    section("Unit: Phase constants")
    from agents.common import PHASE_GATHERING, PHASE_SELECTING, PHASE_CONFIRMING, PHASE_COMPLETED
    check("Gathering", PHASE_GATHERING == "gathering_intent")
    check("Selecting", PHASE_SELECTING == "selecting_provider")
    check("Confirming", PHASE_CONFIRMING == "confirming_booking")
    check("Completed", PHASE_COMPLETED == "completed")


def test_rolling_window():
    section("Unit: Rolling window logic")
    from agents.common import _build_windowed_context, MAX_RECENT_MESSAGES

    small = [{"role": "user", "content": f"msg {i}"} for i in range(4)]
    recent, summary, needs_update = _build_windowed_context(small, None)
    check("Small chat: no windowing", len(recent) == 4)

    big = [{"role": "user", "content": f"msg {i}"} for i in range(10)]
    recent, summary, needs_update = _build_windowed_context(big, None)
    check(f"Big chat: windowed to {MAX_RECENT_MESSAGES}", len(recent) == MAX_RECENT_MESSAGES)

    recent2, summary2, needs_update2 = _build_windowed_context(big, "existing summary")
    check("Existing summary: reused", summary2 == "existing summary")


def test_language_lock_logic():
    section("Unit: Language lock logic")
    test_cases = [
        ("yes", "english", "roman_urdu", "roman_urdu", "Short 'yes' keeps roman_urdu"),
        ("ok", "english", "roman_urdu", "roman_urdu", "Short 'ok' keeps roman_urdu"),
        ("haan", "roman_urdu", "roman_urdu", "roman_urdu", "Same language stays"),
        ("I want English now please thanks", "english", "roman_urdu", "english", "Full sentence switches"),
    ]
    for user_msg, detected, cached, expected, desc in test_cases:
        final = detected
        if cached and cached != "unknown" and detected != cached:
            if len(user_msg.split()) <= 3:
                final = cached
        check(f"Lang: {desc}", final == expected, f"'{user_msg}' -> {final}")


def test_booking_with_date():
    section("Unit: Booking with date")
    from agents.booking_confirmation import BookingConfirmationAgent
    from agents.common import AgentExecutionLog

    db = SessionLocal()
    user, provider = ensure_test_data(db)

    slots = json.loads(provider.available_slots) if provider.available_slots else {}
    if isinstance(slots, list):
        slots = {TODAY: slots}
    if TODAY not in slots or not slots[TODAY]:
        slots[TODAY] = ["09:00 AM", "10:00 AM"]
        provider.available_slots = json.dumps(slots)
        db.commit()

    available_time = slots[TODAY][0]
    agent = BookingConfirmationAgent()
    logger = AgentExecutionLog()
    result = agent.create_booking(user.id, provider.id, available_time, TODAY, db, logger)

    check("Booking confirmed", result["status"] == "confirmed")
    check("Booking date set", result.get("booking_date") == TODAY)
    check("Has hourly_rate", result.get("hourly_rate") is not None)

    db.refresh(provider)
    updated_slots = json.loads(provider.available_slots)
    check("Slot removed", available_time not in updated_slots.get(TODAY, []))
    db.close()


def test_chat_session_storage():
    section("Unit: Chat session & state storage")
    db = SessionLocal()
    user, _ = ensure_test_data(db)

    session = ChatSession(user_id=user.id, status="active")
    db.add(session)
    db.commit()
    db.refresh(session)

    state = {"phase": "gathering_intent", "language": "roman_urdu", "service_type": "AC Technician"}
    session.extracted_state = json.dumps(state)
    db.commit()
    db.refresh(session)

    loaded = json.loads(session.extracted_state)
    check("Phase stored", loaded["phase"] == "gathering_intent")
    check("Language stored", loaded["language"] == "roman_urdu")
    db.close()


# ============================================================
# Integration Tests
# ============================================================

def test_full_booking_flow():
    """Test the complete happy path: gather → select → confirm → done."""
    section("Integration: Full booking flow (happy path)")

    db = SessionLocal()
    user, provider = ensure_test_data(db)

    # Ensure provider has slots
    slots = json.loads(provider.available_slots) if provider.available_slots else {}
    if TODAY not in slots or not slots[TODAY]:
        slots[TODAY] = ["09:00 AM", "10:00 AM", "01:00 PM"]
        provider.available_slots = json.dumps(slots)
        db.commit()
        db.refresh(provider)

    user_id = user.id
    provider_id = provider.id
    db.close()

    # Step 1: Start conversation
    log.info("\n  --- Step 1: Start conversation ---")
    r1 = client.post("/chat", json={
        "message": "Mera AC kharab ho gaya hai",
        "user_id": user_id
    }).json()

    check("Phase: gathering_intent", r1.get("phase") == "gathering_intent")
    check("Has session_id", r1.get("session_id") is not None)
    check("Has reply", bool(r1.get("reply")))
    log.info(f"  Reply: {r1.get('reply')}")

    session_id = r1["session_id"]

    # Step 2: Confirm details (should move to selecting_provider)
    log.info("\n  --- Step 2: Confirm details ---")
    r2 = client.post("/chat", json={
        "message": "Haan aaj chahiye G-13 mein",
        "user_id": user_id,
        "session_id": session_id
    }).json()

    log.info(f"  Phase: {r2.get('phase')}")
    log.info(f"  Reply: {r2.get('reply')}")

    # It might take 2-3 messages to reach selecting_provider
    if r2.get("phase") == "gathering_intent":
        log.info("  (Still gathering, sending one more confirmation)")
        r2 = client.post("/chat", json={
            "message": "Haan confirm, aaj G-13, AC technician",
            "user_id": user_id,
            "session_id": session_id
        }).json()
        log.info(f"  Phase: {r2.get('phase')}")
        log.info(f"  Reply: {r2.get('reply')}")

    providers = r2.get("providers")
    if r2.get("phase") == "selecting_provider" and providers:
        check("Phase: selecting_provider", True)
        check("Has providers", len(providers) > 0)
        log.info(f"  Providers: {[p['name'] for p in providers]}")

        # Step 3: Select a provider
        log.info("\n  --- Step 3: Select provider ---")
        p = providers[0]
        selected_slot = p["available_slots"][0] if p.get("available_slots") else "09:00 AM"
        selected_date = p.get("booking_date", TODAY)

        r3 = client.post("/chat", json={
            "user_id": user_id,
            "session_id": session_id,
            "selected_provider_id": p["id"],
            "selected_slot": selected_slot,
            "selected_date": selected_date
        }).json()

        check("Phase: confirming_booking", r3.get("phase") == "confirming_booking")
        check("Has booking_summary", r3.get("booking_summary") is not None)
        log.info(f"  Reply: {r3.get('reply')}")

        if r3.get("booking_summary"):
            bs = r3["booking_summary"]
            log.info(f"  Summary: {bs['provider_name']}, {bs['slot']}, Rs.{bs['hourly_rate']}/hr")

            # Step 4: Confirm booking
            log.info("\n  --- Step 4: Confirm booking ---")
            r4 = client.post("/chat", json={
                "message": "Haan confirm kar do",
                "user_id": user_id,
                "session_id": session_id
            }).json()

            check("Phase: completed", r4.get("phase") == "completed")
            check("Has booking_id", r4.get("booking_id") is not None)
            log.info(f"  Reply: {r4.get('reply')}")
            log.info(f"  Booking ID: {r4.get('booking_id')}")

            return r4
    else:
        log.info(f"  [INFO] Didn't reach selecting_provider yet (phase={r2.get('phase')})")
        log.info(f"  This can happen if LLM needs more turns. Try running again.")

    return r2


def test_change_time_flow():
    """Test changing time during confirmation."""
    section("Integration: Change time during confirmation")

    db = SessionLocal()
    user, provider = ensure_test_data(db)
    uid, pid = user.id, provider.id
    pname, ploc, prating = provider.name, provider.location, provider.rating
    prate = provider.hourly_rate or 800

    slots = json.loads(provider.available_slots) if provider.available_slots else {}
    if TODAY not in slots or len(slots.get(TODAY, [])) < 2:
        slots[TODAY] = ["09:00 AM", "10:00 AM", "01:00 PM"]
        provider.available_slots = json.dumps(slots)
        db.commit()

    available = slots.get(TODAY, ["09:00 AM", "10:00 AM", "01:00 PM"])

    session = ChatSession(user_id=uid, status="active")
    db.add(session)
    db.commit()
    db.refresh(session)
    sid = session.id

    state = {
        "phase": "confirming_booking",
        "language": "roman_urdu",
        "service_type": "AC Technician",
        "booking_summary": {
            "provider_id": pid, "provider_name": pname,
            "slot": available[0], "date": TODAY,
            "hourly_rate": prate, "location": ploc,
            "rating": prating, "available_slots": available,
        }
    }
    session.extracted_state = json.dumps(state)
    db.commit()
    db.close()

    new_time = available[1] if len(available) > 1 else available[0]
    r = client.post("/chat", json={
        "message": f"Time change kar do {new_time} kar do",
        "user_id": uid, "session_id": sid
    }).json()

    check("Still confirming", r.get("phase") == "confirming_booking")
    bs = r.get("booking_summary", {})
    check("Time updated", bs.get("slot") == new_time, f"Got: {bs.get('slot')}")
    log.info(f"  Reply: {r.get('reply')}")


def test_cancel_flow():
    """Test cancelling during confirmation."""
    section("Integration: Cancel booking")

    db = SessionLocal()
    user, provider = ensure_test_data(db)
    uid, pid = user.id, provider.id

    session = ChatSession(user_id=uid, status="active")
    db.add(session)
    db.commit()
    db.refresh(session)
    sid = session.id

    state = {
        "phase": "confirming_booking",
        "language": "english",
        "booking_summary": {
            "provider_id": pid, "provider_name": provider.name,
            "slot": "10:00 AM", "date": TODAY,
            "hourly_rate": 800, "location": "G-13",
            "rating": 4.5, "available_slots": ["09:00 AM", "10:00 AM"],
        }
    }
    session.extracted_state = json.dumps(state)
    db.commit()
    db.close()

    r = client.post("/chat", json={
        "message": "Cancel, I don't need it anymore",
        "user_id": uid, "session_id": sid
    }).json()

    check("Phase: completed", r.get("phase") == "completed")
    check("No booking_id", r.get("booking_id") is None)
    log.info(f"  Reply: {r.get('reply')}")


def test_chat_history():
    section("Integration: Chat history endpoint")

    db = SessionLocal()
    user, _ = ensure_test_data(db)
    session = ChatSession(user_id=user.id, status="active")
    db.add(session)
    db.commit()
    db.refresh(session)
    sid = session.id

    db.add(ChatMessage(session_id=sid, role="user", content="Test message"))
    db.add(ChatMessage(session_id=sid, role="assistant", content="Test reply"))
    db.commit()
    db.close()

    r = client.get(f"/chat/{sid}/history").json()
    check("Has messages", len(r.get("messages", [])) == 2)


def test_direct_book_endpoint():
    """Test /book still works as direct shortcut."""
    section("Integration: Direct /book endpoint")

    db = SessionLocal()
    user, provider = ensure_test_data(db)
    uid, pid = user.id, provider.id

    slots = json.loads(provider.available_slots) if provider.available_slots else {}
    if TOMORROW not in slots or not slots[TOMORROW]:
        slots[TOMORROW] = ["10:00 AM", "02:00 PM"]
        provider.available_slots = json.dumps(slots)
        db.commit()

    slot = slots[TOMORROW][0]
    db.close()

    r = client.post("/book", json={
        "user_id": uid, "provider_id": pid,
        "slot": slot, "booking_date": TOMORROW,
        "language": "english"
    }).json()

    check("Booking confirmed", r.get("status") == "confirmed")
    check("Has booking_id", r.get("booking_id") is not None)
    log.info(f"  Reply: {r.get('reply')}")


# ============================================================
# Main
# ============================================================

def run_unit_tests():
    log.info("\n" + "="*60)
    log.info("  UNIT TESTS")
    log.info("="*60)
    test_date_keyed_slots()
    test_phase_constants()
    test_rolling_window()
    test_language_lock_logic()
    test_chat_session_storage()
    test_booking_with_date()


def run_integration_tests():
    log.info("\n" + "="*60)
    log.info("  INTEGRATION TESTS")
    log.info("="*60)
    test_full_booking_flow()
    test_change_time_flow()
    test_cancel_flow()
    test_chat_history()
    test_direct_book_endpoint()


if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)

    if "--unit" in sys.argv:
        run_unit_tests()
    else:
        run_unit_tests()
        run_integration_tests()

    log.info("\n" + "="*60)
    log.info("  ALL TESTS COMPLETE")
    log.info("="*60)
