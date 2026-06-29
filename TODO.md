# Telegram integration (binding + bot notifications) — TODO

## Backend (Telegram bot + Neon/Postgres)
- [ ] Добавить DDL для таблиц Neon: `telegram_bind_tokens`, `telegram_users`
- [ ] Расширить `server.ts`:
  - [ ] Telegram webhook endpoint `POST https://snofembseu.tech/api/telegram/webhook`
  - [ ] endpoint старта привязки `/api/telegram/bind/start`
  - [ ] endpoint отправки уведомлений `/api/telegram/notify`

- [ ] Добавить проверку формата “код в сообщении” (числовой token)
- [ ] Добавить удаление/истечение token после подтверждения

## Frontend (profile binding)
- [ ] Добавить поле `telegram_user_id?: number` в `src/types.ts`
- [ ] В `ProfileView.tsx` добавить блок привязки Telegram:
  - [ ] кнопка “Привязать Telegram”
  - [ ] отображение текущего `telegram_user_id`/username
  - [ ] кнопка “Отвязать” (MVP можно пропустить)
- [ ] В `src/services/storage.ts` при создании уведомлений делать call `/api/telegram/notify` (MVP: ключевые места)

## Verification
- [ ] `npm run lint` (tsc --noEmit)
- [ ] `npm run build`
- [ ] Ручная проверка flow:
  - [ ] привязка через код в боте
  - [ ] дублирование уведомления в Telegram после действий на портале

