# nearby

Мобильное веб-приложение живого пульса кампуса СГУ (Саратовский государственный университет).

---

## Важно: LLM-токен не хранится в репозитории

Файл `.env` исключён из git через `.gitignore`. Ключ к языковой модели (Haiku через RouterAI) находится только на сервере SpongeWork.

Чтобы запустить проект локально, создай `.env` на основе `.env.example` и укажи свой ключ:

```bash
cp .env.example .env
# открой .env и вставь свой LLM_API_KEY
```

---

## Технологии

### Фронтенд
- **React 19** + **TypeScript** — UI-компоненты и типизация
- **Vite** — сборщик, dev-сервер
- **Tailwind CSS** — утилитарные стили
- **shadcn/ui** — компонентная библиотека (Sheet, Select, Input и др.)
- **Lucide React** — иконки
- **Leaflet** — интерактивная карта (тайлы OpenStreetMap FR)
- **React Router** — клиентская маршрутизация

### Бэкенд
- **Python 3.9+** + **FastAPI** — REST API
- **Pydantic** — валидация входных данных
- **PBKDF2-SHA256** — хэширование паролей
- **RouterAI / Claude Haiku** — AI-ассистент кампуса (OpenAI-совместимый шлюз)

### Инфраструктура
- Polling каждые 20 секунд для live-обновлений
- JWT-подобные сессионные токены (хранятся в `localStorage`)
- Геолокация через браузерный API
- PWA-метатеги, мобильный viewport 390×844

---

## Быстрый старт

```bash
# 1. Зависимости бэкенда
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 2. Настроить .env
cp .env.example .env
# вставить LLM_API_KEY в .env
---

## Структура проекта

```
server/          FastAPI-приложение, бизнес-логика, seed-данные
web/src/         React-приложение (компоненты, страницы, стор)
web/public/      Статика (favicon, иконки)
data/            База данных SQLite (в git не входит)
.env.example     Шаблон переменных окружения
```
