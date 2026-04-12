# Student Engagement Monitor

[![CI](https://github.com/AlSovg/student-engagement/actions/workflows/ci.yml/badge.svg)](https://github.com/AlSovg/student-engagement/actions/workflows/ci.yml)
[![Deploy](https://therealsujitk-vercel-badge.vercel.app/?app=student-engagement)](https://student-engagement.vercel.app)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)

Система мониторинга вовлеченности студентов на основе анализа цифрового следа. Отслеживает активность студентов на учебной платформе и визуализирует уровень их вовлеченности для преподавателей.

> Учебный проект · Магистратура · Информационные системы и технологии

## 🌐 Live Demo

**[student-engagement.vercel.app](https://student-engagement.vercel.app)**

## 🛠 Стек

| Слой               | Технология                                                                      |
| ------------------ | ------------------------------------------------------------------------------- |
| Frontend + Backend | [Next.js 16](https://nextjs.org) · App Router · Server Actions                  |
| База данных        | [PostgreSQL](https://postgresql.org) · [Neon](https://neon.tech) (serverless)   |
| ORM                | [Prisma 7](https://prisma.io) · Driver Adapter                                  |
| Аутентификация     | [NextAuth.js v5](https://authjs.dev) · JWT · Credentials                        |
| UI                 | [Tailwind CSS v4](https://tailwindcss.com) · [shadcn/ui](https://ui.shadcn.com) |
| Язык               | TypeScript 5                                                                    |
| Деплой             | [Vercel](https://vercel.com)                                                    |
| CI                 | GitHub Actions                                                                  |

## ✨ Возможности

**v0.1.0 — готово:**

- 🔐 Аутентификация (студент / преподаватель)
- 📝 Регистрация с выбором роли
- 🛡️ Защита маршрутов (proxy middleware)

**v0.2.0 — в работе:**

- 🌱 Seed тестовых данных (1 преподаватель, 5 студентов, 2 курса, активность за 4 недели)

**Планируется:**

- 📊 Импорт реальных данных активности (v0.2.0)
- 🧮 Расчёт индекса вовлеченности по формуле (v0.3.0)
- 📈 Дашборд преподавателя с графиками (v0.4.0)
- 👤 Профиль студента с историей активности (v0.5.0)

## 🚀 Быстрый старт

### Требования

- Node.js ≥ 20
- PostgreSQL ≥ 15 (или аккаунт [Neon](https://neon.tech))

### Установка

```bash
# 1. Клонировать репозиторий
git clone https://github.com/AlSovg/student-engagement.git
cd student-engagement

# 2. Установить зависимости
npm install

# 3. Настроить переменные окружения
cp .env.example .env
# Заполнить DATABASE_URL, AUTH_SECRET, AUTH_URL
```

### Переменные окружения

```env
DATABASE_URL="postgresql://user:password@host/db?sslmode=require"
AUTH_SECRET="..."   # npx auth secret
AUTH_URL="http://localhost:3000"
```

### Запуск

```bash
# Применить миграции БД
npx prisma migrate dev

# Заполнить БД тестовыми данными
npx prisma db seed

# Запустить dev-сервер
npm run dev
```

Открыть [http://localhost:3000](http://localhost:3000)

## 📁 Структура проекта

```
src/
├── app/
│   ├── (auth)/           # Login, Register
│   ├── dashboard/        # Дашборд преподавателя
│   ├── students/         # Профили студентов (v0.5.0)
│   └── api/auth/         # NextAuth handlers
├── components/ui/        # shadcn/ui компоненты
├── lib/
│   ├── auth.ts           # NextAuth конфиг
│   └── db.ts             # Prisma singleton
├── types/                # TypeScript расширения
└── proxy.ts              # Route protection
prisma/
└── schema.prisma         # Схема БД
docs/wiki/                # Документация → GitHub Wiki
```

## 📋 Roadmap

| Версия | Этап                               | Статус         |
| ------ | ---------------------------------- | -------------- |
| v0.1.0 | Project setup + Authentication     | ✅ Released    |
| v0.2.0 | Activity data generation           | 🔄 In progress |
| v0.3.0 | Engagement score calculation       | ⏳ Planned     |
| v0.4.0 | Teacher dashboard with charts      | ⏳ Planned     |
| v0.5.0 | Student profile + activity history | ⏳ Planned     |

## 📖 Документация

Полная документация в [GitHub Wiki](https://github.com/AlSovg/student-engagement/wiki):

- [API Documentation](https://github.com/AlSovg/student-engagement/wiki/API-Documentation)
- [Engagement Algorithm](https://github.com/AlSovg/student-engagement/wiki/Engagement-Algorithm)
- [Developer Guide](https://github.com/AlSovg/student-engagement/wiki/Developer-Guide)
