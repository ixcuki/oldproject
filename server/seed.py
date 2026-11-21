"""Demo data for the SSU campus. Safe to call once on an empty database."""
from __future__ import annotations

import sqlite3
import time
from typing import Dict, List

from . import auth, domain

MINUTE = 60 * 1000
HOUR = 60 * MINUTE
DAY = 24 * HOUR

USERS = [
    # username, first, last, faculty, telegram, xp
    ("ivan_p", "Иван", "Петров", "КНиИТ", "ivan_p", 320),
    ("anna_k", "Анна", "Козлова", "Мехмат", "anna_k", 780),
    ("dmitry_s", "Дмитрий", "Смирнов", "Физический", "dmitry_s", 980),
    ("maria_l", "Мария", "Лебедева", "Психологический", "maria_l", 870),
    ("olga_m", "Ольга", "Морозова", "Филологический", "olga_m", 1420),
    ("artem_v", "Артём", "Волков", "КНиИТ", "artem_v", 980),
    ("ksenia_r", "Ксения", "Романова", "Экономический", "ksenia_r", 610),
    ("pavel_n", "Павел", "Никитин", "Физический", "pavel_n", 210),
    ("sofia_b", "София", "Белова", "Институт искусств", "sofia_b", 150),
    ("egor_t", "Егор", "Тимофеев", "Мехмат", "egor_t", 60),
]

PLACES = [
    # name, kind, address, description, lat, lng
    (
        "Научная библиотека СГУ",
        "library",
        "Университетская, 42",
        "Тихие читальные залы, розетки у каждого стола, Wi-Fi и фонды на любой факультет.",
        51.5396339,
        46.0061185,
    ),
    (
        "Кофейня «Кофе и конспекты»",
        "cafe",
        "Астраханская, 84",
        "Кофе с собой, тихий стол у окна и десерты для долгих сессий.",
        51.54035,
        46.00785,
    ),
    (
        "Столовая СГУ",
        "food",
        "Астраханская, 83, корпус 5",
        "Комплексные обеды, оплата по студенческой карте.",
        51.53875,
        46.00935,
    ),
    (
        "Спортплощадка у 5 корпуса",
        "sport",
        "Университетская, 42",
        "Открытая площадка с кольцами и разметкой, вечером включают свет.",
        51.53775,
        46.0107,
    ),
    (
        "Коворкинг «Точка кипения» СГУ",
        "study",
        "Астраханская, 83",
        "Проектные столы, маркерные доски, розетки и тихая переговорка.",
        51.53865,
        46.0069,
    ),
    (
        "Читальный зал корпуса 8",
        "library",
        "Университетская, 42, корпус 8",
        "Компактный зал для подготовки к семинарам, обычно свободен днём.",
        51.5383,
        46.0046,
    ),
    (
        "Кофейня «Лаборатория кофе»",
        "cafe",
        "Московская, 66",
        "Альтернатива, фильтр и большой стол для ноутбуков.",
        51.5359,
        46.0102,
    ),
    (
        "Актовый зал СГУ",
        "event",
        "Астраханская, 83",
        "Студенческие концерты, открытые микрофоны и встречи клубов.",
        51.53915,
        46.00935,
    ),
    (
        "Сквер у 10 корпуса",
        "rest",
        "Университетская, 42",
        "Скамейки в тени и тихий уголок между парами.",
        51.5363,
        46.0064,
    ),
    (
        "Спортзал СГУ",
        "sport",
        "Университетская, 42, корпус 10",
        "Зал для игровых секций и тренировок по расписанию.",
        51.5349,
        46.0076,
    ),
    (
        "Кофейня на Московской",
        "cafe",
        "Московская, 60",
        "Быстрый кофе по пути от трамвая, есть Wi-Fi.",
        51.5332,
        46.0111,
    ),
    (
        "Библиотека корпуса 10",
        "library",
        "Университетская, 42, корпус 10",
        "Небольшой абонемент и пара тихих столов у окна.",
        51.5365,
        46.0058,
    ),
    (
        "Кофейня «10А» в 12 корпусе",
        "cafe",
        "Вольская, 10А, холл 1 этажа",
        "Кофе с собой, пара столиков у окна и розетки.",
        51.52322,
        46.01958,
    ),
    (
        "Коворкинг «Точка кипения» · 12 корпус",
        "study",
        "Вольская, 10А, 2 этаж",
        "Проектные столы, маркерная доска и тихая переговорка для команд.",
        51.5233,
        46.02005,
    ),
    (
        "Читальный зал 12 корпуса",
        "library",
        "Вольская, 10А, 3 этаж",
        "Тихие места у окон и розетки — удобно готовиться между парами.",
        51.52313,
        46.02002,
    ),
    (
        "Спортплощадка у 12 корпуса",
        "sport",
        "Вольская, 10А, двор",
        "Кольца, разметка и освещение до вечера.",
        51.52295,
        46.0202,
    ),
    (
        "Настольный теннис в 12 корпусе",
        "sport",
        "Вольская, 10А, 1 этаж",
        "Два стола и ракетки на вахте — играют на переменах.",
        51.52316,
        46.01986,
    ),
    (
        "Лекторий 12 корпуса",
        "event",
        "Вольская, 10А, 2 этаж",
        "Встречи клубов, открытые лекции и хакатоны КНиИТ.",
        51.52326,
        46.01984,
    ),
    (
        "Зона отдыха в 12 корпусе",
        "rest",
        "Вольская, 10А, холл 1 этажа",
        "Диваны, кулер и тихий уголок между парами.",
        51.52306,
        46.01993,
    ),
    (
        "Кафе «Помидор»",
        "cafe",
        "Белоглинская, 17",
        "Студенческое кафе в пяти минутах от 12 корпуса: бизнес-ланчи, паста и кофе, почти всегда есть свободные столики.",
        51.522675,
        46.020090,
    ),
    (
        "Кафе «Фьюжн»",
        "cafe",
        "Белоглинская, 15",
        "Суши-бар и пиццерия рядом с 12 корпусом, работает до 22:30 — удобно после вечерних пар.",
        51.522451,
        46.021078,
    ),
]

