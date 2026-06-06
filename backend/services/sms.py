"""
Twilio WhatsApp alert sender.
Uses WhatsApp sandbox: whatsapp:+14155238886
"""
import logging
from typing import Optional
from config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


def send_whatsapp_alert(
    to_number: str,
    listing: dict,
    match_score: float,
    explanation: str,
    showing_url: str = "https://snaphomz.com/schedule",
) -> tuple[bool, str]:
    """
    Send a SnapAlert WhatsApp message for a matched listing.
    Returns (success: bool, message_sid: str)
    """
    try:
        from twilio.rest import Client
        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)

        pct = int(match_score * 100)
        price = listing.get("price", 0)
        beds = listing.get("beds", 0)
        baths = listing.get("baths", 0)
        address = listing.get("address", "")
        city = listing.get("city", "")
        sqft = listing.get("sqft", 0)
        buyers_viewed = listing.get("buyers_viewed", 0)

        # Format price nicely
        if price >= 1_000_000:
            price_str = f"${price/1_000_000:.2f}M"
        else:
            price_str = f"${price:,.0f}"

        urgency = ""
        if buyers_viewed > 0:
            urgency = f"\n🔥 {buyers_viewed} buyers viewed this today — act fast!"

        sqft_str = f" | {sqft:,} sqft" if sqft else ""

        message_body = (
            f"🏠 *SnapAlert — {pct}% Match!*\n\n"
            f"*{address}*\n"
            f"{city}\n\n"
            f"💰 {price_str}\n"
            f"🛏 {beds} bed | 🛁 {baths} bath{sqft_str}\n\n"
            f"✨ *Why it matches:*\n{explanation}\n"
            f"{urgency}\n\n"
            f"📅 *Schedule a Showing (30 sec):*\n{showing_url}"
        )

        # Determine target number
        target = to_number if to_number.startswith("whatsapp:") else f"whatsapp:{to_number}"

        msg = client.messages.create(
            from_=settings.twilio_whatsapp_from,
            body=message_body,
            to=target,
        )
        logger.info(f"WhatsApp sent SID={msg.sid} to={target}")
        return True, msg.sid

    except Exception as e:
        logger.error(f"Twilio WhatsApp error: {e}")
        return False, str(e)


def send_verification_whatsapp(to_number: str, code: str) -> tuple[bool, str]:
    """Send OTP verification via WhatsApp."""
    try:
        from twilio.rest import Client
        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)

        target = to_number if to_number.startswith("whatsapp:") else f"whatsapp:{to_number}"
        body = (
            f"🔔 *SnapAlert Verification*\n\n"
            f"Your verification code is: *{code}*\n\n"
            f"This code expires in 10 minutes.\n"
            f"_Powered by Snaphomz_"
        )
        msg = client.messages.create(
            from_=settings.twilio_whatsapp_from,
            body=body,
            to=target,
        )
        return True, msg.sid
    except Exception as e:
        logger.error(f"Twilio verify error: {e}")
        return False, str(e)


def format_showing_url(listing_id: str, user_id: int) -> str:
    """Generate a one-tap showing booking URL."""
    return f"https://snaphomz.com/schedule?listing={listing_id}&user={user_id}&utm_source=snapalert"
