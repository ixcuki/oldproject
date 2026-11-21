"""nearby REST API and static frontend host."""
from __future__ import annotations

import os
import sqlite3
import time
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

from . import auth, db, domain, llm, planner, seed

BASE_DIR = Path(__file__).resolve().parent.parent
MINUTE = 60 * 1000
HOUR = 60 * MINUTE
STATUS_XP_WINDOW = 10 * MINUTE


class RegisterIn(BaseModel):
    username: str = ""
    password: str = ""
    firstName: str = ""
    lastName: str = ""
    university: str = domain.CAMPUS
    faculty: str = ""
    telegram: str = ""
    avatar: Optional[str] = None


class LoginIn(BaseModel):
    username: str = ""
    password: str = ""


class ProfileIn(BaseModel):
    firstName: str = ""
    lastName: str = ""
    faculty: str = ""
    telegram: str = ""
    github: str = ""
    maxsite: str = ""
    emoji: str = ""
    avatar: Optional[str] = None


class ReviewIn(BaseModel):
    rating: int = 0
    comment: str = ""


class StatusIn(BaseModel):
    type: str = ""
    text: str = ""
    spots: Optional[int] = None
    ttlMinutes: int = 60


class PostIn(BaseModel):
    category: str = ""
    text: str = ""
    placeId: Optional[int] = None


class AIIn(BaseModel):
    query: str = ""
    lat: Optional[float] = None
    lng: Optional[float] = None


def _now() -> int:
    return int(time.time() * 1000)


def _conn(request: Request) -> Iterator[sqlite3.Connection]:
    conn = db.connect(request.app.state.db_path)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def _token(request: Request) -> str:
    header = request.headers.get("authorization", "")
    if header.lower().startswith("bearer "):
        return header[7:].strip()
    return ""


def _current_user(request: Request, conn: sqlite3.Connection = Depends(_conn)) -> sqlite3.Row:
    user = auth.user_from_token(conn, _token(request))
    if not user:
        raise HTTPException(status_code=401, detail="Нужно войти в аккаунт")
    return user


def _num(value: Any) -> Optional[float]:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _distance(place: Dict[str, Any], lat: Optional[float], lng: Optional[float]) -> Optional[int]:
    if lat is None or lng is None:
        return None
    return domain.haversine_m(lat, lng, place["lat"], place["lng"])


def _user_mini(row: sqlite3.Row) -> Dict[str, Any]:
    first = row["first_name"]
    last = row["last_name"]
    keys = row.keys()
    xp = int(row["xp"]) if "xp" in keys else 0
    level = domain.level_for(xp)["level"]
    return {
        "id": row["user_id"] if "user_id" in keys else row["id"],
        "username": row["username"],
        "firstName": first,
        "lastName": last,
        "name": f"{first} {last}".strip(),
        "university": row["university"],
        "faculty": row["faculty"],
        "avatar": row["avatar"],
        "emoji": (row["emoji"] if "emoji" in keys else "") or domain.DEFAULT_EMOJI,
        "level": level,
        "levelNum": level,
    }


def _level_short(xp: int) -> Dict[str, Any]:
    level = domain.level_for(xp)
    return {"level": level["level"], "name": level["name"], "emoji": level["emoji"]}


def _counts(conn: sqlite3.Connection, user_id: int) -> Dict[str, int]:
    def count(sql: str) -> int:
        return int(conn.execute(sql, (user_id,)).fetchone()[0])

    return {
        "reviews": count("SELECT COUNT(*) FROM reviews WHERE user_id = ?"),
        "statuses": count("SELECT COUNT(*) FROM statuses WHERE user_id = ?"),
        "posts": count("SELECT COUNT(*) FROM posts WHERE user_id = ?"),
        "responses": count("SELECT COUNT(*) FROM responses WHERE user_id = ?"),
        "places": count("SELECT COUNT(DISTINCT place_id) FROM statuses WHERE user_id = ?"),
    }


def _achievements(counts: Dict[str, int], xp: int) -> List[Dict[str, Any]]:
    return [
        {
            "id": "review",
            "title": "Первый отзыв",
            "hint": "Оцени место в кампусе",
            "icon": "star",
            "unlocked": counts["reviews"] > 0,
            "progress": min(1.0, counts["reviews"] / 3),
        },
        {
            "id": "status",
            "title": "Живой пульс",
            "hint": "Обнови live-статус",
            "icon": "radio",
            "unlocked": counts["statuses"] > 0,
            "progress": min(1.0, counts["statuses"] / 3),
        },
        {
            "id": "help",
            "title": "Помощь рядом",
            "hint": "Откликнись на запрос",
            "icon": "heart",
            "unlocked": counts["responses"] > 0,
            "progress": min(1.0, counts["responses"] / 3),
        },
        {
            "id": "pulse",
            "title": "Своя активность",
            "hint": "Опубликуй запрос в Pulse",
            "icon": "megaphone",
            "unlocked": counts["posts"] > 0,
            "progress": min(1.0, counts["posts"] / 2),
        },
        {
            "id": "legend",
            "title": "Campus Legend",
            "hint": "Набери 1000 XP",
            "icon": "zap",
            "unlocked": xp >= 1000,
            "progress": min(1.0, xp / 1000),
        },
    ]


