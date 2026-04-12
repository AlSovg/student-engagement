# API Documentation

Все API routes расположены в `src/app/api/`. Формат ответа: `{ data, error }`.

---

## Аутентификация

Управляется NextAuth.js v5. Все защищённые маршруты требуют активной сессии (JWT в cookie).

### `GET/POST /api/auth/[...nextauth]`

Обработчик NextAuth — логин, логаут, получение сессии.

**Credentials Login**

```http
POST /api/auth/callback/credentials
Content-Type: application/x-www-form-urlencoded

email=user@example.com&password=secret&csrfToken=...
```

**Ответ (успех):** устанавливает session cookie, редирект на `/dashboard`  
**Ответ (ошибка):** редирект на `/login?error=CredentialsSignin`

---

## Пользователи

### `POST /api/auth/register` _(Server Action)_

Регистрация через `src/app/(auth)/register/actions.ts`.

**Тело запроса (FormData):**

| Поле       | Тип                    | Обязательно |
| ---------- | ---------------------- | ----------- |
| `name`     | string                 | ✅          |
| `email`    | string (email)         | ✅          |
| `password` | string (min 8)         | ✅          |
| `role`     | `STUDENT` \| `TEACHER` | ✅          |

**Ответ:**

- Успех → redirect `/login`
- Ошибка → `{ error: string }`

---

## Активность _(v0.2.0)_

### `GET /api/activities`

Список активностей текущего пользователя.

**Query params:**

- `courseId` — фильтр по курсу
- `from`, `to` — диапазон дат (ISO 8601)

### `POST /api/activities`

Создание события активности.

```json
{
  "courseId": "clx...",
  "type": "MATERIAL_VIEW",
  "metadata": { "materialId": "abc" }
}
```

**Типы активности:** `LOGIN`, `MATERIAL_VIEW`, `ASSIGNMENT_SUBMIT`, `DISCUSSION_POST`, `QUIZ_COMPLETE`, `VIDEO_WATCH`

---

## Вовлеченность _(v0.3.0)_

### `GET /api/engagement/[userId]`

Индекс вовлеченности студента по курсу.

**Query params:** `courseId`, `period` (YYYY-MM-DD)

**Ответ:**

```json
{
  "data": {
    "score": 72.5,
    "period": "2026-04-07",
    "breakdown": {
      "loginFrequency": 20,
      "materialViews": 25,
      "assignments": 30,
      "discussions": 15,
      "quizzes": 10
    }
  }
}
```