REVIEWS = [
    # username, place index (1-based), rating, comment, minutes ago
    ("anna_k", 1, 5, "Тихо, розетки у каждого стола. Лучшее место для подготовки к экзамену.", 2 * DAY // MINUTE),
    ("dmitry_s", 1, 4, "После обеда становится людно, лучше приходить с утра.", DAY // MINUTE),
    ("olga_m", 1, 5, "На втором этаже у окон вообще идеально — никто не ходит.", 3 * 60),
    ("ivan_p", 1, 5, "Брал ноутбук, всё летает. Зарядка рядом с каждым местом.", 5 * 60),
    ("maria_l", 2, 5, "Латте вкусный, есть розетки и тихий стол у окна.", 4 * 60),
    ("ksenia_r", 2, 4, "Утром очередь, но после 11 свободно.", 2 * DAY // MINUTE),
    ("pavel_n", 5, 5, "Хороший вайб для проектной работы, есть маркерная доска.", DAY // MINUTE),
    ("artem_v", 5, 5, "Собираемся здесь на Python, места хватает.", 6 * 60),
    ("egor_t", 3, 3, "Вкусно и дёшево, но в обед очередь минут на пять.", DAY // MINUTE),
    ("sofia_b", 4, 5, "Вечером на площадке свободно, освещение нормальное.", 2 * DAY // MINUTE),
    ("olga_m", 8, 5, "Была на открытом микрофоне — атмосфера огонь.", 5 * DAY // MINUTE),
    ("dmitry_s", 10, 4, "Тренажёрный зал небольшой, но после пар пусто.", 4 * DAY // MINUTE),
    ("ivan_p", 7, 4, "Взял капучино и поработал час, музыка не мешает.", 3 * 60),
    ("maria_l", 9, 4, "Хорошо посидеть на скамейке между парами.", 2 * DAY // MINUTE),
    ("anna_k", 9, 5, "Утром тут тихо, можно почитать перед семинаром.", 6 * DAY // MINUTE),
    # Кофейня «10А» в 12 корпусе → index 13
    ("ivan_p", 13, 5, "Взял капучино между парами — быстро и рядом.", 3 * 60),
    ("olga_m", 13, 4, "Хороший флэт уайт, но столиков мало — часто всё занято.", 2 * DAY // MINUTE),
    ("pavel_n", 13, 5, "Розетки у окна, тихо, можно закрыть хвосты по учёбе.", 90),
    # Коворкинг «Точка кипения» 12 → index 14
    ("artem_v", 14, 5, "В «Точке кипения» удобно собираться командой над проектом.", DAY // MINUTE),
    ("ksenia_r", 14, 5, "Маркерная доска и проектор — защитили проект команды прямо здесь.", 2 * DAY // MINUTE),
    ("anna_k", 14, 4, "Иногда шумно из-за встреч, но для командной работы идеально.", 5 * 60),
    # Читальный зал 12 → index 15
    ("olga_m", 15, 5, "Тихо, у окна реально можно писать конспект.", 4 * 60),
    ("dmitry_s", 15, 4, "Места у окон разбирают, но в глубине зала всегда тихо.", 3 * DAY // MINUTE),
    ("egor_t", 15, 5, "Лучшее место в 12 корпусе, чтобы доделать лабу.", DAY // MINUTE),
    # Спортплощадка у 12 → index 16
    ("egor_t", 16, 4, "Площадка небольшая, но вечером свободно.", 2 * DAY // MINUTE),
    ("artem_v", 16, 5, "Вечером собираемся на баскетбол, свет горит до 21:00.", DAY // MINUTE),
    ("ivan_p", 16, 3, "Кольца нормальные, но после дождя лужи стоят долго.", 4 * DAY // MINUTE),
    # Настольный теннис → index 17
    ("dmitry_s", 17, 4, "Столы свободны почти всегда, ракетки дают на вахте.", 6 * 60),
    ("ksenia_r", 17, 5, "Ракетки выдают на вахте, пара столов почти всегда свободна.", 2 * DAY // MINUTE),
    ("maria_l", 17, 4, "Играем на переменах, иногда приходится ждать стол.", 5 * 60),
    # Лекторий 12 → index 18
    ("sofia_b", 18, 5, "Была на встрече клуба — атмосфера дружелюбная.", 3 * DAY // MINUTE),
    ("anna_k", 18, 5, "Ходила на открытую лекцию по ML — полезно и бесплатно.", DAY // MINUTE),
    ("artem_v", 18, 4, "Хакатон был здесь: розеток хватает, Wi-Fi тянет.", 4 * DAY // MINUTE),
    # Зона отдыха 12 → index 19
    ("olga_m", 19, 5, "Тихий уголок, кулер рядом — можно выдохнуть между парами.", 3 * 60),
    ("maria_l", 19, 3, "Диваны удобные, но в перерыв между парами шумно.", 2 * DAY // MINUTE),
    ("pavel_n", 19, 4, "Можно переждать окно на диване, никто не гонит.", DAY // MINUTE),
    # Кафе «Помидор» → index 20
    ("anna_k", 20, 5, "Паста отличная, бизнес-ланч за 350 — сытно и быстро, пять минут от корпуса.", 3 * 60),
    ("dmitry_s", 20, 4, "Уютно, столики у окна почти всегда свободны в будни.", 2 * DAY // MINUTE),
    ("maria_l", 20, 5, "Лучшее место рядом с 12 корпусом пообедать нормально.", DAY // MINUTE),
    # Кафе «Фьюжн» → index 21
    ("ksenia_r", 21, 5, "Роллы свежие, порция большая, цена студенческая — хожу сюда после пар.", 4 * 60),
    ("artem_v", 21, 4, "Пицца и суши в одном месте, работает до 22:30 — удобно после вечерних.", 2 * DAY // MINUTE),
    ("egor_t", 21, 4, "До закрытия успеваю забежать после пар на Белоглинской.", 5 * 60),
]

STATUSES = [
    # username, place index, type, text, spots, ttl, minutes ago
    ("anna_k", 1, "free", "Есть места у окон, 2 этаж", 14, 60, 12),
    ("pavel_n", 2, "quiet", "Тихо, свободный столик у окна", None, 60, 25),
    ("dmitry_s", 3, "queue", "Очередь на раздаче, минут на пять", None, 45, 20),
    ("artem_v", 4, "players", "Ищем 2 человека на баскетбол к 18:00", 2, 90, 20),
    ("ksenia_r", 5, "free", "Свободны 6 мест у розеток", 6, 60, 5),
    ("olga_m", 8, "event", "Открытый микрофон, начало в 18:30", None, 120, 30),
    ("maria_l", 7, "free", "Свободный столик у окна", 1, 45, 15),
    ("egor_t", 9, "quiet", "Тихо, можно почитать", None, 60, 20),
    # Кофейня «10А» → 13
    ("maria_l", 13, "quiet", "Тихо, свободный столик у окна", None, 60, 18),
    # Коворкинг «Точка кипения» 12 → 14
    ("artem_v", 14, "free", "Свободны 4 места у розеток", 4, 60, 8),
    # Читальный зал 12 → 15
    ("egor_t", 15, "quiet", "Тихо, есть места у окон", None, 60, 22),
    # Спортплощадка у 12 → 16
    ("sofia_b", 16, "players", "Ищем 2 человека на баскетбол к 18:00", 2, 90, 15),
    # Лекторий 12 → 18
    ("olga_m", 18, "event", "Встреча клуба программистов в 18:30", None, 120, 25),
    # Зона отдыха 12 → 19
    ("ivan_p", 19, "free", "Свободный диван в холле", None, 45, 5),
    # Кафе «Помидор» → 20
    ("anna_k", 20, "quiet", "Свободные столики у окна, обед без очереди", None, 60, 10),
    # Кафе «Фьюжн» → 21
    ("ksenia_r", 21, "free", "Есть места, роллы подают быстро", 4, 60, 15),
]

POSTS = [
    # username, category, text, place index or None, minutes ago
    ("anna_k", "activity", "Ищу напарника для подготовки к матанализу", 1, 8),
    ("dmitry_s", "activity", "Нужны 2 человека для баскетбола на 18:00", 4, 14),
    ("maria_l", "exchange", "У кого есть зарядка USB-C на пару часов?", 5, 22),
    ("pavel_n", "help", "Могу помочь с Python, нужна помощь с английским", 5, 35),
    ("olga_m", "exchange", "Отдам учебник по философии после экзамена", 1, 50),
    ("ksenia_r", "activity", "Кто хочет пообедать в столовой?", 3, 6),
    ("egor_t", "help", "Нужен калькулятор на сегодня, верну вечером", 10, 65),
    ("sofia_b", "activity", "Собираемся делать проект на Python, нужен дизайнер", 5, 120),
]

RESPONSES = [
    # post index (1-based), username
    (1, "ivan_p"),
    (6, "ivan_p"),
    (6, "artem_v"),
    (4, "olga_m"),
    (3, "pavel_n"),
]


def seed(conn: sqlite3.Connection, now: int | None = None) -> bool:
    now = now or int(time.time() * 1000)
    if conn.execute("SELECT COUNT(*) AS c FROM users").fetchone()["c"]:
        return False

    user_ids: Dict[str, int] = {}
    for index, (username, first, last, faculty, telegram, xp) in enumerate(USERS):
        hashed = auth.hash_password("secret123")
        cursor = conn.execute(
            """
            INSERT INTO users (username, password_hash, salt, first_name, last_name,
                               university, faculty, telegram, avatar, xp, created_at)
            VALUES (?, ?, ?, ?, ?, 'СГУ', ?, ?, NULL, ?, ?)
            """,
            (
                username,
                hashed["hash"],
                hashed["salt"],
                first,
                last,
                faculty,
                telegram,
                xp,
                now - (len(USERS) - index) * DAY,
            ),
        )
        user_ids[username] = int(cursor.lastrowid)

    place_ids: List[int] = []
    for name, kind, address, description, lat, lng in PLACES:
        cursor = conn.execute(
            """
            INSERT INTO places (name, kind, description, university, address, lat, lng, created_at)
            VALUES (?, ?, ?, 'СГУ', ?, ?, ?, ?)
            """,
            (name, kind, description, address, lat, lng, now - 30 * DAY),
        )
        place_ids.append(int(cursor.lastrowid))

    for username, place_idx, rating, comment, minutes_ago in REVIEWS:
        conn.execute(
            """
            INSERT INTO reviews (place_id, user_id, rating, comment, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                place_ids[place_idx - 1],
                user_ids[username],
                rating,
                comment,
                now - minutes_ago * MINUTE,
            ),
        )

    for username, place_idx, stype, text, spots, ttl, minutes_ago in STATUSES:
        conn.execute(
            """
            INSERT INTO statuses (place_id, user_id, type, text, spots, ttl_minutes, created_at, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                place_ids[place_idx - 1],
                user_ids[username],
                stype,
                text,
                spots,
                ttl,
                now - minutes_ago * MINUTE,
                now - minutes_ago * MINUTE + ttl * MINUTE,
            ),
        )

    # an expired status proves that TTL cleanup works and is not returned by the API
    conn.execute(
        """
        INSERT INTO statuses (place_id, user_id, type, text, spots, ttl_minutes, created_at, expires_at)
        VALUES (?, ?, 'busy', 'Зал занят секцией', NULL, 30, ?, ?)
        """,
        (place_ids[9], user_ids["sofia_b"], now - 40 * MINUTE, now - 10 * MINUTE),
    )

    post_ids: List[int] = []
    for username, category, text, place_idx, minutes_ago in POSTS:
        cursor = conn.execute(
            """
            INSERT INTO posts (user_id, category, text, place_id, created_at, expires_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                user_ids[username],
                category,
                text,
                place_ids[place_idx - 1] if place_idx else None,
                now - minutes_ago * MINUTE,
                now - minutes_ago * MINUTE + domain.POST_TTL_HOURS * HOUR,
            ),
        )
        post_ids.append(int(cursor.lastrowid))

    # expired post (7 hours old)
    conn.execute(
        """
        INSERT INTO posts (user_id, category, text, place_id, created_at, expires_at)
        VALUES (?, 'activity', 'Кто идёт на лекцию по философии?', ?, ?, ?)
        """,
        (user_ids["egor_t"], place_ids[0], now - 7 * HOUR, now - HOUR),
    )

    for post_idx, username in RESPONSES:
        conn.execute(
            "INSERT INTO responses (post_id, user_id, created_at) VALUES (?, ?, ?)",
            (post_ids[post_idx - 1], user_ids[username], now - 30 * MINUTE),
        )

    for kind, points in (("review", 15), ("status", 10), ("respond", 5)):
        conn.execute(
            "INSERT INTO xp_events (user_id, kind, points, created_at) VALUES (?, ?, ?, ?)",
            (user_ids["ivan_p"], kind, points, now - HOUR),
        )
    return True


def ensure_places(conn: sqlite3.Connection, now: int | None = None) -> int:
    """Insert demo places that are missing from an existing database."""
    now = now or int(time.time() * 1000)
    existing = {row["name"] for row in conn.execute("SELECT name FROM places")}
    inserted = 0
    for name, kind, address, description, lat, lng in PLACES:
        if name in existing:
            continue
        conn.execute(
            """
            INSERT INTO places (name, kind, description, university, address, lat, lng, created_at)
            VALUES (?, ?, ?, 'СГУ', ?, ?, ?, ?)
            """,
            (name, kind, description, address, lat, lng, now - 30 * DAY),
        )
        inserted += 1
    return inserted


def refresh_demo(conn: sqlite3.Connection, now: int | None = None) -> int:
    """Keep the demo campus alive after a server restart without touching user content."""
    now = now or int(time.time() * 1000)
    updated = 0
    place_by_name = {row["name"]: row["id"] for row in conn.execute("SELECT id, name FROM places")}
    user_by_name = {row["username"]: row["id"] for row in conn.execute("SELECT id, username FROM users")}
    for username, place_idx, rating, comment, minutes_ago in REVIEWS:
        place_id = place_by_name.get(PLACES[place_idx - 1][0])
        user_id = user_by_name.get(username)
        if not place_id or not user_id:
            continue
        known = conn.execute(
            "SELECT 1 FROM reviews WHERE place_id = ? AND user_id = ? AND comment = ?",
            (place_id, user_id, comment),
        ).fetchone()
        if not known:
            conn.execute(
                """
                INSERT OR IGNORE INTO reviews (place_id, user_id, rating, comment, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (place_id, user_id, rating, comment, now - minutes_ago * MINUTE),
            )
            updated += 1
    for username, place_idx, stype, text, spots, ttl, minutes_ago in STATUSES:
        place_id = place_by_name.get(PLACES[place_idx - 1][0])
        user_id = user_by_name.get(username)
        if not place_id or not user_id:
            continue
        created = now - minutes_ago * MINUTE
        known = conn.execute(
            "SELECT 1 FROM statuses WHERE user_id = ? AND place_id = ? AND text = ? AND type = ?",
            (user_id, place_id, text, stype),
        ).fetchone()
        if not known:
            conn.execute(
                """
                INSERT INTO statuses (place_id, user_id, type, text, spots, ttl_minutes, created_at, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (place_id, user_id, stype, text, spots, ttl, created, created + ttl * MINUTE),
            )
            updated += 1
            continue
        cursor = conn.execute(
            """
            UPDATE statuses SET created_at = ?, expires_at = ?
            WHERE user_id = ? AND place_id = ? AND text = ? AND type = ?
            """,
            (created, created + ttl * MINUTE, user_id, place_id, text, stype),
        )
        updated += cursor.rowcount
    for username, category, text, place_idx, minutes_ago in POSTS:
        user_id = user_by_name.get(username)
        if not user_id:
            continue
        created = now - minutes_ago * MINUTE
        cursor = conn.execute(
            "UPDATE posts SET created_at = ?, expires_at = ? WHERE user_id = ? AND text = ?",
            (created, created + domain.POST_TTL_HOURS * HOUR, user_id, text),
        )
        updated += cursor.rowcount
    return updated
