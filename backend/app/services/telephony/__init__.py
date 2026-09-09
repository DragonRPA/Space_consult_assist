from functools import lru_cache
from .base import BaseTelephonyProvider
from .generic_webhook import GenericWebhookTelephonyProvider

@lru_cache()
def get_telephony_provider() -> BaseTelephonyProvider:
    return GenericWebhookTelephonyProvider()
