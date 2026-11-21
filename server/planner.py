"""Deterministic campus planner used as an always-available fallback for the LLM."""
from __future__ import annotations

from typing import Any, Dict, Iterable, List, Optional, Sequence, Set

from . import domain

ALLOWED_ICONS = {
    "walk",
    "coffee",
    "book",
    "food",
    "ball",
    "users",
    "map",
    "clock",
    "star",
    "sparkles",
    "laptop",
}

_QUIET_KINDS = {"library", "study"}


def _has(text: str, words: Iterable[str]) -> bool:
    return any(word in text for word in words)


def detect_intents(query: str) -> Dict[str, bool]:
    q = (query or "").lower().replace("ё", "е")
    return {
        "quiet": _has(
            q,
            (
                "тих",
                "спокой",
                "подготов",
                "экзамен",
                "занят",
                "учит",
                "сесси",
                "конспект",
                "библиот",
                "почита",
                "учеб",
            ),
        ),
        "coffee": _has(q, ("кофе", "латте", "капучино", "кофейн", "эспрессо")),
        "food": _has(
            q,
            ("обед", "пообед", "поесть", "еда", "столов", "перекус", "голод", "ланч"),
        ),
        "sport": _has(
            q,
            ("спорт", "баскет", "игрок", "площадк", "тренир", "футбол", "волейбол", "игра"),
        ),
        "event": _has(q, ("мероприят", "событ", "концерт", "встреч", "лекц", "выступ")),
        "queue": _has(q, ("очеред", "свободн", "свобод", "мест", "без очеред")),
        "company": _has(
            q,
            (
                "компани",
                "вместе",
                "напарник",
                "друз",
                "познаком",
                "кто хочет",
                "пообед",
                "с кем",
            ),
        ),
        "rest": _has(q, ("отдох", "прогул", "перерыв", "развеят", "подышать", "сквер")),
    }


def _distance_km(place: Dict[str, Any]) -> float:
    value = place.get("distanceM")
    if value is None:
        return 1.5
    return max(0.0, float(value)) / 1000.0


def _score(place: Dict[str, Any], intents: Dict[str, bool]) -> float:
    kind = place.get("kind") or ""
    score = float(place.get("rating") or 0) * 0.5
    score -= _distance_km(place) * 0.6
    status = place.get("status") or {}
    stype = status.get("type")
    if status:
        score += 0.8
    if stype == "free":
        score += 1.2
        if intents["quiet"]:
            score += 1.5
    elif stype == "quiet":
        score += 1.4
        if intents["quiet"]:
            score += 1.4
    elif stype == "queue":
        score -= 2.2
    elif stype == "busy":
        score -= 1.2
    elif stype == "players":
        score += 1.2 if intents["sport"] else 0.2
    elif stype == "event":
        score += 1.2 if intents["event"] else 0.2

    if intents["queue"] and stype in ("free", "quiet"):
        score += 1.4
    if intents["quiet"] and kind in _QUIET_KINDS:
        score += 4.0
    if intents["coffee"]:
        score += 3.0 if kind == "cafe" else 0.0
    if intents["food"]:
        score += 4.0 if kind == "food" else (2.0 if kind == "cafe" else 0.0)
    if intents["sport"]:
        score += 4.0 if kind == "sport" else 0.0
    if intents["event"]:
        score += 4.0 if kind == "event" else 0.0
    if intents["rest"]:
        score += 3.0 if kind in ("rest", "cafe") else 0.0
    return score


def _pick(places: Sequence[Dict[str, Any]], intents: Dict[str, bool], exclude: Set[int]) -> Optional[Dict[str, Any]]:
    ranked = [p for p in places if p.get("id") not in exclude]
    if not ranked:
        return None
    return max(ranked, key=lambda p: (_score(p, intents), -(p.get("distanceM") or 0)))


def _pick_kind(
    places: Sequence[Dict[str, Any]], intents: Dict[str, bool], kinds: Set[str], exclude: Set[int]
) -> Optional[Dict[str, Any]]:
    filtered = [p for p in places if p.get("kind") in kinds and p.get("id") not in exclude]
    if not filtered:
        return None
    return max(filtered, key=lambda p: (float(p.get("rating") or 0) - _distance_km(p) * 0.5))


def _status_summary(place: Dict[str, Any]) -> str:
    status = place.get("status") or {}
    if not status:
        return domain.PLACE_KINDS.get(place.get("kind"), {}).get("label", "Место")
    label = domain.STATUS_TYPES.get(status.get("type"), {}).get("short", "статус")
    spots = status.get("spots")
    if spots and status.get("type") == "free":
        return f"{label} · {spots} мест"
    return label


