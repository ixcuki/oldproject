"""Domain rules for nearby: XP, levels, time and distance helpers."""
from __future__ import annotations

import math
import re
from typing import Any, Dict, List, Optional

CITY = "Саратов"
CAMPUS = "СГУ"

DEFAULT_EMOJI = "📍"

# ---------------------------------------------------------------------------
# Profanity filter
# ---------------------------------------------------------------------------

_PROFANITY = re.compile(
    r"(?:"
    # Russian mat (root forms, covers common inflections)
    r"х[уy]й|х[уy]ю|х[уy]я|хуёв|хуев|хуил|хуит|нахуй|захуй|похуй|пох[уy]|ёб(?:ан|ут|ать|аный|аная)|"
    r"еб(?:ан|ут|ать|аный|аная)|[её]б[её]т|[её]б[её]ш|[её]бал|[её]бла|[её]бну|заеб|наеб|пиздец|"
    r"пизд(?:а|у|ы|е|ой|ёж|ить|ит|ят|ят|ёт)|пизда|мудак|мудил|мудозв|"
    r"бля(?:дь|дская|дской)|бл[яь]|шлюх|шалав|"
    r"[её]б(?:ать|ут|ёт|и[тш]ь|ись|ал|ала|али|ан|ана|аны|аное)|"
    r"пидор|пидар|педик|гандон|залуп|"
    r"(?:с[у]ч[каеию]|сучь|сучар)|"
    # English profanity
    r"f+u+c+k|f+[u@]ck(?:ing|er|ers|ed)?|sh[i1!]t(?:ty|ter)?|"
    r"a+s+h+o+l+e?|b[i1!]tch(?:es)?|c[u@]nt|d[i1!]ck(?:s|head)?|"
    r"(?:mother)?fucker|pussy(?:ies)?|bastard|wh[o0]re"
    r")",
    re.IGNORECASE | re.UNICODE,
)


def contains_profanity(text: str) -> bool:
    """Return True when *text* contains a known profane word or root."""
    # Normalise common leet / lookalike substitutions before matching
    normalised = (
        text.lower()
        .replace("а", "a").replace("е", "e").replace("о", "o")
        .replace("у", "y").replace("х", "x").replace("3", "e")
        .replace("@", "a").replace("0", "o").replace("1", "i")
    )
    return bool(_PROFANITY.search(text) or _PROFANITY.search(normalised))

UNIVERSITIES: List[Dict[str, str]] = [
    {
        "short": "СГУ",
        "full": "СГУ им. Н. Г. Чернышевского",
        "name": "Саратовский национальный исследовательский государственный университет",
    }
]

FACULTIES: Dict[str, List[str]] = {
    "СГУ": [
        "КНиИТ",
        "Мехмат",
        "Физический",
        "Химический",
        "Биологический",
        "Географический",
        "Исторический",
        "Филологический",
        "Философский",
        "Экономический",
        "Юридический",
        "Социологический",
        "Психологический",
        "Институт искусств",
        "Педагогический",
    ]
}

XP_RULES: List[Dict[str, Any]] = [
    {"kind": "review", "points": 15, "label": "Полезный отзыв о месте"},
    {"kind": "status", "points": 10, "label": "Live-статус места"},
    {"kind": "post", "points": 10, "label": "Активность в Pulse"},
    {"kind": "respond", "points": 5, "label": "Отклик на запрос"},
]

XP = {rule["kind"]: rule["points"] for rule in XP_RULES}

LEVELS: List[Dict[str, Any]] = [
    {"name": "Новичок кампуса", "emoji": "🌱", "min": 0},
    {"name": "Исследователь", "emoji": "🧭", "min": 100},
    {"name": "Помощник сообщества", "emoji": "🤝", "min": 500},
    {"name": "Campus Legend", "emoji": "⚡", "min": 1000},
]

PLACE_KINDS: Dict[str, Dict[str, str]] = {
    "library": {"label": "Библиотека", "icon": "book"},
    "study": {"label": "Коворкинг", "icon": "laptop"},
    "cafe": {"label": "Кофейня", "icon": "coffee"},
    "food": {"label": "Столовая", "icon": "utensils"},
    "sport": {"label": "Спорт", "icon": "ball"},
    "event": {"label": "Событие", "icon": "sparkles"},
    "rest": {"label": "Отдых", "icon": "tree"},
}

STATUS_TYPES: Dict[str, Dict[str, str]] = {
    "free": {"label": "Есть свободные места", "short": "свободно", "tone": "green"},
    "quiet": {"label": "Тихо и спокойно", "short": "тихо", "tone": "green"},
    "queue": {"label": "Есть очередь", "short": "очередь", "tone": "orange"},
    "busy": {"label": "Всё занято", "short": "занято", "tone": "orange"},
    "players": {"label": "Ищут игроков", "short": "ищут игроков", "tone": "pink"},
    "event": {"label": "Здесь мероприятие", "short": "мероприятие", "tone": "purple"},
}

