"""Production entrypoint: python -m server.main (or uvicorn server.main:app)."""
from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def load_env(path: Path) -> None:
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


load_env(BASE_DIR / ".env")

from .app import create_app  # noqa: E402

DB_PATH = os.getenv("UNIPULSE_DB", str(BASE_DIR / "data" / "unipulse.db"))
SEED_DEMO = os.getenv("UNIPULSE_SEED", "1") != "0"

app = create_app(DB_PATH, seed_demo=SEED_DEMO)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "server.main:app",
        host=os.getenv("HOST", "127.0.0.1"),
        port=int(os.getenv("PORT", "8000")),
        reload=os.getenv("RELOAD", "0") == "1",
    )
