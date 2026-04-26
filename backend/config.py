from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    database_url: str = "postgresql+asyncpg://projectiq:projectiq_pass@localhost:5432/projectiq"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Auth
    jwt_secret_key: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # Ollama
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "gemma4:e4b"

    # Bots
    telegram_bot_token: str = ""
    discord_bot_token: str = ""
    teams_webhook_url: str = ""

    # App
    app_name: str = "ProjectIQ"
    debug: bool = False


settings = Settings()
