from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    app_env: str = "development"
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str = ""
    database_url: str
    database_url_migration: str = ""
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "exaone3.5"
    notification_enabled: bool = False
    cors_origins: str = "http://localhost:5173,http://localhost:5174"
    
    # 메시징 공급자 설정 (mock, sejong, aligo)
    messaging_provider: str = "mock"
    sejong_api_url: str = "https://api.sejongnetworks.com/bizmsg/v1/message"
    sejong_client_id: str = ""
    sejong_client_secret: str = ""
    sejong_sender_number: str = ""
    aligo_key: str = ""
    aligo_user_id: str = ""
    aligo_sender: str = ""

    # 미디어/오디오 스토리지 공급자 설정 (local, r2)
    storage_provider: str = "local"
    storage_local_dir: str = "./recordings"
    r2_account_id: str = "35014a2514680107d74e1e68d96e6c32"
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket_name: str = "dragonrpa"
    r2_public_domain: str = "https://pub-4bd1b65a7bcc4eef8993da27e7362727.r2.dev"

    # AI 엔진 설정 (stt: groq, openai, mock, local / llm: ollama, openai, mock)
    stt_provider: str = "groq"
    llm_provider: str = "openai"
    groq_api_key: str = ""
    groq_stt_model: str = "whisper-large-v3-turbo"
    openai_api_key: str = ""
    openai_stt_model: str = "whisper-1"
    openai_llm_model: str = "gpt-4o-mini"
    
    class Config:
        env_file = ".env"
        extra = "ignore"

@lru_cache()
def get_settings():
    return Settings()
