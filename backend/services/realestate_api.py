"""
RealEstateAPI wrapper — Property Search + PropGPT AI explanation
Backend key used for all server-side calls.
"""
import httpx
import logging
from typing import Optional, List, Dict, Any
from config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

BASE_URL = settings.realestate_api_base_url
HEADERS = {
    "x-api-key": settings.realestate_api_backend_key,
    "Content-Type": "application/json",
    "Accept": "application/json",
}

TIMEOUT = 30.0


async def search_active_listings(
    city: str = "San Jose",
    state: str = "CA",
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_beds: Optional[int] = None,
    size: int = 50,
) -> List[Dict[str, Any]]:
    """
    Poll RealEstateAPI for active listings matching basic filters.
    Returns normalized listing dicts.
    """
    payload: Dict[str, Any] = {
        "city": city,
        "state": state,
        "status": ["Active"],
        "size": size,
    }
    if min_price:
        payload["list_price_min"] = int(min_price)
    if max_price:
        payload["list_price_max"] = int(max_price)
    if min_beds:
        payload["beds_min"] = min_beds

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.post(
                f"{BASE_URL}/v2/PropertySearch",
                headers=HEADERS,
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            raw = data.get("data", data.get("results", data.get("properties", [])))
            if isinstance(raw, list):
                return [_normalize_listing(p) for p in raw if p]
            return []
    except httpx.HTTPStatusError as e:
        logger.error(f"RealEstateAPI HTTP error {e.response.status_code}: {e.response.text[:300]}")
        return []
    except Exception as e:
        logger.error(f"RealEstateAPI error: {e}")
        return []


async def get_property_detail(listing_id: str) -> Optional[Dict[str, Any]]:
    """Fetch full property detail by ID."""
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.post(
                f"{BASE_URL}/v2/PropertyDetail",
                headers=HEADERS,
                json={"id": listing_id},
            )
            resp.raise_for_status()
            data = resp.json()
            prop = data.get("data", data.get("property", data))
            return _normalize_listing(prop) if prop else None
    except Exception as e:
        logger.error(f"PropertyDetail error for {listing_id}: {e}")
        return None


async def generate_match_explanation(
    listing: Dict[str, Any],
    preference: Dict[str, Any],
    match_score: float,
) -> str:
    """
    Use PropGPT AI to generate a human-readable match explanation.
    Falls back to a rule-based explanation if PropGPT is unavailable.
    """
    prompt = _build_explanation_prompt(listing, preference, match_score)

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.post(
                f"{BASE_URL}/v2/PropGPT",
                headers=HEADERS,
                json={"prompt": prompt, "max_tokens": 120},
            )
            if resp.status_code == 200:
                data = resp.json()
                text = (
                    data.get("response")
                    or data.get("answer")
                    or data.get("text")
                    or ""
                )
                if text:
                    return text.strip()
    except Exception as e:
        logger.warning(f"PropGPT unavailable, using rule-based: {e}")

    # Fallback: rule-based explanation
    return _rule_based_explanation(listing, preference, match_score)


def _build_explanation_prompt(listing, preference, score):
    pct = int(score * 100)
    return (
        f"Write a 1-sentence SMS match explanation for a home buyer. "
        f"Match score: {pct}%. "
        f"Property: {listing.get('beds',0)}BR/{listing.get('baths',0)}BA, "
        f"${listing.get('price',0):,.0f}, {listing.get('city','')}, {listing.get('state','')}. "
        f"Buyer wants: {preference.get('min_beds',2)}+BR, "
        f"${preference.get('min_price',0):,.0f}-${preference.get('max_price',0):,.0f}, "
        f"{preference.get('city','')}. "
        f"Keywords: {', '.join(preference.get('keywords', []))}. "
        f"Be specific, concise, under 100 characters."
    )


def _rule_based_explanation(listing, preference, score):
    pct = int(score * 100)
    reasons = []
    if listing.get("beds", 0) >= preference.get("min_beds", 2):
        reasons.append(f"{listing['beds']}BR ✓")
    price = listing.get("price", 0)
    max_p = preference.get("max_price", 999999999)
    if price <= max_p:
        diff = max_p - price
        reasons.append(f"${diff:,.0f} under budget ✓")
    kws = preference.get("keywords", [])
    desc = listing.get("description", "").lower()
    for kw in kws:
        if kw.lower() in desc:
            reasons.append(f"{kw} ✓")
    if reasons:
        return f"{pct}% match — {', '.join(reasons[:3])}"
    return f"{pct}% match — meets your key criteria in {listing.get('city', 'target area')}"


def _normalize_listing(p: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize varied RealEstateAPI response shapes into a standard dict."""
    if not p:
        return {}

    # Try multiple key patterns from different endpoints
    listing_id = (
        p.get("id") or p.get("listing_id") or p.get("mls_id") or
        p.get("property_id") or str(p.get("zpid", "")) or ""
    )
    address = (
        p.get("address") or
        p.get("full_address") or
        (f"{p.get('street_address','')}, {p.get('city','')}, {p.get('state','')}").strip(", ") or
        ""
    )
    photos = p.get("photos", p.get("photo_urls", p.get("images", [])))
    photo_url = ""
    if isinstance(photos, list) and photos:
        photo_url = photos[0] if isinstance(photos[0], str) else photos[0].get("href", "")
    elif isinstance(photos, str):
        photo_url = photos

    price = float(
        p.get("list_price") or p.get("price") or p.get("listing_price") or
        p.get("estimated_value") or 0
    )
    beds = int(p.get("beds") or p.get("bedrooms") or p.get("bedroom_count") or 0)
    baths = float(p.get("baths") or p.get("bathrooms") or p.get("bathroom_count") or 0)
    sqft = int(p.get("sqft") or p.get("living_sqft") or p.get("square_feet") or 0)
    city = p.get("city") or p.get("mailing_city") or ""
    state = p.get("state") or p.get("mailing_state") or ""
    description = p.get("description") or p.get("remarks") or p.get("public_remarks") or ""
    listing_url = p.get("listing_url") or p.get("url") or p.get("detail_url") or ""

    return {
        "id": listing_id,
        "address": address,
        "city": city,
        "state": state,
        "price": price,
        "beds": beds,
        "baths": baths,
        "sqft": sqft,
        "photo_url": photo_url,
        "description": description,
        "listing_url": listing_url,
        "raw": p,
    }
