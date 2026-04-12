# Changelog

All notable changes will be documented here.  
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)  
Versioning: [Semantic Versioning](https://semver.org/) — minor bump per MVP milestone.

---

## [Unreleased] — v0.2.0

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

| Version | Milestone                          |
| ------- | ---------------------------------- |
| v0.1.0  | ✅ Project setup + Authentication  |
| v0.2.0  | Activity data generation / import  |
| v0.3.0  | Engagement score calculation       |
| v0.4.0  | Teacher dashboard with charts      |
| v0.5.0  | Student profile + activity history |