def _me(conn: sqlite3.Connection, user_id: int) -> Dict[str, Any]:
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="Аккаунт не найден")
    counts = _counts(conn, user_id)
    payload = _user_mini(row)
    payload.update(
        {
            "telegram": row["telegram"],
            "github": row["github"] if "github" in row.keys() else "",
            "maxsite": row["maxsite"] if "maxsite" in row.keys() else "",
            "emoji": (row["emoji"] if "emoji" in row.keys() else "") or domain.DEFAULT_EMOJI,
            "xp": row["xp"],
            "level": domain.level_for(row["xp"]),
            "levelShort": _level_short(row["xp"]),
            "counts": counts,
            "achievements": _achievements(counts, row["xp"]),
            "createdAt": row["created_at"],
            "city": domain.CITY,
        }
    )
    return payload


def _add_xp(conn: sqlite3.Connection, user_id: int, kind: str, points: Optional[int] = None) -> int:
    amount = int(points if points is not None else domain.XP[kind])
    conn.execute(
        "INSERT INTO xp_events (user_id, kind, points, created_at) VALUES (?, ?, ?, ?)",
        (user_id, kind, amount, _now()),
    )
    conn.execute("UPDATE users SET xp = xp + ? WHERE id = ?", (amount, user_id))
    row = conn.execute("SELECT xp FROM users WHERE id = ?", (user_id,)).fetchone()
    return int(row["xp"]) if row else 0


