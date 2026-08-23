from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    app_env: str = "development"
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str = ""
    database_url: str
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "exaone3.5"
    notification_enabled: bool = False
    cors_origins: str = "http://localhost:5173,http://localhost:5174"
    
    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()
