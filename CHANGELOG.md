# Changelog

All notable changes will be documented here.  
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)  
Versioning: [Semantic Versioning](https://semver.org/) — minor bump per MVP milestone.

---

## [Unreleased]

---

## [0.8.0] — 2026-04-14

### Added

- CSV-импорт активности `/import`: загрузка файла → предпросмотр с построчной валидацией → подтверждение → пересчёт индексов
- Валидация строк при импорте: email существует как STUDENT, тип активности из enum, курс существует и студент записан, корректный ISO-datetime
- Экспорт дашборда в CSV (`GET /api/export/dashboard-csv`) с учётом активных фильтров, BOM-префикс для Excel
- Экспорт дашборда в PDF (`GET /api/export/dashboard-pdf`) — общая статистика + отфильтрованная таблица студентов (landscape A4)
- Экспорт профиля студента в PDF (`GET /api/export/student-pdf?id=`) — индексы по курсам + история активности
- Кнопки «Импорт CSV», «Скачать CSV», «Скачать PDF» на дашборде преподавателя
- Кнопка «Скачать PDF» на странице профиля студента
- PDF-компоненты `DashboardReport` и `StudentReport` (`@react-pdf/renderer`) с кириллическим шрифтом Roboto

### Technical

- `papaparse` — парсинг CSV в Server Action
- `@react-pdf/renderer` — серверная генерация PDF (`runtime = "nodejs"`)
- PDF-компоненты типизированы через `DocumentBaseProps` (без `as any`)

---

## [0.7.0] — 2026-04-13

### Added

- Фильтрация таблицы студентов: по курсу, академической группе, уровню вовлечённости, имени/email
- Сортировка таблицы: по индексу (по умолчанию), по имени, по группе
- URL-параметры для фильтров (`?course=...&group=...&level=...&search=...&sort=...`) — sharable links
- График динамики пересчитывается по отфильтрованному набору студентов и курсу
- Колонка дисциплины в таблице скрывается при фильтре по конкретному курсу
- Колонка «Группа» в таблице студентов
- Поле `group` (String, optional) на модели `User` — номер академической группы
- Студентам в seed назначены группы: «ИСТ-2025» (1, 2, 5) и «ИСТ-2024» (3, 4)

---

## [0.6.0] — 2026-04-13

### Added

- Личный кабинет студента `/me`: индексы по курсам, 8-недельный график, история активности
- Ролевой редирект: `STUDENT → /me`, `TEACHER → /dashboard` при входе и через proxy
- Защита маршрутов: студент не может открыть `/dashboard`, преподаватель — `/me`
- Компонент `AppHeader` с кнопкой «Выйти» (`signOut`) на дашборде, `/me` и профиле студента

---

## [0.5.0] — 2026-04-13

### Added

- Страница `/students/[id]` — профиль студента (только для teacher)
- Карточки текущего индекса вовлечённости по каждому курсу с уровневым бейджем
- График динамики за 8 недель (`ScoreChart` + `ScoreChartWrapper`)
- Таблица истории активности за последние 4 недели (60 записей, тип на русском)
- Имена студентов в дашборде — кликабельные ссылки на профиль

### Fixed

- SSL deprecation warning от `pg` — `sslmode=require` → `sslmode=verify-full` в `db.ts` и `seed.ts`
- `next dev --no-turbopack` → `--webpack` (корректный флаг для Next.js 16)

---

## [0.4.0] — 2026-04-13

### Added

- Дашборд преподавателя: сводные карточки (студентов, средний индекс, распределение по уровням)
- График динамики вовлечённости за 4 недели (recharts LineChart, по курсам)
- Таблица студентов с последним индексом по каждому курсу и уровневыми бейджами
- Кнопка «Пересчитать индексы» — вызывает `POST /api/engagement/recalculate`, обновляет страницу
- `src/components/dashboard/engagement-chart.tsx` — client-компонент графика
- `src/components/dashboard/recalculate-button.tsx` — client-компонент кнопки

### Fixed

- recharts SSR: `dynamic({ ssr: false })` вынесен в `EngagementChartWrapper` ("use client")
- Turbopack + Tailwind CSS v4 конфликт — переключён на webpack

---

## [0.3.0] — 2026-04-13

### Added

- `src/lib/engagement.ts`: расчёт индекса вовлечённости (0–100) по формуле из Engagement-Algorithm.md
- `calculateScore()` — чистая функция по весам и порогам насыщения
- `recalculateScores()` — пересчёт и запись в таблицу `EngagementScore`
- `getEngagementLevel()` / `LEVEL_LABELS` — интерпретация результата
- `POST /api/engagement/recalculate` — endpoint пересчёта (только teacher)

---

## [0.2.0] — 2026-04-12

### Added

- `prisma/seed.ts`: 1 преподаватель, 5 студентов, 2 курса, активность за 4 недели, EngagementScore
- Seed зарегистрирован в `prisma.config.ts` (`migrations.seed`)
- `dev`-ветка как интеграционная база для фичей
- Branching strategy описана в Developer Guide

---

## [0.1.0] — 2026-04-12

### Added

- Project scaffold: Next.js 16, TypeScript, Tailwind CSS v4, shadcn/ui
- Prisma 7 schema: User, Course, Enrollment, Activity, EngagementScore + NextAuth tables
- Prisma adapter-pg (driver adapter) + `src/lib/db.ts` singleton
- NextAuth v5: Credentials provider, JWT strategy, роли student/teacher в сессии
- `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`
- NextAuth session type extensions (id, role)
- bcryptjs для хэширования паролей
- Страница login (`/login`) с client-side signIn
- Страница register (`/register`) с server action + useActionState
- Route protection через `src/proxy.ts` (Next.js 16)
- Базовая страница `/dashboard` с отображением имени и роли
- Начальная миграция БД применена

---

## Roadmap

| Version | Milestone                             |
| ------- | ------------------------------------- |
| v0.1.0  | ✅ Project setup + Authentication     |
| v0.2.0  | ✅ Activity data generation           |
| v0.3.0  | ✅ Engagement score calculation       |
| v0.4.0  | ✅ Teacher dashboard with charts      |
| v0.5.0  | ✅ Student profile + activity history |
| v0.6.0  | ✅ Student personal cabinet + logout  |
| v0.7.0  | ✅ Interactive dashboard filters      |
| v0.8.0  | ✅ CSV import + CSV/PDF export        |
