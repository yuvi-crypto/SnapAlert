"""User management router."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from database import get_db, User, UserPreference
from schemas import UserCreate, UserOut
from services.matcher import build_preference_vector

router = APIRouter(prefix="/users", tags=["users"])


@router.post("", response_model=UserOut)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        return existing
    user = User(
        email=payload.email,
        name=payload.name,
        phone_number=payload.phone_number,
        snapalert_enabled=False,
        created_at=datetime.utcnow(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Create default preference for new user
    pref_data = {
        "city": "San Jose",
        "state": "CA",
        "min_price": 800_000,
        "max_price": 1_500_000,
        "min_beds": 3,
        "min_baths": 2.0,
        "property_types": ["Single Family"],
        "keywords": ["garage", "modern", "schools"],
    }
    vec = build_preference_vector(pref_data)
    pref = UserPreference(
        user_id=user.id,
        city=pref_data["city"],
        state=pref_data["state"],
        min_price=pref_data["min_price"],
        max_price=pref_data["max_price"],
        min_beds=pref_data["min_beds"],
        min_baths=pref_data["min_baths"],
        property_types=pref_data["property_types"],
        keywords=pref_data["keywords"],
        preference_vector=vec,
        updated_at=datetime.utcnow(),
    )
    db.add(pref)
    db.commit()
    return user


@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db)):
    return db.query(User).all()
