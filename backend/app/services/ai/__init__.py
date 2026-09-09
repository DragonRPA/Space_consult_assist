from functools import lru_cache
from app.core.config import get_settings
from .base import BaseSTTProvider, BaseLLMProvider
from .stt_mock import MockSTTProvider
from .stt_openai import OpenAIWhisperProvider
from .stt_groq import GroqWhisperProvider
from .llm_openai import OpenAILLMProvider
from .llm_ollama import OllamaLLMProvider

@lru_cache()
def get_stt_provider() -> BaseSTTProvider:
    settings = get_settings()
    provider_type = settings.stt_provider.lower()

    if provider_type == "groq":
        return GroqWhisperProvider(
            api_key=settings.groq_api_key,
            model=settings.groq_stt_model
        )
    elif provider_type == "openai":
        return OpenAIWhisperProvider(
            api_key=settings.openai_api_key,
            model=settings.openai_stt_model
        )
    return MockSTTProvider()

@lru_cache()
def get_llm_provider() -> BaseLLMProvider:
    settings = get_settings()
    provider_type = settings.llm_provider.lower()

    if provider_type == "openai":
        return OpenAILLMProvider(
            api_key=settings.openai_api_key,
            model=settings.openai_llm_model
        )
    return OllamaLLMProvider(
        base_url=settings.ollama_base_url,
        model=settings.ollama_model
    )
