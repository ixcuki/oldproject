"""Thin server-side LLM client with graceful degradation to the local planner."""
from __future__ import annotations

import json
import os
import time
from typing import Any, Dict, Optional

import httpx

SYSTEM_PROMPT = """Ты — AI Campus Assistant приложения nearby для студентов СГУ в Саратове.
Ты получаешь актуальный срез кампуса: места, live-статусы с TTL, расстояния и запросы из ленты Pulse.

Главное правило: отвечай на то, что человек попросил. Если он просто хочет есть, нужен кофе или компания — это ответ, а не расписание на часы.

Режим определяется полем timeBudgetMinutes:
- timeBudgetMinutes = null — человек время не называл. Дай прямой ответ по нужде: 1–3 шага («куда идти» и «что там сейчас»), без выдуманных длительностей. Заголовок — короткая формулировка нужды, например «Где поесть рядом» или «Где взять кофе». Запрещено писать «план на N часов», «на ближайшие 2 часа» и добивать ответ шагами, чтобы заполнить время.
- timeBudgetMinutes — число — человек назвал время. Собери план на этот бюджет: заголовок «Твой план на ближайшие <время>», шаги с длительностями. Не растягивай активности ради заполнения бюджета: обед 30–45 мин, кофе 10–15 мин, отдых 20–40 мин, подготовка — остаток времени.

Правила:
- используй только места и placeId из переданного списка, ничего не выдумывай;
- учитывай minutesLeft статуса, расстояние и рейтинг;
- если статус говорит об очереди, не советуй это место для быстрого перерыва — предложи вариант без очереди;
- 1–4 шага, каждый начинается со времени, «сейчас», «По пути» или «или»;
- тон дружелюбный, без воды и без markdown.

Верни строго JSON без пояснений:
{"title": "...", "intro": "одна короткая строка", "steps": [{"time": "5 мин", "title": "...", "detail": "...", "placeId": 1, "icon": "walk"}]}
Допустимые icon: walk, coffee, book, food, ball, users, map, clock, star, sparkles, laptop.
placeId обязателен только для шагов, привязанных к месту."""


class LLMError(RuntimeError):
    def __init__(self, message: str, retry_after: int = 300):
        super().__init__(message)
        self.retry_after = retry_after


def _provider(api_key: str) -> str:
    explicit = (os.getenv("LLM_PROVIDER") or "auto").strip().lower()
    if explicit in ("gemini", "openai", "local"):
        return explicit
    base = os.getenv("LLM_BASE_URL", "")
    if "googleapis.com" in base:
        return "gemini"
    if api_key.startswith("AQ.") or api_key.startswith("AIza"):
        return "gemini"
    return "openai"


def _extract_json(text: str) -> Dict[str, Any]:
    text = (text or "").strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise LLMError("LLM returned no JSON", 120)
    try:
        data = json.loads(text[start : end + 1])
    except json.JSONDecodeError as exc:
        raise LLMError(f"LLM JSON: {exc}", 120)
    if not isinstance(data, dict):
        raise LLMError("LLM returned non-object", 120)
    return data


def call_llm(
    query: str,
    snapshot: Dict[str, Any],
    *,
    api_key: str,
    provider: str,
    model: str,
    base_url: str = "",
    client: Optional[httpx.Client] = None,
    timeout: float = 9.0,
) -> Dict[str, Any]:
    owned = client is None
    client = client or httpx.Client(timeout=timeout)
    try:
        if provider == "gemini":
            url = f"{base_url.rstrip('/') or 'https://generativelanguage.googleapis.com/v1beta'}/models/{model}:generateContent"
            body = {
                "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
                "contents": [
                    {
                        "role": "user",
                        "parts": [
                            {
                                "text": "Запрос студента: "
                                + query
                                + "\n\nАктуальный срез кампуса (JSON):\n"
                                + json.dumps(snapshot, ensure_ascii=False)
                            }
                        ],
                    }
                ],
                "generationConfig": {
                    "temperature": 0.4,
                    "maxOutputTokens": 900,
                    "responseMimeType": "application/json",
                },
            }
            response = client.post(url, json=body, headers={"x-goog-api-key": api_key})
            if response.status_code >= 400:
                detail = response.text[:400]
                retry = 900 if "location" in detail.lower() else 300
                raise LLMError(f"Gemini HTTP {response.status_code}: {detail}", retry)
            data = response.json()
            try:
                text = data["candidates"][0]["content"]["parts"][0]["text"]
            except (KeyError, IndexError, TypeError):
                raise LLMError("Gemini returned empty candidates", 120)
            return _extract_json(text)

        url = f"{base_url.rstrip('/') or 'https://api.openai.com/v1'}/chat/completions"
        body = {
            "model": model,
            "temperature": 0.4,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": "Запрос студента: "
                    + query
                    + "\n\nАктуальный срез кампуса (JSON):\n"
                    + json.dumps(snapshot, ensure_ascii=False),
                },
            ],
        }
        response = client.post(
            url, json=body, headers={"Authorization": f"Bearer {api_key}"}
        )
        if response.status_code >= 400:
            raise LLMError(f"LLM HTTP {response.status_code}: {response.text[:300]}", 300)
        data = response.json()
        try:
            text = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError):
            raise LLMError("LLM returned empty choices", 120)
        return _extract_json(text)
    except httpx.HTTPError as exc:
        raise LLMError(f"LLM network: {exc}", 60)
    finally:
        if owned:
            client.close()


class LLMGateway:
    """Caches provider failures so the app stays fast when the API is unreachable."""

    def __init__(self) -> None:
        self.disabled_until = 0.0
        self.last_error = ""
        self.last_ok = 0.0
        self.last_source = "local"

    def enabled(self) -> bool:
        if (os.getenv("LLM_PROVIDER") or "").lower() == "local":
            return False
        if not (os.getenv("LLM_API_KEY") or "").strip():
            return False
        return time.time() >= self.disabled_until

    def plan(
        self, query: str, snapshot: Dict[str, Any], client: Optional[httpx.Client] = None
    ) -> Optional[Dict[str, Any]]:
        if not self.enabled():
            self.last_source = "local"
            return None
        api_key = os.getenv("LLM_API_KEY", "").strip()
        provider = _provider(api_key)
        model = os.getenv("LLM_MODEL", "").strip() or (
            "gemini-2.5-flash" if provider == "gemini" else "gpt-4o-mini"
        )
        base_url = os.getenv("LLM_BASE_URL", "").strip()
        try:
            data = call_llm(
                query,
                snapshot,
                api_key=api_key,
                provider=provider,
                model=model,
                base_url=base_url,
                client=client,
            )
            self.last_ok = time.time()
            self.last_error = ""
            self.last_source = "llm"
            return data
        except LLMError as exc:
            self.last_error = str(exc)[:300]
            self.disabled_until = time.time() + exc.retry_after
            self.last_source = "local"
            print(f"[nearby] LLM unavailable, using local planner: {exc}")
            return None

    def status(self) -> Dict[str, Any]:
        return {
            "enabled": self.enabled(),
            "source": self.last_source,
            "lastError": self.last_error,
            "lastOk": int(self.last_ok * 1000) if self.last_ok else None,
        }


gateway = LLMGateway()
