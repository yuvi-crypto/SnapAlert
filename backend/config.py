from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # RealEstateAPI
    realestate_api_backend_key: str = ""
    realestate_api_frontend_key: str = ""
    realestate_api_base_url: str = "https://staging.realestateapi.com"

    # Twilio WhatsApp
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_whatsapp_from: str = "whatsapp:+14155238886"
    twilio_whatsapp_to: str = ""  # default demo number

    # App
    database_url: str = "sqlite:///./snapalert.db"
    secret_key: str = ""  # REQUIRED – set via SECRET_KEY env var
    poll_interval_seconds: int = 300
    match_threshold: float = 0.65
    demo_city: str = "San Jose"
    demo_state: str = "CA"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
