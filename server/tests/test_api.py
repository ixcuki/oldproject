import sqlite3

import pytest
from fastapi.testclient import TestClient

from server.app import create_app


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "local")
    app = create_app(str(tmp_path / "test.db"), seed_demo=True)
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def auth(client):
    response = client.post(
        "/api/auth/login", json={"username": "ivan_p", "password": "secret123"}
    )
    assert response.status_code == 200
    data = response.json()
    return {"Authorization": f"Bearer {data['token']}"}, data


def test_register_login_and_duplicate(client):
    payload = {
        "username": "new_student",
        "password": "qwerty123",
        "firstName": "Нина",
        "lastName": "Орлова",
        "university": "СГУ",
        "faculty": "КНиИТ",
        "telegram": "@nina_o",
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["token"]
    assert data["user"]["name"] == "Нина Орлова"
    assert data["user"]["xp"] == 0
    assert data["user"]["level"]["name"] == "Новичок кампуса"
    assert "password" not in data["user"]
    assert data["meta"]["universities"][0]["short"] == "СГУ"

    duplicate = client.post("/api/auth/register", json=payload)
    assert duplicate.status_code == 409

    login = client.post(
        "/api/auth/login", json={"username": "NEW_STUDENT", "password": "qwerty123"}
    )
    assert login.status_code == 200
    assert login.json()["user"]["telegram"] == "nina_o"


def test_register_validation(client):
    base = {
        "username": "ab",
        "password": "123",
        "firstName": "И",
        "lastName": "П",
        "university": "СГУ",
        "faculty": "КНиИТ",
        "telegram": "@ivan_p",
    }
    response = client.post("/api/auth/register", json=base)
    assert response.status_code == 400
    assert "Логин" in response.json()["detail"]

    base["username"] = "good_login"
    response = client.post("/api/auth/register", json=base)
    assert response.status_code == 400
    assert "Пароль" in response.json()["detail"]

    base["password"] = "123456"
    response = client.post("/api/auth/register", json=base)
    assert response.status_code == 400
    assert "имя" in response.json()["detail"].lower()

    base["firstName"] = "Иван"
    base["lastName"] = "Петров"
    base["faculty"] = ""
    response = client.post("/api/auth/register", json=base)
    assert response.status_code == 400
    assert "факультет" in response.json()["detail"].lower()

    base["faculty"] = "КНиИТ"
    base["telegram"] = "!!"
    response = client.post("/api/auth/register", json=base)
    assert response.status_code == 400
    assert "Telegram" in response.json()["detail"]

    base["telegram"] = "@good_nick"
    base["university"] = "СГМУ"
    response = client.post("/api/auth/register", json=base)
    assert response.status_code == 400
    assert "СГУ" in response.json()["detail"]


def test_auth_required(client):
    assert client.get("/api/bootstrap").status_code == 401
    assert client.get("/api/me").status_code == 401
    bad = client.post("/api/auth/login", json={"username": "ivan_p", "password": "wrong"})
    assert bad.status_code == 401
    assert "Неверный" in bad.json()["detail"]


def test_bootstrap_has_ssu_places_and_ttl(client, auth):
    headers, _ = auth
    data = client.get("/api/bootstrap", headers=headers).json()
    assert data["meta"]["city"] == "Саратов"
    assert len(data["places"]) == 21
    library = next(p for p in data["places"] if p["name"] == "Научная библиотека СГУ")
    assert library["kind"] == "library"
    assert library["rating"] == 4.8
    assert library["status"]["type"] == "free"
    assert library["status"]["secondsLeft"] > 0
    gym = next(p for p in data["places"] if p["name"] == "Спортзал СГУ")
    assert gym["status"] is None, "expired status must not be returned"
    assert data["leaderboard"]["entries"][0]["user"]["name"] == "Ольга Морозова"
    assert data["leaderboard"]["entries"][0]["xp"] == 1420
    assert all(entry["user"]["university"] == "СГУ" for entry in data["leaderboard"]["entries"])


def test_status_creation_overwrites_and_awards_once(client, auth):
    headers, data = auth
    start_xp = data["user"]["xp"]
    response = client.post(
        "/api/places/2/status",
        headers=headers,
        json={"type": "quiet", "text": "Свободен стол у окна", "ttlMinutes": 30},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["xpAwarded"] == 10
    assert payload["status"]["author"]["id"] == data["user"]["id"]
    assert payload["me"]["xp"] == start_xp + 10

    second = client.post(
        "/api/places/2/status",
        headers=headers,
        json={"type": "free", "text": "Освободилось ещё место", "spots": 2, "ttlMinutes": 30},
    )
    assert second.status_code == 200
    assert second.json()["xpAwarded"] == 0
    assert second.json()["status"]["text"] == "Освободилось ещё место"

    bootstrap = client.get("/api/bootstrap", headers=headers).json()
    cafe = next(p for p in bootstrap["places"] if p["id"] == 2)
    assert cafe["status"]["text"] == "Освободилось ещё место"

    bad_ttl = client.post(
        "/api/places/2/status", headers=headers, json={"type": "free", "ttlMinutes": 5}
    )
    assert bad_ttl.status_code == 400


def test_review_updates_rating_and_awards_once(client, auth):
    headers, data = auth
    before = client.get("/api/places/2", headers=headers).json()["place"]
    response = client.post(
        "/api/places/2/reviews",
        headers=headers,
        json={"rating": 5, "comment": "Лучший кофе рядом с корпусом"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["xpAwarded"] == 15
    assert payload["me"]["xp"] == data["user"]["xp"] + 15
    assert payload["place"]["reviewCount"] == before["reviewCount"] + 1
    assert payload["place"]["reviews"][0]["author"]["faculty"] == "КНиИТ"
    assert payload["place"]["reviews"][0]["author"]["avatar"] is None

    again = client.post(
        "/api/places/2/reviews",
        headers=headers,
        json={"rating": 4, "comment": "Передумал: утром очередь"},
    )
    assert again.status_code == 200
    assert again.json()["xpAwarded"] == 0
    assert again.json()["place"]["reviewCount"] == before["reviewCount"] + 1

    bad = client.post(
        "/api/places/2/reviews", headers=headers, json={"rating": 6, "comment": "Норм"}
    )
    assert bad.status_code == 400


def test_posts_respond_and_telegram(client, auth):
    headers, data = auth
    created = client.post(
        "/api/posts",
        headers=headers,
        json={
            "category": "activity",
            "text": "Ищу компанию на обед в 13:00",
            "placeId": 3,
        },
    )
    assert created.status_code == 200
    post = created.json()["post"]
    assert post["isMine"] is True
    assert created.json()["xpAwarded"] == 10
    assert post["place"]["name"] == "Столовая СГУ"
    assert created.json()["me"]["xp"] == data["user"]["xp"] + 10

    own = client.post(f"/api/posts/{post['id']}/respond", headers=headers)
    assert own.status_code == 400

    target = next(p for p in client.get("/api/feed", headers=headers).json()["posts"] if p["text"].startswith("Нужны 2 человека"))
    response = client.post(f"/api/posts/{target['id']}/respond", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["telegram"] == "dmitry_s"
    assert body["telegramUrl"] == "https://t.me/dmitry_s"
    assert body["xpAwarded"] == 5
    assert body["already"] is False

    repeat = client.post(f"/api/posts/{target['id']}/respond", headers=headers)
    assert repeat.status_code == 200
    assert repeat.json()["xpAwarded"] == 0
    assert repeat.json()["already"] is True


def test_feed_filters_expired_and_categories(client, auth):
    headers, _ = auth
    posts = client.get("/api/feed", headers=headers).json()["posts"]
    assert posts
    assert all(p["secondsLeft"] > 0 for p in posts)
    assert not any("лекцию по философии" in p["text"] for p in posts)
    assert all(p["author"]["university"] == "СГУ" for p in posts)
    exchange = client.get("/api/feed?category=exchange", headers=headers).json()["posts"]
    assert exchange
    assert all(p["category"] == "exchange" for p in exchange)
    bad = client.get("/api/feed?category=unknown", headers=headers)
    assert bad.status_code == 400


def test_leaderboard_filter(client, auth):
    headers, _ = auth
    full = client.get("/api/leaderboard", headers=headers).json()["leaderboard"]
    xps = [entry["xp"] for entry in full["entries"]]
    assert xps == sorted(xps, reverse=True)
    assert full["me"]["user"]["username"] == "ivan_p"
    assert full["me"]["rank"] > 1

    ssu = client.get("/api/leaderboard?university=СГУ", headers=headers).json()["leaderboard"]
    assert ssu["total"] == 10

    other = client.get("/api/leaderboard?university=СГМУ", headers=headers).json()["leaderboard"]
    assert other["entries"] == []
    assert other["me"] is None


def test_ai_plan_local_fallback(client, auth):
    headers, _ = auth
    response = client.post(
        "/api/ai/plan",
        headers=headers,
        json={
            "query": "У меня два часа, нужно подготовиться к экзамену, хочу тихое место, желательно кофе",
            "lat": 51.5385,
            "lng": 46.0078,
        },
    )
    assert response.status_code == 200
    plan = response.json()
    assert plan["source"] == "local"
    assert plan["mode"] == "plan"
    assert plan["title"] == "Твой план на ближайшие 2 часа"
    assert 1 in plan["placeIds"] or 5 in plan["placeIds"]
    cafe_ids = {2, 7, 11}
    assert cafe_ids.intersection(plan["placeIds"])
    assert all("placeId" in step for step in plan["steps"])
    assert all(step["icon"] for step in plan["steps"])

    short = client.post("/api/ai/plan", headers=headers, json={"query": ""})
    assert short.status_code == 400


def test_profile_update(client, auth):
    headers, _ = auth
    response = client.patch(
        "/api/me",
        headers=headers,
        json={
            "firstName": "Иван",
            "lastName": "Петров",
            "faculty": "КНиИТ",
            "telegram": "ivan_new",
        },
    )
    assert response.status_code == 200
    assert response.json()["me"]["telegram"] == "ivan_new"
    bad = client.patch(
        "/api/me",
        headers=headers,
        json={"firstName": "Иван", "lastName": "Петров", "faculty": "КНиИТ", "telegram": ""},
    )
    assert bad.status_code == 400


def test_db_has_no_plaintext_passwords(tmp_path, monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "local")
    path = str(tmp_path / "check.db")
    create_app(path, seed_demo=True)
    conn = sqlite3.connect(path)
    rows = conn.execute("SELECT password_hash, salt FROM users").fetchall()
    assert all(len(row[0]) == 64 and len(row[1]) == 32 for row in rows)
    conn.close()


def test_ai_plan_answers_simple_need(client, auth):
    headers, _ = auth
    response = client.post(
        "/api/ai/plan",
        headers=headers,
        json={"query": "Хочу поесть", "lat": 51.5385, "lng": 46.0078},
    )
    assert response.status_code == 200
    plan = response.json()
    assert plan["mode"] == "answer"
    assert plan["budgetMinutes"] is None
    assert "ближайшие" not in plan["title"].lower()
    assert plan["placeIds"]
    assert 1 <= len(plan["steps"]) <= 3


def test_bootstrap_has_12th_building_places(client, auth):
    headers, _ = auth
    places = client.get("/api/bootstrap", headers=headers).json()["places"]
    twelve = [place for place in places if "12 корпус" in place["name"]]
    kinds = {place["kind"] for place in twelve}
    assert {"study", "library", "sport", "event", "rest"} <= kinds
    coworking = next(place for place in twelve if "Точка кипения" in place["name"])
    assert coworking["status"]["type"] == "free"


def test_12th_building_places_have_reviews(client, auth):
    headers, _ = auth
    places = client.get("/api/bootstrap", headers=headers).json()["places"]
    twelve = [place for place in places if "12 корпус" in place["name"]]
    assert len(twelve) == 5
    for place in twelve:
        detail = client.get(f"/api/places/{place['id']}", headers=headers).json()["place"]
        assert len(detail["reviews"]) >= 3, place["name"]
        assert all(review["comment"] for review in detail["reviews"]), place["name"]
        assert detail["rating"] and 3.0 <= detail["rating"] <= 5.0, place["name"]
