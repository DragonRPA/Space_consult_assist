from functools import lru_cache
from app.core.config import get_settings
from .base import BaseMessagingProvider
from .mock import MockMessagingProvider
from .sejong import SejongMessagingProvider
from .aligo import AligoMessagingProvider

@lru_cache()
def get_messaging_provider() -> BaseMessagingProvider:
    settings = get_settings()
    provider_type = settings.messaging_provider.lower()

    if provider_type == "sejong":
        return SejongMessagingProvider(
            api_url=settings.sejong_api_url,
            client_id=settings.sejong_client_id,
            client_secret=settings.sejong_client_secret,
            default_sender=settings.sejong_sender_number
        )
    elif provider_type == "aligo":
        return AligoMessagingProvider(
            key=settings.aligo_key,
            user_id=settings.aligo_user_id,
            sender=settings.aligo_sender
        )
    return MockMessagingProvider()
