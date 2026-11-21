from server import planner


PLACES = [
    {
        "id": 1,
        "name": "Научная библиотека СГУ",
        "kind": "library",
        "rating": 4.8,
        "distanceM": 250,
        "status": {
            "type": "free",
            "text": "Есть места у окон, 2 этаж",
            "spots": 14,
            "minutesLeft": 48,
        },
    },
    {
        "id": 2,
        "name": "Кофе и конспекты",
        "kind": "cafe",
        "rating": 4.7,
        "distanceM": 420,
        "status": {"type": "free", "text": "Свободный столик", "minutesLeft": 30},
    },
    {
        "id": 3,
        "name": "Столовая СГУ",
        "kind": "food",
        "rating": 4.2,
        "distanceM": 120,
        "status": {"type": "queue", "text": "Очередь на раздаче", "minutesLeft": 25},
    },
    {
        "id": 4,
        "name": "Спортплощадка у 5 корпуса",
        "kind": "sport",
        "rating": 4.5,
        "distanceM": 600,
        "status": {
            "type": "players",
            "text": "Ищем 2 человека на баскетбол",
            "minutesLeft": 60,
        },
    },
    {
        "id": 5,
        "name": "Коворкинг «Точка кипения»",
        "kind": "study",
        "rating": 4.6,
        "distanceM": 800,
        "status": None,
    },
]

POSTS = [
    {
        "id": 7,
        "category": "activity",
        "text": "Кто хочет пообедать?",
        "minutesLeft": 300,
    }
]


def test_quiet_coffee_plan():
    plan = planner.build_plan(
        "У меня два часа, нужно подготовиться к экзамену, хочу тихое место, желательно кофе",
        PLACES,
        POSTS,
    )
    assert plan["title"] == "Твой план на ближайшие 2 часа"
    assert plan["source"] == "local"
    assert 1 in plan["placeIds"]
    assert 2 in plan["placeIds"]
    assert 3 not in plan["placeIds"]
    titles = " ".join(step["title"].lower() for step in plan["steps"])
    assert "библиотек" in titles
    assert "кофе" in titles
    durations = [step["time"] for step in plan["steps"]]
    assert "По пути" in durations


def test_eat_without_queue_prefers_free_place():
    plan = planner.build_plan("Где поесть без очереди?", PLACES, [])
    assert plan["placeIds"][0] == 2
    assert 3 not in plan["placeIds"]


def test_sport_plan_uses_players_status():
    plan = planner.build_plan("Нужны 2 человека для баскетбола", PLACES, [])
    assert plan["placeIds"][0] == 4
    joined = " ".join(step["title"] + " " + step["detail"] for step in plan["steps"])
    assert "баскетбол" in joined.lower() or "игр" in joined.lower()


def test_company_plan_mentions_pulse():
    plan = planner.build_plan("Кто хочет пообедать со мной?", PLACES, POSTS)
    joined = " ".join(step["title"] + " " + step["detail"] for step in plan["steps"])
    assert "Pulse" in joined


def test_half_hour_budget_is_respected():
    plan = planner.build_plan("Есть полчаса, хочу тихо почитать", PLACES, [])
    assert "30 минут" in plan["title"]
    for step in plan["steps"]:
        if "мин" in step["time"] and step["time"] != "По пути":
            assert int(step["time"].split()[0]) <= 30


def test_empty_places_returns_safe_plan():
    plan = planner.build_plan("Хочу кофе", [], [])
    assert plan["placeIds"] == []
    assert plan["steps"]
    assert "карт" in (plan["steps"][0]["title"] + plan["steps"][0]["detail"]).lower()


def test_normalize_llm_plan_filters_unknown_places():
    raw = {
        "title": "План на 2 часа",
        "intro": "По live-статусам",
        "steps": [
            {
                "time": "5 мин",
                "title": "Библиотека",
                "detail": "Свободно",
                "placeId": 1,
                "icon": "book",
            },
            {
                "time": "10 мин",
                "title": "Фантом",
                "detail": "Нет такого места",
                "placeId": 999,
                "icon": "hack",
            },
        ],
    }
    plan = planner.normalize_llm_plan(raw, {1, 2, 3}, 120)
    assert plan is not None
    assert plan["placeIds"] == [1]
    assert len(plan["steps"]) == 1
    assert plan["source"] == "llm"


def test_normalize_llm_plan_rejects_garbage():
    assert planner.normalize_llm_plan({"steps": []}, {1}, 60) is None
    assert planner.normalize_llm_plan("no json", {1}, 60) is None


def test_need_only_answers_instead_of_two_hour_plan():
    plan = planner.build_plan("Хочу поесть", PLACES, [])
    assert plan["mode"] == "answer"
    assert "ближайшие" not in plan["title"].lower()
    assert plan["placeIds"]
    assert 1 <= len(plan["steps"]) <= 3
    for step in plan["steps"]:
        assert step["time"] in ("сейчас", "или") or step["time"].endswith("мин"), step["time"]
        if step["time"].endswith("мин"):
            assert int(step["time"].split()[0]) <= 20
    assert not any("время на месте" in step["title"].lower() for step in plan["steps"])


def test_answer_can_suggest_alternative_without_queue():
    plan = planner.build_plan("Где пообедать?", PLACES, [])
    assert plan["mode"] == "answer"
    assert 3 in plan["placeIds"] or 2 in plan["placeIds"]
    joined = " ".join(step["detail"] for step in plan["steps"]).lower()
    assert "очеред" in joined or "свобод" in joined


def test_explicit_budget_keeps_plan_mode_with_sane_focus():
    plan = planner.build_plan("У меня два часа, хочу поесть", PLACES, [])
    assert plan["mode"] == "plan"
    assert plan["title"] == "Твой план на ближайшие 2 часа"
    focus = plan["steps"][-1]
    assert focus["time"].endswith("мин")
    assert int(focus["time"].split()[0]) <= 45


def test_normalize_llm_plan_without_budget_answers_not_plans():
    raw = {
        "title": "Твой план на ближайшие 2 часа",
        "steps": [
            {"time": "сейчас", "title": "Столовая СГУ", "detail": "Очередь", "placeId": 3, "icon": "food"}
        ],
    }
    plan = planner.normalize_llm_plan(raw, {3}, None)
    assert plan is not None
    assert plan["mode"] == "answer"
    assert "ближайшие" not in plan["title"].lower()

    with_budget = planner.normalize_llm_plan(raw, {3}, 120)
    assert with_budget["mode"] == "plan"


def test_normalize_llm_plan_clips_long_detail_at_word_boundary():
    raw = {
        "title": "Где поесть рядом",
        "steps": [
            {
                "time": "сейчас",
                "title": "Буфет",
                "detail": "Он буквально в 11 метрах — успеешь поесть спокойно, минут 40. " * 4,
                "placeId": 3,
                "icon": "food",
            }
        ],
    }
    plan = planner.normalize_llm_plan(raw, {3}, None, "хочу поесть")
    detail = plan["steps"][0]["detail"]
    assert len(detail) <= 220
    assert detail.endswith("…")
    assert not detail[:-1].endswith(" ")
