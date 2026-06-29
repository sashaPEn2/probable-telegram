# Telegram backend integration plan (bot + binding + notify)

## Assumptions
- Бот работает через webhook на Vercel по адресу: `https://snofembseu.tech/api/telegram/webhook`
- Связка `record_book_id` <-> `telegram_user_id` хранится в Neon/Postgres.

## Endpoints
1) `POST /api/telegram/bind/start`
- Вход: `{ record_book_id: string }`
- Действия:
  - генерирует числовой токен (пример: 6-7 цифр)
  - сохраняет в `telegram_bind_tokens` с `expires_at` (например +10 минут)
  - возвращает `{ token: string, expires_at: string }`

2) `POST /api/telegram/webhook`
- Используется Telegram webhook.
- Вход: стандартный payload Telegram (Update).
- Действия (для сообщения пользователя):
  - если текст = token и токен валиден:
    - находим запись token -> record_book_id
    - сохраняем/обновляем `telegram_users` (telegram_user_id, record_book_id, username)
    - очищаем token (или mark used)
    - отвечаем пользователю в Telegram: «Привязка выполнена»
  - если токен невалиден — отправляем «Код неверный/просрочен»

3) `POST /api/telegram/notify`
- Вход: `{ record_book_id: string, title: string, message: string, type?: 'info'|'success'|'warning', link?: string }`
- Действия:
  - находим telegram_user_id в `telegram_users`
  - отправляем `sendMessage` пользователю
  - в случае отсутствия привязки — просто 200 OK (без ошибок)

## Tables (telegram.sql)
- `telegram_bind_tokens(token TEXT PK, record_book_id TEXT, expires_at TIMESTAMPTZ)`
- `telegram_users(telegram_user_id BIGINT PK, record_book_id TEXT, telegram_username TEXT, ...)`

## Environment variables
- `TELEGRAM_BOT_TOKEN`
- `NEON_DATABASE_URL`
- (опционально) `TELEGRAM_BIND_TOKEN_TTL_SECONDS`

