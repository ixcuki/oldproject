"""Password hashing, validation and session tokens."""
from __future__ import annotations

import hashlib
import hmac
import re
import secrets
import sqlite3
import time
from typing import Any, Dict, Optional

from . import domain

PBKDF2_ROUNDS = 120_000
SESSION_DAYS = 30

USERNAME_RE = re.compile(r"^[A-Za-z0-9_]{3,24}$")
TELEGRAM_RE = re.compile(r"^[A-Za-z][A-Za-z0-9_]{3,31}$")


class ValidationError(ValueError):
    pass


def _now() -> int:
    return int(time.time() * 1000)


def hash_password(password: str, salt: Optional[str] = None) -> Dict[str, str]:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), PBKDF2_ROUNDS)
    return {"salt": salt, "hash": digest.hex()}


def verify_password(password: str, salt: str, expected: str) -> bool:
    candidate = hash_password(password, salt)["hash"]
    return hmac.compare_digest(candidate, expected)


def normalize_telegram(value: str) -> str:
    value = (value or "").strip()
    for prefix in ("https://t.me/", "http://t.me/", "t.me/", "telegram.me/"):
        if value.lower().startswith(prefix):
            value = value[len(prefix) :]
    value = value.lstrip("@").strip()
    if not TELEGRAM_RE.match(value):
        raise ValidationError("Ник в Telegram — 4–32 символа: латиница, цифры, _")
    return value


def validate_registration(data: Dict[str, Any]) -> Dict[str, Any]:
    username = str(data.get("username") or "").strip()
    if not USERNAME_RE.match(username):
        raise ValidationError("Логин — 3–24 символа: латиница, цифры, _")
    password = str(data.get("password") or "")
    if len(password) < 6:
        raise ValidationError("Пароль — минимум 6 символов")
    if len(password) > 128:
        raise ValidationError("Пароль слишком длинный")
    first_name = str(data.get("firstName") or "").strip()
    last_name = str(data.get("lastName") or "").strip()
    if len(first_name) < 2 or len(last_name) < 2:
        raise ValidationError("Укажите имя и фамилию")
    if len(first_name) > 40 or len(last_name) > 40:
        raise ValidationError("Имя и фамилия — до 40 символов")
    university = str(data.get("university") or domain.CAMPUS).strip()
    allowed = {item["short"] for item in domain.UNIVERSITIES}
    if university not in allowed:
        raise ValidationError("Пока доступен только СГУ")
    faculty = str(data.get("faculty") or "").strip()
    if len(faculty) < 2 or len(faculty) > 60:
        raise ValidationError("Укажите факультет")
    telegram = normalize_telegram(str(data.get("telegram") or ""))
    avatar = data.get("avatar")
    if avatar:
        avatar = str(avatar)
        if not avatar.startswith("data:image/") or len(avatar) > 2_000_000:
            raise ValidationError("Не удалось загрузить аватар")
    else:
        avatar = None
    return {
        "username": username,
        "password": password,
        "firstName": first_name,
        "lastName": last_name,
        "university": university,
        "faculty": faculty,
        "telegram": telegram,
        "avatar": avatar,
    }


def create_user(conn: sqlite3.Connection, data: Dict[str, Any]) -> int:
    payload = validate_registration(data)
    hashed = hash_password(payload["password"])
    cursor = conn.execute(
        """
        INSERT INTO users (username, password_hash, salt, first_name, last_name,
                           university, faculty, telegram, avatar, xp, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
        """,
        (
            payload["username"],
            hashed["hash"],
            hashed["salt"],
            payload["firstName"],
            payload["lastName"],
            payload["university"],
            payload["faculty"],
            payload["telegram"],
            payload["avatar"],
            _now(),
        ),
    )
    return int(cursor.lastrowid)


def authenticate(conn: sqlite3.Connection, username: str, password: str) -> Optional[sqlite3.Row]:
    row = conn.execute("SELECT * FROM users WHERE username = ? COLLATE NOCASE", (username or "",)).fetchone()
    if not row:
        return None
    if not verify_password(password or "", row["salt"], row["password_hash"]):
        return None
    return row


def issue_token(conn: sqlite3.Connection, user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    now = _now()
    conn.execute(
        "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
        (token, user_id, now, now + SESSION_DAYS * 24 * 3600 * 1000),
    )
    return token


def user_from_token(conn: sqlite3.Connection, token: str) -> Optional[sqlite3.Row]:
    if not token:
        return None
    return conn.execute(
        """
        SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token = ? AND s.expires_at > ?
        """,
        (token, _now()),
    ).fetchone()
