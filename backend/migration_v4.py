import logging
from sqlalchemy import text, inspect
from database import engine, Base, SessionLocal

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migration_v4")

def run_migration():
    logger.info("Starting database schema migration v4 (Adding prompt to bookings)...")
    db = SessionLocal()
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    
    # Add column to bookings table
    if "bookings" in existing_tables:
        columns = [col["name"] for col in inspector.get_columns("bookings")]
        if "prompt" not in columns:
            logger.info("Adding prompt column to bookings...")
            db.execute(text("ALTER TABLE bookings ADD COLUMN prompt TEXT"))
            db.commit()
        else:
            logger.info("prompt column already exists in bookings.")

    logger.info("Migration v4 completed successfully!")
    db.close()

if __name__ == "__main__":
    run_migration()
