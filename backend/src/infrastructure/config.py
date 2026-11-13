import json
from typing import Union
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
    allowed_origins: Union[list[str], str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    @field_validator("allowed_origins", mode="after")
    @classmethod
    def parse_allowed_origins(cls, v):
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("[") and v.endswith("]"):
                try:
                    parsed = json.loads(v)
                    if isinstance(parsed, list):
                        return [str(o).strip() for o in parsed if str(o).strip()]
                except Exception:
                    pass
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        if isinstance(v, list):
            return [str(origin).strip() for origin in v if str(origin).strip()]
        return v


settings = Settings()
