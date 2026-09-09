from functools import lru_cache
from app.core.config import get_settings
from .base import BaseStorageProvider
from .local_storage import LocalStorageProvider
from .r2_storage import CloudflareR2StorageProvider

@lru_cache()
def get_storage_provider() -> BaseStorageProvider:
    settings = get_settings()
    if settings.storage_provider == "r2":
        return CloudflareR2StorageProvider(
            account_id=settings.r2_account_id,
            access_key_id=settings.r2_access_key_id,
            secret_access_key=settings.r2_secret_access_key,
            bucket_name=settings.r2_bucket_name,
            public_domain=settings.r2_public_domain
        )
    return LocalStorageProvider(base_dir=settings.storage_local_dir)
