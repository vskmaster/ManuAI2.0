import os
from pathlib import Path
from pydantic_settings import BaseSettings

_ROOT_ENV = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    GEMINI_API_KEY_VOICE: str = ""
    GEMINI_API_KEY_STRUCTURING: str = ""
    MONGODB_URI: str = ""
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_PUBLISHABLE_KEY: str = ""

    JWT_SECRET: str = "supersecretjwtsecretkeyshouldbechanged"
    JWT_ALGORITHM: str = "HS256"

    class Config:
        env_file = str(_ROOT_ENV)
        extra = "ignore"

    @property
    def supabase_key(self) -> str:
        """Return whichever Supabase anon/publishable key is set."""
        return self.SUPABASE_ANON_KEY or self.SUPABASE_PUBLISHABLE_KEY

    def validate_keys(self) -> None:
        """Log warnings at startup for any missing critical keys."""
        missing = []
        if not self.GEMINI_API_KEY_VOICE:
            missing.append("GEMINI_API_KEY_VOICE")
        if not self.GEMINI_API_KEY_STRUCTURING:
            missing.append("GEMINI_API_KEY_STRUCTURING")
        if not self.MONGODB_URI:
            missing.append("MONGODB_URI")
        if not self.supabase_key:
            missing.append("SUPABASE_ANON_KEY / SUPABASE_PUBLISHABLE_KEY")
        if missing:
            print(f"[CONFIG WARNING] Missing environment variables: {', '.join(missing)}")
        else:
            print("[CONFIG] All critical environment variables loaded successfully.")


settings = Settings()
