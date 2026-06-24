"""OpenAI-compatible chat completions client (stdlib only)."""

from __future__ import annotations

import json
import urllib.error
import urllib.request

from ai.config import AISettings


def chat_completion(
    settings: AISettings,
    system: str,
    user: str,
    *,
    temperature: float = 0.4,
    timeout: int = 120,
) -> str:
    """Call POST {base_url}/chat/completions and return assistant message text."""
    payload = {
        "model": settings.model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": temperature,
    }
    request = urllib.request.Request(
        f"{settings.base_url}/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {settings.api_key}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = json.load(response)
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"AI API error {exc.code}: {detail}") from exc

    try:
        return body["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, TypeError) as exc:
        raise RuntimeError(f"Unexpected AI response: {body!r}") from exc


def parse_json_response(text: str) -> Any:
    """Parse assistant JSON, tolerating optional markdown fences."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        cleaned = "\n".join(lines[1:-1] if lines[-1].startswith("```") else lines[1:]).strip()
    return json.loads(cleaned)


def chat_json_completion(
    settings: AISettings,
    system: str,
    user: str,
    *,
    temperature: float = 0.3,
    timeout: int = 120,
) -> Any:
    """Chat completion that expects a JSON object or array in the response."""
    json_system = (
        f"{system.rstrip()}\n\n"
        "Respond with valid JSON only — no markdown fences, no commentary."
    )
    return parse_json_response(
        chat_completion(settings, json_system, user, temperature=temperature, timeout=timeout)
    )
