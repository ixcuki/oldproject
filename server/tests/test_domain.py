from server import domain


def test_level_boundaries():
    assert domain.level_for(0)["name"] == "Новичок кампуса"
    assert domain.level_for(99)["name"] == "Новичок кампуса"
    assert domain.level_for(100)["name"] == "Исследователь"
    assert domain.level_for(499)["name"] == "Исследователь"
    assert domain.level_for(500)["name"] == "Помощник сообщества"
    assert domain.level_for(999)["name"] == "Помощник сообщества"
    assert domain.level_for(1000)["name"] == "Campus Legend"
    assert domain.level_for(4200)["name"] == "Campus Legend"


def test_level_progress_explorer():
    lv = domain.level_for(320)
    assert lv["level"] == 2
    assert lv["min"] == 100
    assert lv["nextMin"] == 500
    assert lv["toNext"] == 180
    assert lv["into"] == 220
    assert round(lv["progress"], 3) == 0.55
    assert lv["nextName"] == "Помощник сообщества"


def test_level_progress_max():
    lv = domain.level_for(1200)
    assert lv["nextName"] is None
    assert lv["toNext"] == 0
    assert lv["progress"] == 1.0
    assert lv["level"] == 4


def test_level_clamps_negative():
    assert domain.level_for(-10)["name"] == "Новичок кампуса"


def test_haversine_zero_and_campus_distance():
    assert domain.haversine_m(51.539, 46.007, 51.539, 46.007) == 0
    # СГУ (корпус 1) -> Зональная научная библиотека СГУ
    d = domain.haversine_m(51.5390764, 46.0092724, 51.5396339, 46.0061185)
    assert 150 < d < 300


def test_format_distance():
    assert domain.format_distance(0) == "0 м"
    assert domain.format_distance(227) == "230 м"
    assert domain.format_distance(940) == "940 м"
    assert domain.format_distance(1240) == "1,2 км"
    assert domain.format_distance(15400) == "15 км"


def test_format_minutes_left():
    assert domain.format_minutes_left(48 * 60) == "48 мин"
    assert domain.format_minutes_left(59) == "<1 мин"
    assert domain.format_minutes_left(3720) == "1 ч 2 мин"
    assert domain.format_minutes_left(-5) == "истёк"


def test_parse_time_budget():
    assert domain.parse_time_budget("У меня два часа, хочу тихое место") == 120
    assert domain.parse_time_budget("есть полчаса") == 30
    assert domain.parse_time_budget("свободен 45 минут") == 45
    assert domain.parse_time_budget("3 часа до пары") == 180
    assert domain.parse_time_budget("полтора часа") == 90
    assert domain.parse_time_budget("нужно подготовиться") is None
    assert domain.parse_time_budget("хочу поесть") is None
    assert domain.parse_time_budget("1,5 часа") == 90


def test_human_duration():
    assert domain.human_duration(60) == "час"
    assert domain.human_duration(120) == "2 часа"
    assert domain.human_duration(180) == "3 часа"
    assert domain.human_duration(300) == "5 часов"
    assert domain.human_duration(90) == "90 минут"
    assert domain.human_duration(21) == "21 минута"
    assert domain.human_duration(45) == "45 минут"


def test_plural():
    assert domain.plural(1, "час", "часа", "часов") == "час"
    assert domain.plural(2, "час", "часа", "часов") == "часа"
    assert domain.plural(5, "час", "часа", "часов") == "часов"
    assert domain.plural(11, "час", "часа", "часов") == "часов"
    assert domain.plural(21, "час", "часа", "часов") == "час"
