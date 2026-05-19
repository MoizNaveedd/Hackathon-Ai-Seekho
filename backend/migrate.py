"""
Migration script: run this to add new columns and convert existing data.
- Adds booking_date column to bookings table
- Adds chat_sessions and chat_messages tables
- Converts provider available_slots from old list format to new date-keyed dict format
"""
import json
from datetime import datetime, timedelta
from sqlalchemy import text, inspect
from database import engine, Base, SessionLocal
from models import Provider, ChatSession, ChatMessage


def run_migration():
    db = SessionLocal()
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()

    # 1. Create new tables if they don't exist
    print("Creating new tables (chat_sessions, chat_messages) if needed...")
    Base.metadata.create_all(bind=engine)

    # 2. Add booking_date column to bookings if missing
    if "bookings" in existing_tables:
        columns = [col["name"] for col in inspector.get_columns("bookings")]
        if "booking_date" not in columns:
            print("Adding booking_date column to bookings...")
            db.execute(text("ALTER TABLE bookings ADD COLUMN booking_date VARCHAR"))
            db.commit()
            print("Done.")
        else:
            print("booking_date column already exists.")

    # 3. Add hourly_rate column to providers if missing
    if "providers" in existing_tables:
        columns = [col["name"] for col in inspector.get_columns("providers")]
        if "hourly_rate" not in columns:
            print("Adding hourly_rate column to providers...")
            db.execute(text("ALTER TABLE providers ADD COLUMN hourly_rate FLOAT DEFAULT 500.0"))
            db.commit()
            print("Done.")
        else:
            print("hourly_rate column already exists.")

    # 4. Convert provider available_slots from list to date-keyed dict
    print("Migrating provider available_slots to date-keyed format...")
    providers = db.query(Provider).all()
    migrated = 0
    for p in providers:
        try:
            slots_data = json.loads(p.available_slots) if p.available_slots else []
        except (json.JSONDecodeError, TypeError):
            slots_data = []

        # Only migrate if it's still in old list format
        if isinstance(slots_data, list) and slots_data:
            new_slots = {}
            today = datetime.now().date()
            for i in range(7):
                date_str = (today + timedelta(days=i)).strftime("%Y-%m-%d")
                new_slots[date_str] = list(slots_data)
            p.available_slots = json.dumps(new_slots)
            migrated += 1
        elif isinstance(slots_data, list) and not slots_data:
            p.available_slots = json.dumps({})
            migrated += 1

    if migrated:
        db.commit()
        print(f"Migrated {migrated} providers to date-keyed slot format.")
    else:
        print("All providers already in date-keyed format (or no providers found).")

    # 5. Add state_snapshot and extra_data columns to chat_messages if missing
    if "chat_messages" in existing_tables:
        columns = [col["name"] for col in inspector.get_columns("chat_messages")]
        if "state_snapshot" not in columns:
            print("Adding state_snapshot column to chat_messages...")
            db.execute(text("ALTER TABLE chat_messages ADD COLUMN state_snapshot TEXT"))
            db.commit()
            print("Done.")
        if "extra_data" not in columns:
            print("Adding extra_data column to chat_messages...")
            db.execute(text("ALTER TABLE chat_messages ADD COLUMN extra_data TEXT"))
            db.commit()
            print("Done.")

    print("Migration complete!")
    db.close()


if __name__ == "__main__":
    run_migration()
