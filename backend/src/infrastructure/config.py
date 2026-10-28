from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    redis_url: str = "redis://localhost:6379"
    database_url: str = "sqlite+aiosqlite:///./data/skytrace.db"
    irsa_sia2_url: str = "https://irsa.ipac.caltech.edu/ibe/sia2/spherex/qr3"
    irsa_ibe_url: str = "https://irsa.ipac.caltech.edu/ibe/data/spherex/qr3"
    irsa_most_url: str = "https://irsa.ipac.caltech.edu/applications/MOST"
    log_level: str = "INFO"
    allowed_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v


settings = Settings()
