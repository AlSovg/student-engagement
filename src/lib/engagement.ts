import { ActivityType } from "@/generated/prisma/enums";
import { db } from "@/lib/db";

// --- Конфигурация алгоритма (см. docs/wiki/Engagement-Algorithm.md) ---

interface ComponentConfig {
  weight: number; // доля в итоговом счёте (сумма = 1.0)
  max: number; // порог насыщения (события в неделю)
}

const SCORE_CONFIG: Partial<Record<ActivityType, ComponentConfig>> = {
  [ActivityType.LOGIN]: { weight: 0.1, max: 7 },
  [ActivityType.MATERIAL_VIEW]: { weight: 0.25, max: 20 },
  [ActivityType.ASSIGNMENT_SUBMIT]: { weight: 0.3, max: 5 },
  [ActivityType.DISCUSSION_POST]: { weight: 0.2, max: 10 },
  [ActivityType.QUIZ_COMPLETE]: { weight: 0.15, max: 5 },
};

// --- Чистая функция расчёта ---

/**
 * Рассчитывает индекс вовлеченности (0–100) по набору активностей за одну неделю.
 * @param counts количество событий каждого типа за период
 */
export function calculateScore(counts: Partial<Record<ActivityType, number>>): number {
  let score = 0;
  for (const [type, cfg] of Object.entries(SCORE_CONFIG) as [ActivityType, ComponentConfig][]) {
    const count = counts[type] ?? 0;
    score += cfg.weight * Math.min(count / cfg.max, 1);
  }
  return Math.round(score * 100 * 10) / 10; // 0–100, одна цифра после запятой
}

// --- Интерпретация результата ---

export type EngagementLevel = "high" | "medium" | "low" | "critical";

export function getEngagementLevel(score: number): EngagementLevel {
  if (score >= 80) return "high";
  if (score >= 50) return "medium";
  if (score >= 20) return "low";
  return "critical";
}

export const LEVEL_LABELS: Record<EngagementLevel, string> = {
  high: "Высокая",
  medium: "Средняя",
  low: "Низкая",
  critical: "Критическая",
};

// --- Пересчёт и запись в БД ---

/** Начало недели (понедельник 00:00:00 UTC) для произвольной даты */
function weekStart(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay(); // 0=вс
  d.setUTCDate(d.getUTCDate() - ((day + 6) % 7)); // сдвиг к понедельнику
  return d;
}

/**
 * Пересчитывает EngagementScore для заданного студента и курса (или всех сразу).
 * Покрывает последние `weeksBack` недель.
 */
export async function recalculateScores({
  userId,
  courseId,
  weeksBack = 8,
}: {
  userId?: string;
  courseId?: string;
  weeksBack?: number;
} = {}) {
  // Определяем границы периода
  const now = new Date();
  const from = new Date(now);
  from.setUTCDate(from.getUTCDate() - weeksBack * 7);

  // Получаем активности из БД
  const activities = await db.activity.findMany({
    where: {
      ...(userId ? { userId } : {}),
      ...(courseId ? { courseId } : {}),
      createdAt: { gte: from },
    },
    select: { userId: true, courseId: true, type: true, createdAt: true },
  });

  // Группируем: { userId → { courseId → { weekISO → { type → count } } } }
  const grouped: Record<
    string,
    Record<string, Record<string, Partial<Record<ActivityType, number>>>>
  > = {};

  for (const act of activities) {
    const week = weekStart(act.createdAt).toISOString();
    grouped[act.userId] ??= {};
    grouped[act.userId][act.courseId] ??= {};
    grouped[act.userId][act.courseId][week] ??= {};
    grouped[act.userId][act.courseId][week][act.type] =
      (grouped[act.userId][act.courseId][week][act.type] ?? 0) + 1;
  }

  // Upsert EngagementScore
  const upserts: Promise<unknown>[] = [];

  for (const [uid, courses] of Object.entries(grouped)) {
    for (const [cid, weeks] of Object.entries(courses)) {
      for (const [weekISO, counts] of Object.entries(weeks)) {
        const period = new Date(weekISO);
        const score = calculateScore(counts);
        upserts.push(
          db.engagementScore.upsert({
            where: { userId_courseId_period: { userId: uid, courseId: cid, period } },
            update: { score },
            create: { userId: uid, courseId: cid, score, period },
          })
        );
      }
    }
  }

  await Promise.all(upserts);
  return { updated: upserts.length };
}