POST_CATEGORIES: Dict[str, Dict[str, str]] = {
    "activity": {"label": "Совместно", "hint": "Напарник, игра, обед, проект"},
    "exchange": {"label": "Обмен", "hint": "Вещь на время или насовсем"},
    "help": {"label": "Помощь", "hint": "Помочь с учёбой или бытом"},
}

STATUS_TTL_CHOICES = [30, 60, 120]
POST_TTL_HOURS = 6


def level_for(xp: int) -> Dict[str, Any]:
    xp = max(0, int(xp or 0))
    index = 0
    for i, level in enumerate(LEVELS):
        if xp >= level["min"]:
            index = i
    current = LEVELS[index]
    nxt = LEVELS[index + 1] if index + 1 < len(LEVELS) else None
    if nxt:
        span = nxt["min"] - current["min"]
        into = xp - current["min"]
        progress = into / span if span else 0.0
        to_next = nxt["min"] - xp
        next_min: Optional[int] = nxt["min"]
        next_name: Optional[str] = nxt["name"]
    else:
        span = None
        into = xp - current["min"]
        progress = 1.0
        to_next = 0
        next_min = None
        next_name = None
    return {
        "level": index + 1,
        "name": current["name"],
        "emoji": current["emoji"],
        "min": current["min"],
        "nextMin": next_min,
        "nextName": next_name,
        "span": span,
        "into": into,
        "toNext": to_next,
        "progress": round(progress, 4),
        "isMax": nxt is None,
    }


def haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> int:
    radius = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = p2 - p1
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return int(round(radius * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))))


def format_distance(meters: Optional[int]) -> str:
    if meters is None:
        return ""
    meters = max(0, int(meters))
    if meters < 1000:
        rounded = int(round(meters / 10.0) * 10)
        return f"{rounded} м"
    km = meters / 1000.0
    if km < 10:
        text = f"{km:.1f}".replace(".", ",")
        if text.endswith(",0"):
            text = text[:-2]
        return f"{text} км"
    return f"{int(round(km))} км"


def format_minutes_left(seconds: int) -> str:
    if seconds <= 0:
        return "истёк"
    if seconds < 60:
        return "<1 мин"
    minutes = seconds // 60
    if minutes < 60:
        return f"{minutes} мин"
    hours, rest = divmod(minutes, 60)
    if rest:
        return f"{hours} ч {rest} мин"
    return f"{hours} ч"


def plural(n: int, one: str, few: str, many: str) -> str:
    n = abs(int(n))
    if n % 10 == 1 and n % 100 != 11:
        return one
    if 2 <= n % 10 <= 4 and not 12 <= n % 100 <= 14:
        return few
    return many


_NUM_WORDS = {
    "один": 1,
    "одну": 1,
    "одна": 1,
    "два": 2,
    "две": 2,
    "пару": 2,
    "пара": 2,
    "три": 3,
    "четыре": 4,
    "пять": 5,
}


def parse_time_budget(text: str) -> Optional[int]:
    """Extract a time budget in minutes from free-form Russian text.

    Returns None when the student never mentioned time: a bare need
    ("хочу поесть") must be answered, not stretched into a timed plan.
    """
    q = (text or "").lower().replace("ё", "е")
    if "полтора час" in q:
        return 90
    if "полчас" in q:
        return 30
    if "час" in q:
        match = re.search(r"(\d+(?:[.,]\d+)?)\s*(?:час|ч\b)", q)
        if match:
            value = float(match.group(1).replace(",", "."))
            return _clamp_budget(int(round(value * 60)))
        for word, number in _NUM_WORDS.items():
            if re.search(r"\b" + word + r"\s+час", q):
                return number * 60
        if re.search(r"\bчас(?:а|ов)?\b", q):
            return 60
    match = re.search(r"(\d+)\s*мин", q)
    if match:
        return _clamp_budget(int(match.group(1)))
    return None


def _clamp_budget(minutes: int) -> int:
    return max(15, min(360, minutes))


def human_duration(minutes: int) -> str:
    minutes = max(0, int(minutes))
    if minutes and minutes % 60 == 0:
        hours = minutes // 60
        if hours == 1:
            return "час"
        return f"{hours} {plural(hours, 'час', 'часа', 'часов')}"
    return f"{minutes} {plural(minutes, 'минута', 'минуты', 'минут')}"


def now_ms() -> int:
    import time

    return int(time.time() * 1000)
