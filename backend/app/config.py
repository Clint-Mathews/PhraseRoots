from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    allowed_origins: str = "http://localhost:3000"
    openrouter_api_key: str = ""
    openrouter_model: str = "qwen/qwen3-30b-a3b-instruct-2507"
    google_drive_folder_id: str = ""
    google_service_account_file: str = ""
    max_audio_upload_bytes: int = 50 * 1024 * 1024
    whisper_model: str = "small"
    whisper_compute_type: str = "int8"
    auth_username: str = ""
    auth_password: str = ""
    jwt_secret: str = ""
    jwt_expire_minutes: int = 480

    @property
    def origins(self) -> list[str]:
        return [value.strip() for value in self.allowed_origins.split(",") if value.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
