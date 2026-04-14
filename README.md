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

- 🔐 Аутентификация: студент / преподаватель, ролевые редиректы
- 🌱 Seed тестовых данных (5 студентов, 2 курса, активность за 4 недели)
- 🧮 Расчёт индекса вовлечённости по взвешенной формуле (0–100)
- 📊 Дашборд преподавателя: карточки, график, таблица студентов
- 🔍 Фильтрация и сортировка по курсу, группе, уровню, имени — через URL-параметры
- 👤 Профиль студента: индексы по курсам, 8-недельный график, история активности
- 🧑‍🎓 Личный кабинет студента (`/me`)
- 📥 CSV-импорт активности с предпросмотром и построчной валидацией
- 📤 Экспорт дашборда в CSV и PDF (с учётом фильтров)
- 📄 Экспорт профиля студента в PDF

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
│   ├── students/         # Профили студентов
│   ├── me/               # Личный кабинет студента
│   ├── import/           # CSV-импорт активности
│   └── api/
│       ├── auth/         # NextAuth handlers
│       ├── engagement/   # Пересчёт индексов
│       └── export/       # CSV и PDF экспорт
├── components/
│   ├── ui/               # shadcn/ui компоненты
│   ├── dashboard/        # Компоненты дашборда
│   ├── students/         # Компоненты профиля
│   └── pdf/              # PDF-шаблоны (@react-pdf/renderer)
├── lib/
│   ├── auth.ts           # NextAuth конфиг
│   ├── db.ts             # Prisma singleton
│   └── engagement.ts     # Расчёт индекса
├── types/                # TypeScript расширения
└── proxy.ts              # Route protection
prisma/
└── schema.prisma         # Схема БД
docs/wiki/                # Документация → GitHub Wiki
```

## 📋 Roadmap

| Версия | Этап                               | Статус      |
| ------ | ---------------------------------- | ----------- |
| v0.1.0 | Project setup + Authentication     | ✅ Released |
| v0.2.0 | Activity data generation           | ✅ Released |
| v0.3.0 | Engagement score calculation       | ✅ Released |
| v0.4.0 | Teacher dashboard with charts      | ✅ Released |
| v0.5.0 | Student profile + activity history | ✅ Released |
| v0.6.0 | Student personal cabinet + logout  | ✅ Released |
| v0.7.0 | Interactive dashboard with filters | ✅ Released |
| v0.8.0 | CSV import + CSV/PDF export        | ✅ Released |
| v0.9.0 | Activity heatmap (12 weeks)        | ✅ Released |

## 📖 Документация

Полная документация в [GitHub Wiki](https://github.com/AlSovg/student-engagement/wiki):

- [API Documentation](https://github.com/AlSovg/student-engagement/wiki/API-Documentation)
- [Engagement Algorithm](https://github.com/AlSovg/student-engagement/wiki/Engagement-Algorithm)
- [Developer Guide](https://github.com/AlSovg/student-engagement/wiki/Developer-Guide)
