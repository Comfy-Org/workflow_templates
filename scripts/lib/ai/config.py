"""Load AI API settings from repo .env."""

from __future__ import annotations

import os
from dataclasses import dataclass

from env import load_repo_env
from paths import REPO_ROOT

AI_API_KEY_ENV = "AI_API_KEY"
AI_BASE_URL_ENV = "AI_BASE_URL"
AI_MODEL_ENV = "AI_MODEL"


@dataclass(frozen=True)
class AISettings:
    api_key: str
    base_url: str
    model: str


def load_ai_settings() -> AISettings:
    """Return API key, base URL, and model id for chat completions."""
    load_repo_env()

    api_key = os.environ.get(AI_API_KEY_ENV, "").strip()
    base_url = os.environ.get(AI_BASE_URL_ENV, "").strip().rstrip("/")
    model = os.environ.get(AI_MODEL_ENV, "").strip()
    if not api_key:
        raise RuntimeError(
            f"{AI_API_KEY_ENV} is not set. Copy {REPO_ROOT / '.env.example'} to .env and add your API key."
        )
    if not base_url:
        raise RuntimeError(
            f"{AI_BASE_URL_ENV} is not set. Copy {REPO_ROOT / '.env.example'} to .env and add the API base URL."
        )
    if not model:
        raise RuntimeError(
            f"{AI_MODEL_ENV} is not set. Add your LLM model id to .env (e.g. AI_MODEL=gpt-4o)."
        )

    return AISettings(api_key=api_key, base_url=base_url, model=model)
