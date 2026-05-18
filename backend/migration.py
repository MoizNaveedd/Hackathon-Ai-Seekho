import logging
from sqlalchemy import text
from database import engine, Base
# Import all models to register them in metadata
import models

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migration")

def run_migration():
    logger.info("Starting database migration...")
    
    # 1. Manually add device_token to users if not exists
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            logger.info("Attempting to add 'device_token' column to 'users' table...")
            conn.execute(text("ALTER TABLE users ADD COLUMN device_token VARCHAR;"))
            logger.info("Successfully added 'device_token' to 'users'.")
        except Exception as e:
            # Column might already exist or table doesn't exist
            logger.warning(f"Note about 'users.device_token': {e}")
            
        try:
            logger.info("Attempting to add 'device_token' column to 'providers' table...")
            conn.execute(text("ALTER TABLE providers ADD COLUMN device_token VARCHAR;"))
            logger.info("Successfully added 'device_token' to 'providers'.")
        except Exception as e:
            # Column might already exist
            logger.warning(f"Note about 'providers.device_token': {e}")
            
        trans.commit()

    # 2. Create any missing tables (like notifications)
    logger.info("Creating new tables via SQLAlchemy metadata...")
    Base.metadata.create_all(bind=engine)
    logger.info("Table creation completed.")
    
    logger.info("Migration complete!")

if __name__ == "__main__":
    run_migration()
