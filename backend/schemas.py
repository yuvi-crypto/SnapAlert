from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ── User Schemas ──────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: str
    name: str = ""
    phone_number: str = ""


class UserOut(BaseModel):
    id: int
    email: str
    name: str
    phone_number: str
    snapalert_enabled: bool
    verified_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


# ── Preference Schemas ────────────────────────────────────────────────────────

class PreferenceUpdate(BaseModel):
    city: str = "San Jose"
    state: str = "CA"
    min_price: float = 500000
    max_price: float = 1500000
    min_beds: int = 2
    min_baths: float = 1.0
    property_types: List[str] = ["Single Family", "Condo"]
    keywords: List[str] = ["pool", "garage", "modern"]


class PreferenceOut(BaseModel):
    id: int
    user_id: int
    city: str
    state: str
    min_price: float
    max_price: float
    min_beds: int
    min_baths: float
    property_types: List[str]
    keywords: List[str]
    updated_at: datetime

    class Config:
        from_attributes = True


# ── SnapAlert Schemas ─────────────────────────────────────────────────────────

class SnapAlertEnable(BaseModel):
    user_id: int
    phone_number: str


class SnapAlertVerify(BaseModel):
    user_id: int
    code: str  # OTP code (for demo: "123456")


class SnapAlertSettings(BaseModel):
    user_id: int
    enabled: bool
    phone_number: str
    alert_count: int
    last_alert_at: Optional[datetime]
    preference: Optional[PreferenceOut]


# ── Alert Log Schemas ─────────────────────────────────────────────────────────

class AlertLogOut(BaseModel):
    id: int
    user_id: int
    listing_id: str
    address: str
    city: str
    state: str
    price: float
    beds: int
    baths: float
    sqft: int
    photo_url: str
    match_score: float
    match_explanation: str
    listing_url: str
    sms_sent_at: datetime
    clicked: bool
    showing_booked: bool
    buyers_viewed: int

    class Config:
        from_attributes = True


# ── Mock Trigger ──────────────────────────────────────────────────────────────

class MockTriggerRequest(BaseModel):
    user_id: int
    city: Optional[str] = None
    max_price: Optional[float] = None
