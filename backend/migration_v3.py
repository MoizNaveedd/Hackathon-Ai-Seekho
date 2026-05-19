import logging
from sqlalchemy import text, inspect
from database import engine, Base, SessionLocal

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migration_v3")

def run_migration():
    logger.info("Starting database schema migration v3...")
    db = SessionLocal()
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    
    # 1. Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    # 2. Add columns to users table
    if "users" in existing_tables:
        columns = [col["name"] for col in inspector.get_columns("users")]
        if "phone" not in columns:
            logger.info("Adding phone column to users...")
            db.execute(text("ALTER TABLE users ADD COLUMN phone VARCHAR"))
            db.commit()
        if "address" not in columns:
            logger.info("Adding address column to users...")
            db.execute(text("ALTER TABLE users ADD COLUMN address VARCHAR"))
            db.commit()

    # 3. Add columns to providers table
    if "providers" in existing_tables:
        columns = [col["name"] for col in inspector.get_columns("providers")]
        if "email" not in columns:
            logger.info("Adding email column to providers...")
            db.execute(text("ALTER TABLE providers ADD COLUMN email VARCHAR"))
            db.commit()
        if "phone" not in columns:
            logger.info("Adding phone column to providers...")
            db.execute(text("ALTER TABLE providers ADD COLUMN phone VARCHAR"))
            db.commit()
        if "password_hash" not in columns:
            logger.info("Adding password_hash column to providers...")
            db.execute(text("ALTER TABLE providers ADD COLUMN password_hash VARCHAR"))
            db.commit()
        if "avatar" not in columns:
            logger.info("Adding avatar column to providers...")
            db.execute(text("ALTER TABLE providers ADD COLUMN avatar VARCHAR"))
            db.commit()
        if "role" not in columns:
            logger.info("Adding role column to providers...")
            db.execute(text("ALTER TABLE providers ADD COLUMN role VARCHAR DEFAULT 'service_provider'"))
            db.commit()
        if "created_at" not in columns:
            logger.info("Adding created_at column to providers...")
            db.execute(text("ALTER TABLE providers ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))
            db.commit()

    # 4. Add columns to bookings table
    if "bookings" in existing_tables:
        columns = [col["name"] for col in inspector.get_columns("bookings")]
        if "service_type" not in columns:
            logger.info("Adding service_type column to bookings...")
            db.execute(text("ALTER TABLE bookings ADD COLUMN service_type VARCHAR"))
            db.commit()
        if "price" not in columns:
            logger.info("Adding price column to bookings...")
            db.execute(text("ALTER TABLE bookings ADD COLUMN price FLOAT"))
            db.commit()
        if "description" not in columns:
            logger.info("Adding description column to bookings...")
            db.execute(text("ALTER TABLE bookings ADD COLUMN description TEXT"))
            db.commit()
        if "created_at" not in columns:
            logger.info("Adding created_at column to bookings...")
            db.execute(text("ALTER TABLE bookings ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))
            db.commit()
        if "feedback" not in columns:
            logger.info("Adding feedback column to bookings...")
            db.execute(text("ALTER TABLE bookings ADD COLUMN feedback TEXT"))
            db.commit()
        if "customer_feedback" not in columns:
            logger.info("Adding customer_feedback column to bookings...")
            db.execute(text("ALTER TABLE bookings ADD COLUMN customer_feedback TEXT"))
            db.commit()
        if "customer_rating" not in columns:
            logger.info("Adding customer_rating column to bookings...")
            db.execute(text("ALTER TABLE bookings ADD COLUMN customer_rating FLOAT"))
            db.commit()

    logger.info("Migration v3 completed successfully!")
    db.close()

if __name__ == "__main__":
    run_migration()
