"""
APScheduler-based 5-minute polling loop.
Polls RealEstateAPI for new CA listings and fires WhatsApp alerts on matches.
"""
import asyncio
import logging
import random
from datetime import datetime
from typing import Set

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from config import get_settings
from database import SessionLocal, UserPreference, User, AlertLog, SeenListing
from services.realestate_api import search_active_listings, generate_match_explanation
from services.matcher import score_listing_against_preference, build_preference_vector
from services.sms import send_whatsapp_alert, format_showing_url

settings = get_settings()
logger = logging.getLogger(__name__)

# In-memory dedup set (backed by DB)
_seen_ids: Set[str] = set()
_scheduler: AsyncIOScheduler = None


def get_scheduler() -> AsyncIOScheduler:
    global _scheduler
    if _scheduler is None:
        _scheduler = AsyncIOScheduler()
    return _scheduler


def load_seen_ids():
    """Bootstrap in-memory set from DB on startup."""
    db = SessionLocal()
    try:
        rows = db.query(SeenListing).all()
        _seen_ids.update(r.listing_id for r in rows)
        logger.info(f"Loaded {len(_seen_ids)} seen listing IDs from DB")
    finally:
        db.close()


def mark_seen(listing_id: str):
    """Mark a listing as seen in memory + DB."""
    _seen_ids.add(listing_id)
    db = SessionLocal()
    try:
        if not db.query(SeenListing).filter_by(listing_id=listing_id).first():
            db.add(SeenListing(listing_id=listing_id, first_seen_at=datetime.utcnow()))
            db.commit()
    except Exception as e:
        logger.error(f"mark_seen DB error: {e}")
        db.rollback()
    finally:
        db.close()


async def poll_and_alert():
    """
    Core polling job — runs every POLL_INTERVAL_SECONDS.
    1. Fetch active listings from RealEstateAPI
    2. Filter out already-seen listings
    3. Match against all enabled users' preferences
    4. Fire WhatsApp alert if match score > threshold
    """
    logger.info("⏰ Poll cycle starting...")
    db = SessionLocal()
    try:
        # Get all enabled users with preferences
        enabled_users = (
            db.query(User, UserPreference)
            .join(UserPreference, User.id == UserPreference.user_id)
            .filter(User.snapalert_enabled == True)
            .all()
        )

        if not enabled_users:
            logger.info("No enabled SnapAlert users — skipping poll")
            return

        logger.info(f"Polling for {len(enabled_users)} enabled user(s)...")

        # Collect unique cities to poll
        cities_states = list({(u_pref.city, u_pref.state) for _, u_pref in enabled_users})

        for city, state in cities_states:
            listings = await search_active_listings(
                city=city,
                state=state,
                size=50,
            )
            logger.info(f"Got {len(listings)} listings for {city}, {state}")

            for listing in listings:
                lid = listing.get("id", "")
                if not lid or lid in _seen_ids:
                    continue

                mark_seen(lid)
                listing["buyers_viewed"] = random.randint(8, 24)  # Urgency signal

                # Score against each user in this city
                for user, pref in enabled_users:
                    if pref.city.lower() != city.lower():
                        continue

                    pref_dict = {
                        "city": pref.city,
                        "state": pref.state,
                        "min_price": pref.min_price,
                        "max_price": pref.max_price,
                        "min_beds": pref.min_beds,
                        "min_baths": pref.min_baths,
                        "property_types": pref.property_types or [],
                        "keywords": pref.keywords or [],
                    }
                    pref_vector = pref.preference_vector or build_preference_vector(pref_dict)
                    score = score_listing_against_preference(listing, pref_dict, pref_vector)

                    if score >= settings.match_threshold:
                        logger.info(
                            f"✅ Match! user={user.id} listing={lid} score={score:.2f}"
                        )
                        explanation = await generate_match_explanation(listing, pref_dict, score)
                        showing_url = format_showing_url(lid, user.id)

                        # Send WhatsApp
                        to_number = user.phone_number or settings.twilio_whatsapp_to
                        success, sid = send_whatsapp_alert(
                            to_number=to_number,
                            listing=listing,
                            match_score=score,
                            explanation=explanation,
                            showing_url=showing_url,
                        )

                        # Log to DB
                        log = AlertLog(
                            user_id=user.id,
                            listing_id=lid,
                            address=listing.get("address", ""),
                            city=listing.get("city", ""),
                            state=listing.get("state", ""),
                            price=listing.get("price", 0),
                            beds=listing.get("beds", 0),
                            baths=listing.get("baths", 0),
                            sqft=listing.get("sqft", 0),
                            photo_url=listing.get("photo_url", ""),
                            match_score=score,
                            match_explanation=explanation,
                            listing_url=showing_url,
                            sms_sent_at=datetime.utcnow(),
                            buyers_viewed=listing.get("buyers_viewed", 0),
                        )
                        db.add(log)
                        db.commit()

    except Exception as e:
        logger.error(f"Poll cycle error: {e}", exc_info=True)
    finally:
        db.close()
    logger.info("⏰ Poll cycle complete")


def start_scheduler():
    """Start the APScheduler background poller."""
    load_seen_ids()
    scheduler = get_scheduler()
    if not scheduler.running:
        scheduler.add_job(
            poll_and_alert,
            "interval",
            seconds=settings.poll_interval_seconds,
            id="snap_alert_poller",
            replace_existing=True,
            max_instances=1,
        )
        scheduler.start()
        logger.info(
            f"🚀 SnapAlert poller started — interval={settings.poll_interval_seconds}s"
        )


def stop_scheduler():
    scheduler = get_scheduler()
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("SnapAlert poller stopped")