def _status_payload(row: sqlite3.Row, now: int) -> Dict[str, Any]:
    meta = domain.STATUS_TYPES.get(row["type"], {})
    seconds_left = max(0, (row["expires_at"] - now) // 1000)
    return {
        "id": row["id"],
        "placeId": row["place_id"],
        "type": row["type"],
        "typeLabel": meta.get("label", row["type"]),
        "tone": meta.get("tone", "green"),
        "text": row["text"],
        "spots": row["spots"],
        "createdAt": row["created_at"],
        "expiresAt": row["expires_at"],
        "ttlMinutes": row["ttl_minutes"],
        "secondsLeft": seconds_left,
        "minutesLeft": domain.format_minutes_left(seconds_left),
        "author": _user_mini(row),
    }


def _latest_statuses(conn: sqlite3.Connection, now: int) -> Dict[int, sqlite3.Row]:
    rows = conn.execute(
        """
        SELECT s.*, u.id AS user_id, u.first_name, u.last_name, u.username,
               u.university, u.faculty, u.avatar, u.xp,
               COALESCE(u.emoji, '') AS emoji
        FROM statuses s
        JOIN users u ON u.id = s.user_id
        JOIN (
            SELECT place_id, MAX(id) AS mid FROM statuses
            WHERE expires_at > ? GROUP BY place_id
        ) t ON t.mid = s.id
        """,
        (now,),
    ).fetchall()
    return {int(row["place_id"]): row for row in rows}


def _places(
    conn: sqlite3.Connection,
    now: int,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
) -> List[Dict[str, Any]]:
    rows = conn.execute(
        """
        SELECT p.*, COALESCE(AVG(r.rating), 0) AS avg_rating, COUNT(r.id) AS review_count
        FROM places p LEFT JOIN reviews r ON r.place_id = p.id
        GROUP BY p.id
        ORDER BY p.id
        """
    ).fetchall()
    statuses = _latest_statuses(conn, now)
    result = []
    for row in rows:
        status = statuses.get(int(row["id"]))
        place = {
            "id": row["id"],
            "name": row["name"],
            "kind": row["kind"],
            "kindLabel": domain.PLACE_KINDS.get(row["kind"], {}).get("label", row["kind"]),
            "kindIcon": domain.PLACE_KINDS.get(row["kind"], {}).get("icon", "map"),
            "description": row["description"],
            "address": row["address"],
            "university": row["university"],
            "lat": row["lat"],
            "lng": row["lng"],
            "rating": round(float(row["avg_rating"]), 1) if row["review_count"] else None,
            "reviewCount": int(row["review_count"]),
            "status": _status_payload(status, now) if status else None,
            "distanceM": None,
        }
        place["distanceM"] = _distance(place, lat, lng)
        result.append(place)
    return result


def _post_row(conn: sqlite3.Connection, post_id: int, me_id: int) -> Optional[sqlite3.Row]:
    return conn.execute(
        """
        SELECT po.*, u.first_name, u.last_name, u.username, u.university, u.faculty, u.avatar,
               u.xp, COALESCE(u.emoji, '') AS emoji,
               pl.name AS place_name, pl.lat AS place_lat, pl.lng AS place_lng,
               pl.kind AS place_kind,
               (SELECT COUNT(*) FROM responses r WHERE r.post_id = po.id) AS responders,
               EXISTS(SELECT 1 FROM responses r WHERE r.post_id = po.id AND r.user_id = ?) AS responded
        FROM posts po
        JOIN users u ON u.id = po.user_id
        LEFT JOIN places pl ON pl.id = po.place_id
        WHERE po.id = ?
        """,
        (me_id, post_id),
    ).fetchone()


def _post_payload(
    row: sqlite3.Row,
    now: int,
    me_id: int,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
) -> Dict[str, Any]:
    seconds_left = max(0, (row["expires_at"] - now) // 1000)
    distance = None
    if lat is not None and lng is not None and row["place_lat"] is not None:
        distance = domain.haversine_m(lat, lng, row["place_lat"], row["place_lng"])
    return {
        "id": row["id"],
        "category": row["category"],
        "categoryLabel": domain.POST_CATEGORIES.get(row["category"], {}).get("label", row["category"]),
        "text": row["text"],
        "createdAt": row["created_at"],
        "expiresAt": row["expires_at"],
        "secondsLeft": seconds_left,
        "minutesLeft": domain.format_minutes_left(seconds_left),
        "author": _user_mini(row),
        "place": (
            {
                "id": row["place_id"],
                "name": row["place_name"],
                "kind": row["place_kind"],
                "kindLabel": domain.PLACE_KINDS.get(row["place_kind"], {}).get("label", ""),
            }
            if row["place_id"]
            else None
        ),
        "responders": int(row["responders"] or 0),
        "responded": bool(row["responded"]),
        "isMine": row["user_id"] == me_id,
        "distanceM": distance,
    }


def _posts(
    conn: sqlite3.Connection,
    now: int,
    me_id: int,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    category: Optional[str] = None,
    limit: int = 50,
) -> List[Dict[str, Any]]:
    sql = """
        SELECT po.*, u.first_name, u.last_name, u.username, u.university, u.faculty, u.avatar,
               u.xp, COALESCE(u.emoji, '') AS emoji,
               pl.name AS place_name, pl.lat AS place_lat, pl.lng AS place_lng,
               pl.kind AS place_kind,
               (SELECT COUNT(*) FROM responses r WHERE r.post_id = po.id) AS responders,
               EXISTS(SELECT 1 FROM responses r WHERE r.post_id = po.id AND r.user_id = ?) AS responded
        FROM posts po
        JOIN users u ON u.id = po.user_id
        LEFT JOIN places pl ON pl.id = po.place_id
        WHERE po.expires_at > ?
    """
    params: List[Any] = [me_id, now]
    if category:
        sql += " AND po.category = ?"
        params.append(category)
    sql += " ORDER BY po.created_at DESC LIMIT ?"
    params.append(max(1, min(100, limit)))
    rows = conn.execute(sql, tuple(params)).fetchall()
    return [_post_payload(row, now, me_id, lat, lng) for row in rows]


def _leaderboard(
    conn: sqlite3.Connection, me_id: int, university: Optional[str] = None, limit: int = 20
) -> Dict[str, Any]:
    sql = "SELECT * FROM users"
    params: List[Any] = []
    if university:
        sql += " WHERE university = ?"
        params.append(university)
    sql += " ORDER BY xp DESC, created_at ASC"
    rows = conn.execute(sql, tuple(params)).fetchall()
    entries = []
    for index, row in enumerate(rows):
        entries.append(
            {
                "rank": index + 1,
                "user": _user_mini(row),
                "xp": row["xp"],
                "level": _level_short(row["xp"]),
                "isMe": row["id"] == me_id,
            }
        )
    me_entry = next((entry for entry in entries if entry["isMe"]), None)
    return {"entries": entries[:limit], "me": me_entry, "total": len(entries), "university": university}


def _meta() -> Dict[str, Any]:
    return {
        "city": domain.CITY,
        "campus": domain.CAMPUS,
        "universities": domain.UNIVERSITIES,
        "faculties": domain.FACULTIES,
        "placeKinds": domain.PLACE_KINDS,
        "statusTypes": domain.STATUS_TYPES,
        "postCategories": domain.POST_CATEGORIES,
        "xpRules": domain.XP_RULES,
        "levels": domain.LEVELS,
        "statusTtlChoices": domain.STATUS_TTL_CHOICES,
        "postTtlHours": domain.POST_TTL_HOURS,
        "center": {"lat": 51.5385, "lng": 46.0078},
    }


def _error(status_code: int, message: str) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"detail": message})


