from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Local default is SQLite so you can run before Neon is ready.
    DATABASE_URL: str = "sqlite:///./app.db"

    JWT_SECRET: str = "dev-secret-change-me"
    JWT_ALG: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    GEMINI_API_KEY: str = ""
    # Verify the exact model string in Google AI Studio.
    AI_MODEL: str = "gemini-2.5-flash"

    # Razorpay (Test Mode keys work with no business activation)
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""  # only needed for the deployed webhook
    PRO_PRICE_INR: int = 499  # rupees; charged once to unlock Pro in this demo

    FRONTEND_URL: str = "http://localhost:5173"

    # Free-tier gates (Pro = unlimited)
    FREE_CONTACT_LIMIT: int = 10
    FREE_AI_DAILY_LIMIT: int = 3

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()

PIPELINE_STAGES = ["Lead", "Contacted", "Proposal", "Won", "Lost"]
