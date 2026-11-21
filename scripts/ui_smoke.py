import os

from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8000"
OUT = os.path.join(os.path.dirname(__file__), "..", "screenshots")
os.makedirs(OUT, exist_ok=True)
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROME, headless=True, args=["--no-sandbox"])
    context = browser.new_context(
        viewport={"width": 390, "height": 844},
        device_scale_factor=2,
        is_mobile=True,
        has_touch=True,
        locale="ru-RU",
    )
    page = context.new_page()
    page.set_default_timeout(20000)
    logs = []
    page.on("console", lambda m: logs.append(f"{m.type}: {m.text}") if m.type == "error" else None)
    page.on("pageerror", lambda e: logs.append(f"pageerror: {e}"))

    def shot(name):
        page.wait_for_timeout(500)
        page.screenshot(path=f"{OUT}/{name}.png")
        print("shot", name, flush=True)

    def go(tab):
        page.get_by_label("Основная навигация").get_by_role("link", name=tab).click()
        page.wait_for_timeout(900)

    page.goto(f"{BASE}/#/auth", wait_until="domcontentloaded")
    page.wait_for_timeout(1200)
    shot("01-auth")

    page.get_by_role("button", name="Демо-вход: Иван Петров · 320 XP").click()
    page.wait_for_timeout(3500)
    shot("02-map")

    # Open map status card detail
    page.get_by_role("button", name="Открыть карточку места").click()
    page.wait_for_timeout(1800)
    shot("08-place")
    page.get_by_role("button", name="Изменить мой отзыв").click()
    page.wait_for_timeout(600)
    shot("10-review-sheet")
    page.keyboard.press("Escape")
    page.get_by_role("button", name="Назад к карте").click()
    page.wait_for_timeout(1200)

    page.get_by_role("button", name="Создать live-статус").click()
    page.wait_for_timeout(700)
    shot("09-status-sheet")
    page.keyboard.press("Escape")
    page.wait_for_timeout(400)

    go("Pulse")
    shot("03-pulse")
    page.get_by_role("button", name="Откликнуться").first.click()
    page.wait_for_timeout(600)
    shot("11-respond-sheet")
    page.keyboard.press("Escape")
    page.get_by_role("button", name="Создать запрос").click()
    page.wait_for_timeout(600)
    shot("12-post-sheet")
    page.keyboard.press("Escape")

    go("AI")
    shot("04-ai-empty")
    page.get_by_role("button", name="У меня два часа, хочу тихое место и кофе").click()
    page.wait_for_timeout(500)
    try:
        page.get_by_text("ПЛАН · LIVE-ДАННЫЕ").wait_for(timeout=20000)
    except Exception as exc:
        print("plan wait failed:", exc, flush=True)
    page.wait_for_timeout(1200)
    shot("05-ai-plan")
    try:
        page.get_by_role("button", name="Показать на карте").click()
        page.wait_for_timeout(2200)
        shot("13-map-focus")
    except Exception as exc:
        print("map focus failed:", exc, flush=True)

    go("Профиль")
    shot("06-profile")
    page.get_by_role("button", name="Редактировать профиль").click()
    page.wait_for_timeout(600)
    shot("14-edit-profile")
    page.keyboard.press("Escape")

    go("Уровни")
    shot("07-levels")

    page.goto(f"{BASE}/#/map", wait_until="domcontentloaded")
    page.wait_for_timeout(1500)
    page.get_by_role("button", name="События").click()
    page.wait_for_timeout(900)
    shot("15-map-events")

    print("ERRORS:", flush=True)
    print("\n".join(logs[-20:]) or "none")
    browser.close()
