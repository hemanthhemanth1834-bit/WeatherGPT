"""Central application configuration loaded from environment variables.

All secrets and deployment-specific settings MUST come from the environment.
Never commit real credentials. See .env.example for placeholders.
"""
import os


def get_cors_origins() -> list[str]:
    raw = os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
    if raw.strip() == "*":
        return ["*"]
    return [o.strip() for o in raw.split(",") if o.strip()]


def allow_credentials_for_origins(origins: list[str]) -> bool:
    """Never combine wildcard origins with credentials (browsers reject it;
    and it would allow any site to make credentialed requests)."""
    return not (len(origins) == 1 and origins[0] == "*")


APP_VERSION = os.getenv("WEATHERGPT_VERSION", "2.0.0-sih")
APP_ENV = os.getenv("WEATHERGPT_ENV", "development")

# Optional keys for future provider integrations (all API-DEPENDENT / NOT CONFIGURED by default)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "")
IMD_API_KEY = os.getenv("IMD_API_KEY", "")
MOSDAC_API_KEY = os.getenv("MOSDAC_API_KEY", "")

# Cache TTL (seconds) for weather API responses to avoid repeated upstream calls
WEATHER_CACHE_TTL_SECONDS = int(os.getenv("WEATHER_CACHE_TTL_SECONDS", "600"))
