"""
SnapAlert core router — enable, verify, settings, preferences, alerts, mock trigger.
"""
import asyncio
import random
import string
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from database import get_db, User, UserPreference, AlertLog
from schemas import (
    SnapAlertEnable, SnapAlertVerify, SnapAlertSettings,
    PreferenceUpdate, PreferenceOut, AlertLogOut, MockTriggerRequest,
)
from services.matcher import build_preference_vector, score_listing_against_preference
from services.realestate_api import search_active_listings, generate_match_explanation
from services.sms import send_whatsapp_alert, send_verification_whatsapp, format_showing_url
from config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)
router = APIRouter(prefix="/snapalert", tags=["snapalert"])

# In-memory OTP store (production: use Redis with TTL)
_otp_store: dict[int, str] = {}


# ── Enable SnapAlert ──────────────────────────────────────────────────────────

@router.post("/enable")
def enable_snapalert(payload: SnapAlertEnable, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Update phone
    user.phone_number = payload.phone_number
    db.commit()

    # Generate 6-digit OTP
    code = "".join(random.choices(string.digits, k=6))
    _otp_store[payload.user_id] = code
    logger.info(f"OTP for user {payload.user_id}: {code}")

    # Send via WhatsApp
    success, sid = send_verification_whatsapp(payload.phone_number, code)

    return {
        "status": "verification_sent",
        "message": "Verification WhatsApp sent. Check your WhatsApp and enter the 6-digit code.",
        "demo_code": code,   # Expose in dev for easy testing
        "whatsapp_sid": sid if success else None,
        "success": success,
    }


# ── Verify OTP ────────────────────────────────────────────────────────────────

@router.post("/verify")
def verify_snapalert(payload: SnapAlertVerify, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    stored_code = _otp_store.get(payload.user_id)
    # Accept exact match OR demo bypass code "000000"
    if stored_code and (payload.code == stored_code or payload.code == "000000"):
        user.snapalert_enabled = True
        user.verified_at = datetime.utcnow()
        db.commit()
        _otp_store.pop(payload.user_id, None)
        return {"status": "enabled", "message": "SnapAlert is now ON 🔔"}
    else:
        raise HTTPException(status_code=400, detail="Invalid verification code")


# ── Settings ──────────────────────────────────────────────────────────────────

@router.get("/settings/{user_id}")
def get_settings_endpoint(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    pref = db.query(UserPreference).filter(UserPreference.user_id == user_id).first()
    alert_count = db.query(AlertLog).filter(AlertLog.user_id == user_id).count()
    last_alert = (
        db.query(AlertLog)
        .filter(AlertLog.user_id == user_id)
        .order_by(AlertLog.sms_sent_at.desc())
        .first()
    )

    return {
        "user_id": user_id,
        "enabled": user.snapalert_enabled,
        "phone_number": user.phone_number,
        "alert_count": alert_count,
        "last_alert_at": last_alert.sms_sent_at if last_alert else None,
        "preference": {
            "city": pref.city if pref else "San Jose",
            "state": pref.state if pref else "CA",
            "min_price": pref.min_price if pref else 800_000,
            "max_price": pref.max_price if pref else 1_500_000,
            "min_beds": pref.min_beds if pref else 3,
            "min_baths": pref.min_baths if pref else 2.0,
            "property_types": pref.property_types if pref else ["Single Family"],
            "keywords": pref.keywords if pref else [],
        } if pref else None,
    }


# ── Update Preferences ────────────────────────────────────────────────────────

@router.post("/preferences/{user_id}")
def update_preferences(
    user_id: int, payload: PreferenceUpdate, db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    pref = db.query(UserPreference).filter(UserPreference.user_id == user_id).first()
    pref_dict = payload.model_dump()
    vec = build_preference_vector(pref_dict)

    if pref:
        for k, v in pref_dict.items():
            setattr(pref, k, v)
        pref.preference_vector = vec
        pref.updated_at = datetime.utcnow()
    else:
        pref = UserPreference(user_id=user_id, preference_vector=vec, **pref_dict)
        db.add(pref)

    db.commit()
    return {"status": "updated", "message": "Preferences saved and vector rebuilt"}


# ── Alert History ─────────────────────────────────────────────────────────────

@router.get("/alerts/{user_id}")
def get_alerts(user_id: int, limit: int = 20, db: Session = Depends(get_db)):
    alerts = (
        db.query(AlertLog)
        .filter(AlertLog.user_id == user_id)
        .order_by(AlertLog.sms_sent_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": a.id,
            "listing_id": a.listing_id,
            "address": a.address,
            "city": a.city,
            "state": a.state,
            "price": a.price,
            "beds": a.beds,
            "baths": a.baths,
            "sqft": a.sqft,
            "photo_url": a.photo_url,
            "match_score": a.match_score,
            "match_explanation": a.match_explanation,
            "listing_url": a.listing_url,
            "sms_sent_at": a.sms_sent_at,
            "clicked": a.clicked,
            "showing_booked": a.showing_booked,
            "buyers_viewed": a.buyers_viewed,
        }
        for a in alerts
    ]


# ── Stats ─────────────────────────────────────────────────────────────────────

@router.get("/stats/{user_id}")
def get_stats(user_id: int, db: Session = Depends(get_db)):
    alerts = db.query(AlertLog).filter(AlertLog.user_id == user_id).all()
    total = len(alerts)
    avg_score = sum(a.match_score for a in alerts) / total if total else 0
    clicked = sum(1 for a in alerts if a.clicked)
    booked = sum(1 for a in alerts if a.showing_booked)
    return {
        "total_alerts": total,
        "avg_match_score": round(avg_score, 3),
        "clicked": clicked,
        "showing_booked": booked,
        "response_rate": round(clicked / total, 3) if total else 0,
    }


# ── Mark Alert Clicked ────────────────────────────────────────────────────────

@router.post("/alerts/{alert_id}/click")
def mark_clicked(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(AlertLog).filter(AlertLog.id == alert_id).first()
    if alert:
        alert.clicked = True
        db.commit()
    return {"status": "ok"}


# ── Mock Trigger (Hackathon Demo) ─────────────────────────────────────────────

@router.post("/mock-trigger")
async def mock_trigger(payload: MockTriggerRequest, db: Session = Depends(get_db)):
    """
    Instantly fire a demo SnapAlert for a user.
    Fetches a real listing from RealEstateAPI and sends WhatsApp alert.
    """
    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    pref = db.query(UserPreference).filter(UserPreference.user_id == payload.user_id).first()

    city = payload.city or (pref.city if pref else settings.demo_city)
    max_price = payload.max_price or (pref.max_price if pref else 1_500_000)

    pref_dict = {
        "city": city,
        "state": pref.state if pref else settings.demo_state,
        "min_price": pref.min_price if pref else 500_000,
        "max_price": max_price,
        "min_beds": pref.min_beds if pref else 3,
        "min_baths": pref.min_baths if pref else 2.0,
        "property_types": pref.property_types if pref else ["Single Family"],
        "keywords": pref.keywords if pref else ["garage", "modern"],
    }

    # Fetch real listings
    listings = await search_active_listings(
        city=city,
        state=pref_dict["state"],
        max_price=max_price,
        min_beds=pref_dict["min_beds"],
        size=20,
    )

    # Try to find a good match, else use first listing
    best_listing = None
    best_score = 0.0
    pref_vec = pref.preference_vector if pref else []

    for listing in listings:
        score = score_listing_against_preference(listing, pref_dict, pref_vec or None)
        if score > best_score:
            best_score = score
            best_listing = listing

    # If no real listings available, use demo data
    if not best_listing:
        best_listing = _demo_listing(city)
        best_score = round(random.uniform(0.78, 0.95), 4)

    best_listing["buyers_viewed"] = random.randint(10, 28)

    explanation = await generate_match_explanation(best_listing, pref_dict, best_score)
    showing_url = format_showing_url(best_listing.get("id", "demo"), user.id)
    to_number = user.phone_number or settings.twilio_whatsapp_to

    success, sid = send_whatsapp_alert(
        to_number=to_number,
        listing=best_listing,
        match_score=best_score,
        explanation=explanation,
        showing_url=showing_url,
    )

    # Log it
    log = AlertLog(
        user_id=user.id,
        listing_id=best_listing.get("id", "demo-trigger"),
        address=best_listing.get("address", ""),
        city=best_listing.get("city", city),
        state=best_listing.get("state", "CA"),
        price=best_listing.get("price", 0),
        beds=best_listing.get("beds", 0),
        baths=best_listing.get("baths", 0),
        sqft=best_listing.get("sqft", 0),
        photo_url=best_listing.get("photo_url", ""),
        match_score=best_score,
        match_explanation=explanation,
        listing_url=showing_url,
        sms_sent_at=datetime.utcnow(),
        buyers_viewed=best_listing.get("buyers_viewed", 12),
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    return {
        "status": "sent" if success else "logged_only",
        "whatsapp_sent": success,
        "whatsapp_sid": sid,
        "alert": {
            "id": log.id,
            "address": log.address,
            "price": log.price,
            "beds": log.beds,
            "match_score": log.match_score,
            "explanation": log.match_explanation,
            "showing_url": showing_url,
        },
    }


def _demo_listing(city: str = "San Jose") -> dict:
    """Fallback demo listing when no API results available."""
    demos = [
        {
            "id": "demo-001",
            "address": f"2847 Oakwood Drive, {city}, CA",
            "city": city,
            "state": "CA",
            "price": 1_150_000,
            "beds": 4,
            "baths": 3.0,
            "sqft": 2240,
            "photo_url": "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800",
            "description": "Beautiful modern home with garage, renovated kitchen, hardwood floors, and great schools. Pool and spacious backyard.",
            "listing_url": "",
        },
        {
            "id": "demo-002",
            "address": f"1456 Maple Court, {city}, CA",
            "city": city,
            "state": "CA",
            "price": 980_000,
            "beds": 3,
            "baths": 2.5,
            "sqft": 1890,
            "photo_url": "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800",
            "description": "Stunning single family home in quiet cul-de-sac. Smart home features, solar panels, chef kitchen. Walk to park.",
            "listing_url": "",
        },
    ]
    return random.choice(demos)
