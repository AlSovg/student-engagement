# Developer Guide

## Требования

- Node.js ≥ 20
- PostgreSQL ≥ 15
- npm ≥ 10
- gh CLI (для работы с GitHub)

---

## Первый запуск

### 1. Клонировать репозиторий

```bash
git clone https://github.com/<owner>/student-engagement.git
cd student-engagement
```

### 2. Установить зависимости

```bash
npm install
```

### 3. Настроить переменные окружения

Скопировать `.env.example` (создай из `.env`) и заполнить:

```env
# База данных PostgreSQL
DATABASE_URL="postgresql://postgres:password@localhost:5432/student_engagement?schema=public"

# NextAuth
AUTH_SECRET="..."       # npx auth secret
AUTH_URL="http://localhost:3000"
```

### 4. Применить схему БД

```bash
npx prisma migrate dev
```

### 5. Заполнить БД тестовыми данными

```bash
npx prisma db seed
```

| Email                     | Пароль      | Роль          |
| ------------------------- | ----------- | ------------- |
| `teacher@university.edu`  | password123 | Преподаватель |
| `student1@university.edu` | password123 | Студент       |
| `student2@university.edu` | password123 | Студент       |
| `student3@university.edu` | password123 | Студент       |
| `student4@university.edu` | password123 | Студент       |
| `student5@university.edu` | password123 | Студент       |

Seed идемпотентен — повторный запуск не дублирует данные.

### 6. Запустить dev-сервер

```bash
npm run dev
```

Открыть: http://localhost:3000

---

## Полезные команды

| Команда                                | Описание                           |
| -------------------------------------- | ---------------------------------- |
| `npm run dev`                          | Dev-сервер с Turbopack             |
| `npm run build`                        | Production сборка                  |
| `npm run lint`                         | ESLint                             |
| `npm run format`                       | Prettier — форматировать всё       |
| `npm run format:check`                 | Prettier — проверить без изменений |
| `npx tsc --noEmit`                     | TypeScript проверка                |
| `npx prisma db seed`                   | Заполнить БД тестовыми данными     |
| `npx prisma studio`                    | GUI для БД                         |
| `npx prisma migrate dev --name <name>` | Новая миграция                     |
| `npx prisma generate`                  | Регенерация клиента                |

---

## Структура проекта

```
src/
  app/
    (auth)/           # Login, Register
    dashboard/        # Дашборд преподавателя
    students/         # Профили студентов (v0.5.0)
    api/              # API routes
  components/ui/      # shadcn/ui компоненты
  lib/
    auth.ts           # NextAuth конфиг
    db.ts             # Prisma singleton
    engagement.ts     # Алгоритм вовлеченности (v0.3.0)
  types/
    next-auth.d.ts    # Расширение типов сессии
  proxy.ts            # Route protection (Next.js 16)
prisma/
  schema.prisma       # Схема БД
  seed.ts             # Тестовые данные
docs/wiki/            # Документация (синхронизируется с GitHub Wiki)
```

---

## Workflow разработки

1. Создать ветку: `git checkout -b feat/feature-name`
2. Разработать фичу
3. Убедиться в чистоте TS: `npx tsc --noEmit`
4. Commit: `git commit -m "feat: описание"`
5. Push + PR → CI проверит типы и lint
6. Merge в main → автодеплой на Vercel + обновление Wiki

---

## Secrets для GitHub Actions

| Secret              | Где взять                              |
| ------------------- | -------------------------------------- |
| `VERCEL_TOKEN`      | vercel.com → Settings → Tokens         |
| `VERCEL_ORG_ID`     | `vercel env pull` или Vercel dashboard |
| `VERCEL_PROJECT_ID` | `vercel env pull` или Vercel dashboard |

> Wiki sync использует встроенный `GITHUB_TOKEN` — отдельный секрет не нужен (работает для публичных репо).
