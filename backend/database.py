from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

from config import get_settings

settings = get_settings()

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if "sqlite" in settings.database_url else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String, default="")
    phone_number = Column(String, default="")
    snapalert_enabled = Column(Boolean, default=False)
    verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class UserPreference(Base):
    __tablename__ = "user_preferences"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    city = Column(String, default="San Jose")
    state = Column(String, default="CA")
    min_price = Column(Float, default=500000)
    max_price = Column(Float, default=1500000)
    min_beds = Column(Integer, default=2)
    min_baths = Column(Float, default=1.0)
    property_types = Column(JSON, default=["Single Family", "Condo"])
    keywords = Column(JSON, default=["pool", "garage", "modern"])
    # Store vector as JSON array (list of floats) - numpy used at runtime
    preference_vector = Column(JSON, default=[])
    updated_at = Column(DateTime, default=datetime.utcnow)


class AlertLog(Base):
    __tablename__ = "alert_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    listing_id = Column(String, index=True)
    address = Column(String, default="")
    city = Column(String, default="")
    state = Column(String, default="")
    price = Column(Float, default=0)
    beds = Column(Integer, default=0)
    baths = Column(Float, default=0)
    sqft = Column(Integer, default=0)
    photo_url = Column(String, default="")
    match_score = Column(Float, default=0)
    match_explanation = Column(Text, default="")
    listing_url = Column(String, default="")
    sms_sent_at = Column(DateTime, default=datetime.utcnow)
    clicked = Column(Boolean, default=False)
    showing_booked = Column(Boolean, default=False)
    buyers_viewed = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class SeenListing(Base):
    __tablename__ = "seen_listings"
    id = Column(Integer, primary_key=True, index=True)
    listing_id = Column(String, unique=True, index=True)
    first_seen_at = Column(DateTime, default=datetime.utcnow)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    Base.metadata.create_all(bind=engine)