def _travel_minutes(place: Dict[str, Any]) -> int:
    meters = place.get("distanceM")
    if meters is None:
        return 7
    return max(2, min(20, int(round(float(meters) / 80.0))))


def _focus_step(main: Dict[str, Any], intents: Dict[str, bool], minutes: Optional[int]) -> Dict[str, Any]:
    kind = main.get("kind")
    status = main.get("status") or {}
    status_text = status.get("text") or ""
    place_name = main.get("name") or "место"
    if intents["quiet"] or kind in _QUIET_KINDS:
        title = "Спокойная подготовка"
        detail = status_text or "Без очередей и шума"
        icon = "book"
    elif intents["sport"] or kind == "sport":
        title = "Начать игру"
        detail = status_text or "Соберите команду на месте"
        icon = "ball"
    elif intents["food"] or kind == "food":
        title = "Пообедать"
        detail = status_text or f"«{place_name}» · {main.get('rating')}★"
        icon = "food"
    elif intents["event"] or kind == "event":
        title = "Зайти на мероприятие"
        detail = status_text or f"«{place_name}»"
        icon = "sparkles"
    elif intents["coffee"] or kind == "cafe":
        title = "Спокойно посидеть с кофе"
        detail = status_text or f"«{place_name}» · {main.get('rating')}★"
        icon = "coffee"
    else:
        title = "Время на месте"
        detail = status_text or f"«{place_name}»"
        icon = "map"
    return {
        "time": "сейчас" if minutes is None else f"{minutes} мин",
        "title": title,
        "detail": detail,
        "placeId": main.get("id"),
        "icon": icon,
    }


_FOCUS_CAP_MINUTES = {
    "quiet": 180,
    "sport": 90,
    "event": 90,
    "food": 45,
    "coffee": 40,
    "rest": 40,
}


def _focus_cap(intents: Dict[str, bool]) -> int:
    for key in ("quiet", "sport", "event", "food", "coffee", "rest"):
        if intents.get(key):
            return _FOCUS_CAP_MINUTES[key]
    return 60


def answer_title(query: str) -> str:
    """Short, need-shaped heading for answers that are not timed plans."""
    intents = detect_intents(query)
    if intents["quiet"] and intents["coffee"]:
        return "Где спокойно посидеть с кофе"
    if intents["food"] and intents["coffee"]:
        return "Где поесть и взять кофе"
    if intents["food"]:
        return "Где поесть рядом"
    if intents["coffee"]:
        return "Где взять кофе"
    if intents["sport"]:
        return "Где поиграть сейчас"
    if intents["event"]:
        return "Куда пойти сегодня"
    if intents["quiet"]:
        return "Где спокойно позаниматься"
    if intents["rest"]:
        return "Где передохнуть"
    if intents["company"]:
        return "Кто ищет компанию"
    return "Что сейчас рядом"


def _alternative(
    main: Dict[str, Any], places: Sequence[Dict[str, Any]], intents: Dict[str, bool], exclude: Set[int]
) -> Optional[Dict[str, Any]]:
    """Second option for a need: another free spot of the same kind, no queue."""
    if intents["food"]:
        kinds = {"food", "cafe"}
    elif intents["coffee"]:
        kinds = {"cafe"}
    elif intents["rest"]:
        kinds = {"rest", "cafe"}
    else:
        return None
    candidates = [
        place
        for place in places
        if place.get("id") not in exclude
        and place.get("kind") in kinds
        and (place.get("status") or {}).get("type") != "queue"
    ]
    if not candidates:
        return None
    return max(candidates, key=lambda place: float(place.get("rating") or 0) - _distance_km(place) * 0.5)


