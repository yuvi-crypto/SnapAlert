"""
Preference vector builder + cosine similarity matcher.
Uses numpy for cosine distance — no pgvector dependency needed for MVP.
Production: swap to pgvector <=> operator for scale.
"""
import numpy as np
from typing import List, Dict, Any, Optional


# ── Vector dimensions ─────────────────────────────────────────────────────────
# We build a 64-dimensional preference vector from structured prefs.
# Dimensions are normalised to [0, 1].

PRICE_MAX_NORM = 5_000_000   # Normalize prices against $5M
SQFT_MAX_NORM  = 10_000      # Normalize sqft against 10k sqft
BEDS_MAX_NORM  = 10
BATHS_MAX_NORM = 10

# Feature keywords with indices in the vector (dims 10–63)
KEYWORD_LIST = [
    "pool", "spa", "garage", "modern", "renovated", "new", "view",
    "waterfront", "gated", "smart home", "solar", "fireplace", "basement",
    "open floor plan", "chef kitchen", "hardwood", "granite", "stainless",
    "walk-in closet", "master suite", "patio", "deck", "yard", "garden",
    "mountain view", "city view", "ocean view", "park", "cul-de-sac",
    "corner lot", "quiet", "schools", "commute", "bart", "metro",
    "downtown", "suburban", "luxury", "starter", "investment",
    "single family", "condo", "townhouse", "multi-family", "land",
    "new construction", "fixer upper", "turnkey", "move-in ready",
    "pet friendly", "storage", "laundry", "air conditioning", "central air",
]

VECTOR_DIM = 10 + len(KEYWORD_LIST)  # 10 numeric + N keyword dims


def build_preference_vector(pref: Dict[str, Any]) -> List[float]:
    """
    Convert a user preference dict into a normalised float vector.
    """
    vec = np.zeros(VECTOR_DIM, dtype=np.float32)

    # Numeric dimensions (0–9)
    min_p = float(pref.get("min_price", 500_000))
    max_p = float(pref.get("max_price", 1_500_000))
    mid_p = (min_p + max_p) / 2
    vec[0] = _clamp(mid_p / PRICE_MAX_NORM)          # target price
    vec[1] = _clamp(min_p / PRICE_MAX_NORM)          # min price
    vec[2] = _clamp(max_p / PRICE_MAX_NORM)          # max price
    vec[3] = _clamp(int(pref.get("min_beds", 2)) / BEDS_MAX_NORM)
    vec[4] = _clamp(float(pref.get("min_baths", 1)) / BATHS_MAX_NORM)
    # dims 5–9 reserved for future signals (school rating, commute time, etc.)

    # Keyword dimensions (10–N)
    user_keywords = [k.lower() for k in pref.get("keywords", [])]
    user_prop_types = [t.lower() for t in pref.get("property_types", [])]
    all_prefs = user_keywords + user_prop_types

    for i, kw in enumerate(KEYWORD_LIST):
        if any(kw in p or p in kw for p in all_prefs):
            vec[10 + i] = 1.0

    return vec.tolist()


def build_listing_vector(listing: Dict[str, Any]) -> List[float]:
    """
    Convert a listing dict into a vector comparable to preference vectors.
    """
    vec = np.zeros(VECTOR_DIM, dtype=np.float32)

    price = float(listing.get("price", 0))
    vec[0] = _clamp(price / PRICE_MAX_NORM)
    vec[1] = _clamp(price / PRICE_MAX_NORM)  # listing has one price
    vec[2] = _clamp(price / PRICE_MAX_NORM)
    vec[3] = _clamp(int(listing.get("beds", 0)) / BEDS_MAX_NORM)
    vec[4] = _clamp(float(listing.get("baths", 0)) / BATHS_MAX_NORM)

    # Description keyword matching
    description = (
        listing.get("description", "") + " " +
        listing.get("address", "")
    ).lower()

    for i, kw in enumerate(KEYWORD_LIST):
        if kw in description:
            vec[10 + i] = 1.0

    return vec.tolist()


def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """Compute cosine similarity between two vectors. Returns [0, 1]."""
    a = np.array(vec_a, dtype=np.float32)
    b = np.array(vec_b, dtype=np.float32)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


def score_listing_against_preference(
    listing: Dict[str, Any],
    pref: Dict[str, Any],
    pref_vector: Optional[List[float]] = None,
) -> float:
    """
    Score a listing against a user's preference.
    Returns a score from 0.0 to 1.0.
    Combines cosine similarity with hard-filter bonuses.
    """
    # Build/use preference vector
    if not pref_vector:
        pref_vector = build_preference_vector(pref)

    listing_vector = build_listing_vector(listing)
    base_score = cosine_similarity(pref_vector, listing_vector)

    # Hard filter adjustments
    price = float(listing.get("price", 0))
    beds = int(listing.get("beds", 0))
    min_price = float(pref.get("min_price", 0))
    max_price = float(pref.get("max_price", 999_999_999))
    min_beds = int(pref.get("min_beds", 0))

    # Penalise if outside price range
    if price < min_price or price > max_price:
        base_score *= 0.4

    # Penalise if under min beds
    if beds < min_beds:
        base_score *= 0.5

    # Bonus for matching city
    listing_city = listing.get("city", "").lower()
    pref_city = pref.get("city", "").lower()
    if pref_city and pref_city in listing_city:
        base_score = min(1.0, base_score * 1.15)

    return round(float(base_score), 4)


def _clamp(val: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, val))
