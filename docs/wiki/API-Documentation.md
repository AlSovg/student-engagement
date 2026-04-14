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

## Импорт и экспорт _(v0.8.0)_

### `previewCSV(formData)` _(Server Action)_

Парсит и валидирует CSV-файл перед импортом. Расположен в `src/app/import/actions.ts`.

**FormData:** поле `file` — CSV-файл.

**Формат CSV:**

```csv
email,activity_type,course_id,datetime
student1@university.edu,MATERIAL_VIEW,course-id-here,2026-04-01T10:30:00Z
```

**Ответ:** `{ rows: PreviewRow[], validCount: number, invalidCount: number }`

Каждая строка содержит `status: "valid" | "error"` и `error?: string`.

**Валидация каждой строки:**

- `email` — существует в БД как `STUDENT`
- `activity_type` — значение из enum `ActivityType`
- `course_id` — курс существует и студент на него записан
- `datetime` — корректная ISO-строка

---

### `importCSV(rows)` _(Server Action)_

Batch-создаёт записи `Activity` и запускает `recalculateScores()`.

**Вход:** массив валидных строк из `previewCSV`.  
**Ответ:** `{ imported: number }`

---

### `GET /api/export/dashboard-csv`

Экспорт отфильтрованного дашборда в CSV.

**Права доступа:** только `TEACHER`.

**Query params** (те же, что на дашборде):

| Параметр | Описание                   |
| -------- | -------------------------- |
| `course` | ID курса                   |
| `group`  | Академическая группа       |
| `level`  | Уровень вовлечённости      |
| `search` | Поиск по имени/email       |
| `sort`   | `score` / `name` / `group` |

**Ответ:** `text/csv` с BOM-префиксом (UTF-8, совместимость с Excel).

Колонки: `Имя`, `Email`, `Группа`, `<курс 1>`, ..., `Средний индекс`, `Уровень`.

---

### `GET /api/export/dashboard-pdf`

Экспорт дашборда в PDF (landscape A4).

**Права доступа:** только `TEACHER`.

**Query params:** те же, что у `dashboard-csv`.

**Содержимое PDF:**

- Заголовок + активные фильтры + дата генерации
- Блок общей статистики (все студенты): кол-во, средний индекс, распределение по уровням
- Таблица отфильтрованных студентов с индексами по курсам и уровнями

---

### `GET /api/export/student-pdf`

Экспорт профиля студента в PDF (A4).

**Права доступа:** только `TEACHER`.

**Query params:**

| Параметр | Описание    |
| -------- | ----------- |
| `id`     | ID студента |

**Содержимое PDF:**

- Имя, email, дата генерации
- Таблица индексов вовлечённости по курсам (за последние 8 недель)
- Таблица истории активности (последние 4 недели, до 60 записей)

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