def create_app(db_path: str, seed_demo: bool = False) -> FastAPI:
    app = FastAPI(title="nearby API", version="1.0.0", docs_url="/api/docs", openapi_url="/api/openapi.json")
    app.state.db_path = db_path
    db.init_db(db_path)
    # migrate existing DBs: add github/maxsite/emoji columns if missing
    with db.session(db_path) as _mconn:
        cols = [row[1] for row in _mconn.execute("PRAGMA table_info(users)").fetchall()]
        if "github" not in cols:
            _mconn.execute("ALTER TABLE users ADD COLUMN github TEXT NOT NULL DEFAULT ''")
        if "maxsite" not in cols:
            _mconn.execute("ALTER TABLE users ADD COLUMN maxsite TEXT NOT NULL DEFAULT ''")
        if "emoji" not in cols:
            _mconn.execute("ALTER TABLE users ADD COLUMN emoji TEXT NOT NULL DEFAULT ''")
    if seed_demo:
        with db.session(db_path) as conn:
            seed.seed(conn)
            seed.ensure_places(conn)
            seed.refresh_demo(conn)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://127.0.0.1:5173",
            "http://localhost:5173",
            "http://127.0.0.1:8000",
            "http://localhost:8000",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/api/health")
    def health() -> Dict[str, Any]:
        return {"ok": True, "city": domain.CITY, "campus": domain.CAMPUS, "time": _now()}

    @app.get("/api/meta")
    def meta() -> Dict[str, Any]:
        return _meta()

    @app.post("/api/auth/register")
    def register(payload: RegisterIn, conn: sqlite3.Connection = Depends(_conn)) -> Dict[str, Any]:
        try:
            user_id = auth.create_user(conn, payload.model_dump())
        except auth.ValidationError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
        except sqlite3.IntegrityError:
            raise HTTPException(status_code=409, detail="Этот логин уже занят")
        token = auth.issue_token(conn, user_id)
        conn.commit()
        return {"token": token, "user": _me(conn, user_id), "meta": _meta()}

    @app.post("/api/auth/login")
    def login(payload: LoginIn, conn: sqlite3.Connection = Depends(_conn)) -> Dict[str, Any]:
        row = auth.authenticate(conn, payload.username, payload.password)
        if not row:
            raise HTTPException(status_code=401, detail="Неверный логин или пароль")
        token = auth.issue_token(conn, int(row["id"]))
        conn.commit()
        return {"token": token, "user": _me(conn, int(row["id"])), "meta": _meta()}

    @app.post("/api/auth/logout")
    def logout(request: Request, conn: sqlite3.Connection = Depends(_conn)) -> Dict[str, Any]:
        token = _token(request)
        if token:
            conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
        return {"ok": True}

    @app.get("/api/me")
    def me(user: sqlite3.Row = Depends(_current_user), conn: sqlite3.Connection = Depends(_conn)) -> Dict[str, Any]:
        return {"me": _me(conn, int(user["id"])), "now": _now()}

    @app.patch("/api/me")
    def update_me(
        payload: ProfileIn,
        user: sqlite3.Row = Depends(_current_user),
        conn: sqlite3.Connection = Depends(_conn),
    ) -> Dict[str, Any]:
        first = payload.firstName.strip()
        last = payload.lastName.strip()
        faculty = payload.faculty.strip()
        if not first or not last:
            raise HTTPException(status_code=400, detail="Укажите имя и фамилию")
        if len(faculty) < 2 or len(faculty) > 60:
            raise HTTPException(status_code=400, detail="Укажите факультет")
        try:
            telegram = auth.normalize_telegram(payload.telegram)
        except auth.ValidationError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
        github = payload.github.strip()
        maxsite = payload.maxsite.strip()
        emoji = payload.emoji.strip()
        if github and not (github.startswith("https://github.com/") or github.startswith("http://github.com/")):
            raise HTTPException(status_code=400, detail="Ссылка на GitHub должна начинаться с https://github.com/")
        if maxsite and not (maxsite.startswith("https://vk.com/") or maxsite.startswith("http://vk.com/") or
                            maxsite.startswith("https://max.ru/") or maxsite.startswith("http://max.ru/")):
            raise HTTPException(status_code=400, detail="Ссылка на VK/Max должна начинаться с https://vk.com/ или https://max.ru/")
        # validate emoji: must be a single emoji char or empty; require level >= 2
        if emoji:
            user_row = conn.execute("SELECT xp FROM users WHERE id = ?", (int(user["id"]),)).fetchone()
            user_level = domain.level_for(int(user_row["xp"]))["level"] if user_row else 1
            if user_level < 2:
                raise HTTPException(status_code=403, detail="Эмодзи доступно с уровня 2")
            import unicodedata
            # allow only a single grapheme cluster that is an emoji/symbol
            stripped = emoji.strip()
            if len(stripped) > 8 or not stripped:
                raise HTTPException(status_code=400, detail="Выбери один эмодзи")
        avatar = payload.avatar
        if avatar:
            if not avatar.startswith("data:image/") or len(avatar) > 2_000_000:
                raise HTTPException(status_code=400, detail="Не удалось загрузить аватар")
        # migrate column if not yet present
        cols = [row[1] for row in conn.execute("PRAGMA table_info(users)").fetchall()]
        if "github" not in cols:
            conn.execute("ALTER TABLE users ADD COLUMN github TEXT NOT NULL DEFAULT ''")
        if "maxsite" not in cols:
            conn.execute("ALTER TABLE users ADD COLUMN maxsite TEXT NOT NULL DEFAULT ''")
        if "emoji" not in cols:
            conn.execute("ALTER TABLE users ADD COLUMN emoji TEXT NOT NULL DEFAULT ''")
        conn.execute(
            """
            UPDATE users SET first_name = ?, last_name = ?, faculty = ?, telegram = ?,
                             github = ?, maxsite = ?, emoji = ?, avatar = ?
            WHERE id = ?
            """,
            (first, last, faculty, telegram, github, maxsite, emoji, avatar or user["avatar"], int(user["id"])),
        )
        return {"me": _me(conn, int(user["id"]))}

    @app.get("/api/users/{username}")
    def user_profile(
        username: str,
        user: sqlite3.Row = Depends(_current_user),
        conn: sqlite3.Connection = Depends(_conn),
    ) -> Dict[str, Any]:
        row = conn.execute(
            "SELECT * FROM users WHERE username = ? COLLATE NOCASE", (username,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Пользователь не найден")
        uid = int(row["id"])
        counts = _counts(conn, uid)
        xp = int(row["xp"])
        cols = row.keys()
        return {
            "id": uid,
            "username": row["username"],
            "firstName": row["first_name"],
            "lastName": row["last_name"],
            "name": f"{row['first_name']} {row['last_name']}".strip(),
            "university": row["university"],
            "faculty": row["faculty"],
            "city": domain.CITY,
            "avatar": row["avatar"],
            "telegram": row["telegram"],
            "github": row["github"] if "github" in cols else "",
            "maxsite": row["maxsite"] if "maxsite" in cols else "",
            "emoji": (row["emoji"] if "emoji" in cols else "") or "",
            "xp": xp,
            "level": domain.level_for(xp),
            "levelShort": _level_short(xp),
            "counts": counts,
            "createdAt": row["created_at"],
            "isMe": uid == int(user["id"]),
        }

    @app.get("/api/bootstrap")
    def bootstrap(
        lat: Optional[float] = Query(None),
        lng: Optional[float] = Query(None),
        user: sqlite3.Row = Depends(_current_user),
        conn: sqlite3.Connection = Depends(_conn),
    ) -> Dict[str, Any]:
        now = _now()
        me_id = int(user["id"])
        return {
            "now": now,
            "me": _me(conn, me_id),
            "places": _places(conn, now, _num(lat), _num(lng)),
            "posts": _posts(conn, now, me_id, _num(lat), _num(lng)),
            "leaderboard": _leaderboard(conn, me_id, domain.CAMPUS, 8),
            "meta": _meta(),
        }

    @app.get("/api/live")
    def live(
        lat: Optional[float] = Query(None),
        lng: Optional[float] = Query(None),
        user: sqlite3.Row = Depends(_current_user),
        conn: sqlite3.Connection = Depends(_conn),
    ) -> Dict[str, Any]:
        now = _now()
        me_id = int(user["id"])
        return {
            "now": now,
            "me": _me(conn, me_id),
            "places": _places(conn, now, _num(lat), _num(lng)),
            "posts": _posts(conn, now, me_id, _num(lat), _num(lng)),
        }

    @app.get("/api/places")
    def places(
        lat: Optional[float] = Query(None),
        lng: Optional[float] = Query(None),
        user: sqlite3.Row = Depends(_current_user),
        conn: sqlite3.Connection = Depends(_conn),
    ) -> Dict[str, Any]:
        now = _now()
        return {"now": now, "places": _places(conn, now, _num(lat), _num(lng))}

    @app.get("/api/places/{place_id}")
    def place_detail(
        place_id: int,
        lat: Optional[float] = Query(None),
        lng: Optional[float] = Query(None),
        user: sqlite3.Row = Depends(_current_user),
        conn: sqlite3.Connection = Depends(_conn),
    ) -> Dict[str, Any]:
        now = _now()
        all_places = _places(conn, now, _num(lat), _num(lng))
        place = next((item for item in all_places if item["id"] == place_id), None)
        if not place:
            raise HTTPException(status_code=404, detail="Место не найдено")
        rows = conn.execute(
            """
            SELECT r.*, u.id AS user_id, u.first_name, u.last_name, u.username,
                   u.university, u.faculty, u.avatar, u.xp, COALESCE(u.emoji, '') AS emoji
            FROM reviews r JOIN users u ON u.id = r.user_id
            WHERE r.place_id = ? ORDER BY r.created_at DESC
            """,
            (place_id,),
        ).fetchall()
        place["reviews"] = [
            {
                "id": row["id"],
                "rating": row["rating"],
                "comment": row["comment"],
                "createdAt": row["created_at"],
                "author": _user_mini(row),
                "isMine": row["user_id"] == int(user["id"]),
            }
            for row in rows
        ]
        return {"now": now, "place": place}

    @app.post("/api/places/{place_id}/status")
    def create_status(
        place_id: int,
        payload: StatusIn,
        user: sqlite3.Row = Depends(_current_user),
        conn: sqlite3.Connection = Depends(_conn),
    ) -> Dict[str, Any]:
        now = _now()
        place = conn.execute("SELECT * FROM places WHERE id = ?", (place_id,)).fetchone()
        if not place:
            raise HTTPException(status_code=404, detail="Место не найдено")
        if payload.type not in domain.STATUS_TYPES:
            raise HTTPException(status_code=400, detail="Неизвестный тип статуса")
        text = payload.text.strip()
        if len(text) > 140:
            raise HTTPException(status_code=400, detail="Статус — до 140 символов")
        if domain.contains_profanity(text):
            raise HTTPException(status_code=400, detail="Запрещено использовать ненормативную лексику")
        ttl = int(payload.ttlMinutes or 60)
        if ttl < 15 or ttl > 180:
            raise HTTPException(status_code=400, detail="Статус живёт от 15 до 180 минут")
        spots = payload.spots
        if spots is not None:
            if spots < 0 or spots > 500:
                raise HTTPException(status_code=400, detail="Некорректное число мест")
        else:
            spots = None
        recent = conn.execute(
            """
            SELECT COUNT(*) FROM statuses
            WHERE user_id = ? AND place_id = ? AND created_at >= ?
            """,
            (int(user["id"]), place_id, now - STATUS_XP_WINDOW),
        ).fetchone()[0]
        cursor = conn.execute(
            """
            INSERT INTO statuses (place_id, user_id, type, text, spots, ttl_minutes, created_at, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (place_id, int(user["id"]), payload.type, text, spots, ttl, now, now + ttl * MINUTE),
        )
        xp_awarded = 0
        if not recent:
            xp_awarded = domain.XP["status"]
            _add_xp(conn, int(user["id"]), "status")
        row = conn.execute(
            """
            SELECT s.*, u.id AS user_id, u.first_name, u.last_name, u.username,
                   u.university, u.faculty, u.avatar, u.xp,
                   COALESCE(u.emoji, '') AS emoji
            FROM statuses s JOIN users u ON u.id = s.user_id WHERE s.id = ?
            """,
            (int(cursor.lastrowid),),
        ).fetchone()
        place_payload = next(item for item in _places(conn, now) if item["id"] == place_id)
        return {
            "status": _status_payload(row, now),
            "place": place_payload,
            "xpAwarded": xp_awarded,
            "me": _me(conn, int(user["id"])),
        }

    @app.post("/api/places/{place_id}/reviews")
    def create_review(
        place_id: int,
        payload: ReviewIn,
        user: sqlite3.Row = Depends(_current_user),
        conn: sqlite3.Connection = Depends(_conn),
    ) -> Dict[str, Any]:
        now = _now()
        place = conn.execute("SELECT id FROM places WHERE id = ?", (place_id,)).fetchone()
        if not place:
            raise HTTPException(status_code=404, detail="Место не найдено")
        if payload.rating < 1 or payload.rating > 5:
            raise HTTPException(status_code=400, detail="Оценка — от 1 до 5 звёзд")
        comment = payload.comment.strip()
        if len(comment) < 3 or len(comment) > 400:
            raise HTTPException(status_code=400, detail="Комментарий — от 3 до 400 символов")
        if domain.contains_profanity(comment):
            raise HTTPException(status_code=400, detail="Запрещено использовать ненормативную лексику")
        existing = conn.execute(
            "SELECT id FROM reviews WHERE place_id = ? AND user_id = ?",
            (place_id, int(user["id"])),
        ).fetchone()
        if existing:
            conn.execute(
                "UPDATE reviews SET rating = ?, comment = ?, created_at = ? WHERE id = ?",
                (payload.rating, comment, now, int(existing["id"])),
            )
            xp_awarded = 0
        else:
            conn.execute(
                "INSERT INTO reviews (place_id, user_id, rating, comment, created_at) VALUES (?, ?, ?, ?, ?)",
                (place_id, int(user["id"]), payload.rating, comment, now),
            )
            xp_awarded = domain.XP["review"]
            _add_xp(conn, int(user["id"]), "review")
        place_payload = next(item for item in _places(conn, now) if item["id"] == place_id)
        rows = conn.execute(
            """
            SELECT r.*, u.id AS user_id, u.first_name, u.last_name, u.username,
                   u.university, u.faculty, u.avatar, u.xp, COALESCE(u.emoji, '') AS emoji
            FROM reviews r JOIN users u ON u.id = r.user_id
            WHERE r.place_id = ? ORDER BY r.created_at DESC
            """,
            (place_id,),
        ).fetchall()
        place_payload["reviews"] = [
            {
                "id": row["id"],
                "rating": row["rating"],
                "comment": row["comment"],
                "createdAt": row["created_at"],
                "author": _user_mini(row),
                "isMine": row["user_id"] == int(user["id"]),
            }
            for row in rows
        ]
        return {
            "place": place_payload,
            "xpAwarded": xp_awarded,
            "me": _me(conn, int(user["id"])),
        }

    @app.get("/api/feed")
    def feed(
        category: Optional[str] = Query(None),
        lat: Optional[float] = Query(None),
        lng: Optional[float] = Query(None),
        user: sqlite3.Row = Depends(_current_user),
        conn: sqlite3.Connection = Depends(_conn),
    ) -> Dict[str, Any]:
        now = _now()
        if category and category not in domain.POST_CATEGORIES:
            raise HTTPException(status_code=400, detail="Неизвестная категория")
        return {
            "now": now,
            "posts": _posts(conn, now, int(user["id"]), _num(lat), _num(lng), category),
            "me": _me(conn, int(user["id"])),
        }

    @app.post("/api/posts")
    def create_post(
        payload: PostIn,
        user: sqlite3.Row = Depends(_current_user),
        conn: sqlite3.Connection = Depends(_conn),
    ) -> Dict[str, Any]:
        now = _now()
        if payload.category not in domain.POST_CATEGORIES:
            raise HTTPException(status_code=400, detail="Выбери тип запроса")
        text = payload.text.strip()
        if len(text) < 3 or len(text) > 280:
            raise HTTPException(status_code=400, detail="Текст — от 3 до 280 символов")
        if domain.contains_profanity(text):
            raise HTTPException(status_code=400, detail="Запрещено использовать ненормативную лексику")
        place_id = payload.placeId
        if place_id is not None:
            exists = conn.execute("SELECT id FROM places WHERE id = ?", (place_id,)).fetchone()
            if not exists:
                raise HTTPException(status_code=400, detail="Место не найдено")
        cursor = conn.execute(
            """
            INSERT INTO posts (user_id, category, text, place_id, created_at, expires_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                int(user["id"]),
                payload.category,
                text,
                place_id,
                now,
                now + domain.POST_TTL_HOURS * HOUR,
            ),
        )
        xp_awarded = domain.XP["post"]
        _add_xp(conn, int(user["id"]), "post")
        row = _post_row(conn, int(cursor.lastrowid), int(user["id"]))
        return {
            "post": _post_payload(row, now, int(user["id"])),
            "xpAwarded": xp_awarded,
            "me": _me(conn, int(user["id"])),
        }

    @app.delete("/api/posts/{post_id}")
    def delete_post(
        post_id: int,
        user: sqlite3.Row = Depends(_current_user),
        conn: sqlite3.Connection = Depends(_conn),
    ) -> Dict[str, Any]:
        row = conn.execute("SELECT * FROM posts WHERE id = ?", (post_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Запрос не найден")
        if row["user_id"] != int(user["id"]):
            raise HTTPException(status_code=403, detail="Можно удалить только свой запрос")
        conn.execute("DELETE FROM responses WHERE post_id = ?", (post_id,))
        conn.execute("DELETE FROM posts WHERE id = ?", (post_id,))
        return {"ok": True}

    @app.post("/api/posts/{post_id}/respond")
    def respond(
        post_id: int,
        user: sqlite3.Row = Depends(_current_user),
        conn: sqlite3.Connection = Depends(_conn),
    ) -> Dict[str, Any]:
        now = _now()
        row = _post_row(conn, post_id, int(user["id"]))
        if not row:
            raise HTTPException(status_code=404, detail="Запрос не найден")
        if row["expires_at"] <= now:
            raise HTTPException(status_code=410, detail="Запрос уже неактуален")
        if row["user_id"] == int(user["id"]):
            raise HTTPException(status_code=400, detail="Это ваш собственный запрос")
        existing = conn.execute(
            "SELECT id FROM responses WHERE post_id = ? AND user_id = ?",
            (post_id, int(user["id"])),
        ).fetchone()
        xp_awarded = 0
        if not existing:
            conn.execute(
                "INSERT INTO responses (post_id, user_id, created_at) VALUES (?, ?, ?)",
                (post_id, int(user["id"]), now),
            )
            xp_awarded = domain.XP["respond"]
            _add_xp(conn, int(user["id"]), "respond")
        author = conn.execute("SELECT * FROM users WHERE id = ?", (row["user_id"],)).fetchone()
        return {
            "telegram": author["telegram"],
            "telegramUrl": f"https://t.me/{author['telegram']}",
            "author": _user_mini(author),
            "postId": post_id,
            "xpAwarded": xp_awarded,
            "already": bool(existing),
            "me": _me(conn, int(user["id"])),
        }

    @app.get("/api/leaderboard")
    def leaderboard(
        university: Optional[str] = Query(None),
        user: sqlite3.Row = Depends(_current_user),
        conn: sqlite3.Connection = Depends(_conn),
    ) -> Dict[str, Any]:
        return {
            "now": _now(),
            "leaderboard": _leaderboard(conn, int(user["id"]), university, 50),
            "me": _me(conn, int(user["id"])),
        }

    @app.get("/api/ai/status")
    def ai_status() -> Dict[str, Any]:
        return llm.gateway.status()

    @app.post("/api/ai/plan")
    def ai_plan(
        payload: AIIn,
        user: sqlite3.Row = Depends(_current_user),
        conn: sqlite3.Connection = Depends(_conn),
    ) -> Dict[str, Any]:
        query = payload.query.strip()
        if len(query) < 2 or len(query) > 500:
            raise HTTPException(status_code=400, detail="Опиши ситуацию в 2–500 символах")
        now = _now()
        lat, lng = _num(payload.lat), _num(payload.lng)
        places = _places(conn, now, lat, lng)
        posts = _posts(conn, now, int(user["id"]), lat, lng, limit=6)
        budget = domain.parse_time_budget(query)
        snapshot = {
            "city": domain.CITY,
            "campus": domain.CAMPUS,
            "timeBudgetMinutes": budget,
            "student": {
                "university": user["university"],
                "faculty": user["faculty"],
            },
            "places": [
                {
                    "id": place["id"],
                    "name": place["name"],
                    "kind": place["kindLabel"],
                    "rating": place["rating"],
                    "distanceM": place["distanceM"],
                    "status": (
                        {
                            "type": place["status"]["typeLabel"],
                            "text": place["status"]["text"],
                            "spots": place["status"]["spots"],
                            "minutesLeft": place["status"]["secondsLeft"] // 60,
                        }
                        if place["status"]
                        else None
                    ),
                }
                for place in places
            ],
            "pulse": [
                {
                    "category": post["categoryLabel"],
                    "text": post["text"],
                    "place": post["place"]["name"] if post["place"] else None,
                    "minutesLeft": post["secondsLeft"] // 60,
                }
                for post in posts
            ],
        }
        raw = llm.gateway.plan(query, snapshot)
        plan = None
        if raw is not None:
            plan = planner.normalize_llm_plan(
                raw, {place["id"] for place in places}, budget, query
            )
        if plan is None:
            plan = planner.build_plan(query, places, posts)
        plan["generatedAt"] = now
        plan["budgetMinutes"] = budget
        return plan

    dist = BASE_DIR / "web" / "dist"
    if dist.exists():
        assets = dist / "assets"
        if assets.exists():
            app.mount("/assets", StaticFiles(directory=assets), name="assets")

        @app.get("/")
        def index() -> FileResponse:
            return FileResponse(dist / "index.html")

        app.mount("/", StaticFiles(directory=dist, html=True), name="site")
    else:

        @app.get("/")
        def dev_hint() -> Dict[str, str]:
            return {
                "app": "nearby API",
                "hint": "Frontend: cd web && npm run dev (http://127.0.0.1:5173)",
                "docs": "/api/docs",
            }

    @app.exception_handler(auth.ValidationError)
    async def validation_error(request: Request, exc: auth.ValidationError) -> JSONResponse:
        return _error(400, str(exc))

    return app
