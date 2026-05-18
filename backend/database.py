import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# Read the connection URL. Fall back to your Neon.tech credentials if not present in env.
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://neondb_owner:npg_0gLZAIWeMUu2@ep-snowy-poetry-ap7rbstm.c-7.us-east-1.aws-neon.tech/neondb?sslmode=require".replace("aws-neon.tech", "aws.neon.tech")
)

# SQLAlchemy 2.0 engine configuration for PostgreSQL
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True  # Recommended for serverless databases (like Neon) to automatically handle connection recycles
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