def build_plan(
    query: str,
    places: Sequence[Dict[str, Any]],
    posts: Optional[Sequence[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    intents = detect_intents(query)
    budget = domain.parse_time_budget(query)
    mode = "plan" if budget is not None else "answer"
    places = list(places or [])
    posts = list(posts or [])

    main = _pick(places, intents, set())
    if main is None:
        return {
            "title": answer_title(query) if budget is None else f"Твой план на ближайшие {domain.human_duration(budget)}",
            "intro": "Сейчас нет live-статусов рядом.",
            "steps": [
                {
                    "time": "сейчас",
                    "title": "Открой карту кампуса",
                    "detail": "Свободных мест пока никто не отметил — создай первый статус и получи XP.",
                    "placeId": None,
                    "icon": "map",
                }
            ],
            "placeIds": [],
            "mode": mode,
            "source": "local",
        }

    steps: List[Dict[str, Any]] = []
    place_ids: List[int] = []
    walk = _travel_minutes(main)
    spent = walk

    steps.append(
        {
            "time": f"{walk} мин",
            "title": f"Дойти до «{main.get('name')}»",
            "detail": f"{domain.format_distance(main.get('distanceM'))} · {_status_summary(main)}".strip(" ·"),
            "placeId": main.get("id"),
            "icon": "walk",
        }
    )
    place_ids.append(main.get("id"))

    if intents["coffee"] and main.get("kind") != "cafe":
        cafe = _pick_kind(places, intents, {"cafe"}, set(place_ids))
        if cafe and _distance_km(cafe) <= 1.6:
            steps.append(
                {
                    "time": "По пути",
                    "title": "Взять кофе",
                    "detail": f"«{cafe.get('name')}» · {cafe.get('rating')}★ · {domain.format_distance(cafe.get('distanceM'))}".strip(" ·"),
                    "placeId": cafe.get("id"),
                    "icon": "coffee",
                }
            )
            place_ids.append(cafe.get("id"))
            spent += 5

    if mode == "plan":
        remaining = max(0, budget - spent)
        focus_minutes = min(remaining, _focus_cap(intents))
        if focus_minutes >= 5:
            steps.append(_focus_step(main, intents, focus_minutes))
        intro = "Собрал по live-статусам, рейтингу и расстоянию от тебя."
        title = f"Твой план на ближайшие {domain.human_duration(budget)}"
    else:
        steps.append(_focus_step(main, intents, None))
        if not (intents["company"] and posts) and len(steps) < 3:
            alt = _alternative(main, places, intents, set(place_ids))
            if alt is not None:
                steps.append(
                    {
                        "time": "или",
                        "title": f"«{alt.get('name')}»",
                        "detail": f"{_status_summary(alt)} · {domain.format_distance(alt.get('distanceM'))} · {alt.get('rating')}★".strip(" ·"),
                        "placeId": alt.get("id"),
                        "icon": "sparkles" if intents["rest"] else ("coffee" if alt.get("kind") == "cafe" else "food"),
                    }
                )
                place_ids.append(alt.get("id"))
        intro = "По live-статусам, рейтингу и расстоянию от тебя."
        title = answer_title(query)

    if intents["company"] and posts:
        steps.append(
            {
                "time": "В любой момент",
                "title": "Загляни в Pulse",
                "detail": f"{len(posts)} студентов рядом ищут компанию — отклик в один тап.",
                "placeId": None,
                "icon": "users",
            }
        )

    return {
        "title": title,
        "intro": intro,
        "steps": steps,
        "placeIds": place_ids,
        "mode": mode,
        "source": "local",
    }


def _looks_like_timed_plan(title: str, mode: str) -> bool:
    if mode != "answer":
        return False
    low = title.lower()
    return "ближайш" in low and ("час" in low or "план" in low)


def _clip(text: str, limit: int) -> str:
    text = text.strip()
    if len(text) <= limit:
        return text
    cut = text[: limit - 1]
    space = cut.rfind(" ")
    if space > limit * 0.6:
        cut = cut[:space]
    return cut.rstrip(" ,.;:—-") + "…"


def normalize_llm_plan(
    raw: Any, allowed_place_ids: Set[int], budget: Optional[int], query: str = ""
) -> Optional[Dict[str, Any]]:
    if not isinstance(raw, dict):
        return None
    raw_steps = raw.get("steps")
    if not isinstance(raw_steps, list) or not raw_steps:
        return None
    steps: List[Dict[str, Any]] = []
    place_ids: List[int] = []
    for item in raw_steps[:6]:
        if not isinstance(item, dict):
            continue
        title = str(item.get("title") or "").strip()
        detail = str(item.get("detail") or "").strip()
        when = str(item.get("time") or "").strip() or "сейчас"
        if not title:
            continue
        place_id = item.get("placeId", item.get("place_id"))
        if place_id is not None:
            try:
                place_id = int(place_id)
            except (TypeError, ValueError):
                continue
            if place_id not in allowed_place_ids:
                continue
        icon = str(item.get("icon") or "dot").strip()
        if icon not in ALLOWED_ICONS:
            icon = "dot"
        step = {
            "time": when,
            "title": _clip(title, 80),
            "detail": _clip(detail, 220),
            "placeId": place_id,
            "icon": icon,
        }
        steps.append(step)
        if place_id is not None and place_id not in place_ids:
            place_ids.append(place_id)
    if not steps:
        return None
    mode = "plan" if budget is not None else "answer"
    title = str(raw.get("title") or "").strip()
    if not title or _looks_like_timed_plan(title, mode):
        title = (
            f"Твой план на ближайшие {domain.human_duration(budget)}"
            if budget is not None
            else answer_title(query)
        )
    intro = str(raw.get("intro") or "").strip()
    return {
        "title": _clip(title, 90),
        "intro": _clip(intro, 220),
        "steps": steps,
        "placeIds": place_ids,
        "mode": mode,
        "source": "llm",
    }
