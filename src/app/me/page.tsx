import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getEngagementLevel, LEVEL_LABELS } from "@/lib/engagement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreChartWrapper } from "@/components/students/score-chart-wrapper";
import { type ScorePoint } from "@/components/students/score-chart";
import { ActivityHeatmapWrapper } from "@/components/students/activity-heatmap-wrapper";
import { ActivityType } from "@/generated/prisma/enums";
import { AppHeader } from "@/components/app-header";
import { calculateRisk, RISK_LEVEL_LABELS, RISK_LEVEL_STYLE, type RiskLevel } from "@/lib/risk";

const RISK_MESSAGE: Record<RiskLevel, string> = {
  low: "Отличная работа! Вы активно участвуете в курсах и своевременно выполняете задания. Так держать!",
  medium:
    "Есть куда расти. Старайтесь чаще заходить на платформу и не откладывайте сдачу заданий — это заметно улучшит ваш показатель.",
  high: "Уровень вовлечённости вызывает беспокойство. Постарайтесь проявить больше активности: выполняйте задания, просматривайте материалы и участвуйте в обсуждениях.",
};

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  LOGIN: "Вход в систему",
  MATERIAL_VIEW: "Просмотр материала",
  ASSIGNMENT_SUBMIT: "Сдача задания",
  DISCUSSION_POST: "Сообщение в обсуждении",
  QUIZ_COMPLETE: "Прохождение теста",
  VIDEO_WATCH: "Просмотр видео",
};

const LEVEL_STYLE = {
  high: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

export default async function MePage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "STUDENT") redirect("/dashboard");

  const userId = session.user.id;

  // Все курсы, на которые записан студент
  const enrollments = await db.enrollment.findMany({
    where: { userId },
    include: { course: true },
  });
  const courses = enrollments.map((e) => e.course);
  const courseIds = courses.map((c) => c.id);

  // Оценки вовлечённости за последние 8 недель
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - 56);

  const scores = await db.engagementScore.findMany({
    where: { userId, courseId: { in: courseIds }, period: { gte: from } },
    orderBy: { period: "asc" },
  });

  // Данные для графика
  const weekMap = new Map<string, { label: string; byCoarse: Record<string, number> }>();
  for (const s of scores) {
    const key = s.period.toISOString();
    const label = s.period.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
    if (!weekMap.has(key)) weekMap.set(key, { label, byCoarse: {} });
    const course = courses.find((c) => c.id === s.courseId)!;
    weekMap.get(key)!.byCoarse[course.name] = s.score;
  }

  const chartData: ScorePoint[] = Array.from(weekMap.values()).map(({ label, byCoarse }) => ({
    week: label,
    ...byCoarse,
  }));

  // Последний score на курс
  const latestByCourse = new Map<string, { score: number; period: Date }>();
  for (const s of scores) {
    const existing = latestByCourse.get(s.courseId);
    if (!existing || s.period > existing.period) {
      latestByCourse.set(s.courseId, { score: s.score, period: s.period });
    }
  }

  // Данные для heatmap (12 недель = 84 дня)
  const heatmapFrom = new Date();
  heatmapFrom.setUTCDate(heatmapFrom.getUTCDate() - 83);

  const heatmapRecords = await db.activity.findMany({
    where: { userId, courseId: { in: courseIds }, createdAt: { gte: heatmapFrom } },
    select: { createdAt: true },
  });

  const heatmapData: Record<string, number> = {};
  for (const r of heatmapRecords) {
    const key = r.createdAt.toISOString().slice(0, 10);
    heatmapData[key] = (heatmapData[key] ?? 0) + 1;
  }

  // История активности за последние 4 недели
  const activityFrom = new Date();
  activityFrom.setUTCDate(activityFrom.getUTCDate() - 28);

  const activities = await db.activity.findMany({
    where: { userId, courseId: { in: courseIds }, createdAt: { gte: activityFrom } },
    include: { course: true, courseItem: { select: { title: true } } },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  // Последний вход
  const lastLogin = await db.activity.findFirst({
    where: { userId, type: "LOGIN" },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  // Прогресс по элементам курса
  const courseItems = await db.courseItem.findMany({
    where: { courseId: { in: courseIds } },
    select: { id: true, courseId: true },
  });

  const completedItems = await db.activity.findMany({
    where: { userId, courseItemId: { not: null } },
    select: { courseItemId: true, courseId: true },
    distinct: ["courseItemId"],
  });

  const completedSet = new Set(completedItems.map((a) => a.courseItemId));

  // Статистика активности по типам
  const activityStats = activities.reduce(
    (acc, a) => {
      acc[a.type] = (acc[a.type] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Профиль студента
  const profile = await db.user.findUnique({
    where: { id: userId },
    select: { group: true, birthDate: true, createdAt: true },
  });

  // Риск снижения вовлечённости
  const scoreHistory = scores.map((s) => ({ score: s.score, period: s.period }));
  const activityForRisk = activities.map((a) => ({ type: a.type, createdAt: a.createdAt }));
  const risk = calculateRisk(scoreHistory, activityForRisk);

  return (
    <>
      <AppHeader name={session.user.name} email={session.user.email} />
      <div className="space-y-6 p-8">
        {/* Заголовок */}
        <div>
          <h1 className="text-2xl font-bold">{session.user.name ?? session.user.email}</h1>
          <p className="text-muted-foreground text-sm">{session.user.email}</p>
        </div>

        {/* Сводная информация */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {profile?.group && (
                <div>
                  <p className="text-muted-foreground text-xs">Группа</p>
                  <p className="text-sm font-medium">{profile.group}</p>
                </div>
              )}
              {profile?.birthDate && (
                <div>
                  <p className="text-muted-foreground text-xs">Дата рождения</p>
                  <p className="text-sm font-medium">
                    {profile.birthDate.toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              )}
              {profile?.createdAt && (
                <div>
                  <p className="text-muted-foreground text-xs">Зарегистрирован</p>
                  <p className="text-sm font-medium">
                    {profile.createdAt.toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              )}
              {lastLogin && (
                <div>
                  <p className="text-muted-foreground text-xs">Последний вход</p>
                  <p className="text-sm font-medium">
                    {lastLogin.createdAt.toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              )}
            </div>
            {Object.keys(activityStats).length > 0 && (
              <div className="mt-4 border-t pt-4">
                <p className="text-muted-foreground mb-2 text-xs">Активность за 4 недели</p>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["MATERIAL_VIEW", "Просмотры"],
                      ["VIDEO_WATCH", "Видео"],
                      ["ASSIGNMENT_SUBMIT", "Задания"],
                      ["QUIZ_COMPLETE", "Тесты"],
                      ["DISCUSSION_POST", "Обсуждения"],
                      ["LOGIN", "Входы"],
                    ] as [string, string][]
                  )
                    .filter(([type]) => activityStats[type])
                    .map(([type, label]) => (
                      <span
                        key={type}
                        className="bg-muted rounded-full px-3 py-0.5 text-xs font-medium"
                      >
                        {label}: {activityStats[type]}
                      </span>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Текущие индексы по курсам */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {courses.map((course) => {
            const entry = latestByCourse.get(course.id);
            const score = entry?.score ?? null;
            const level = score !== null ? getEngagementLevel(score) : null;
            const total = courseItems.filter((i) => i.courseId === course.id).length;
            const completed = courseItems.filter(
              (i) => i.courseId === course.id && completedSet.has(i.id)
            ).length;
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
            return (
              <Card key={course.id}>
                <CardHeader>
                  <CardTitle>{course.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {score !== null && level ? (
                    <div className="flex items-end gap-3">
                      <span className="text-4xl font-bold">{score}</span>
                      <span className={`mb-1 rounded px-2 py-0.5 text-sm ${LEVEL_STYLE[level]}`}>
                        {LEVEL_LABELS[level]}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">Нет данных</span>
                  )}
                  {total > 0 && (
                    <div className="space-y-1">
                      <div className="text-muted-foreground flex justify-between text-xs">
                        <span>Прогресс по элементам</span>
                        <span>
                          {completed} / {total} ({pct}%)
                        </span>
                      </div>
                      <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                        <div
                          className="h-2 rounded-full bg-green-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Риск */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Уровень риска</span>
              <span
                className={`rounded px-2.5 py-1 text-sm font-medium ${RISK_LEVEL_STYLE[risk.level]}`}
              >
                {RISK_LEVEL_LABELS[risk.level]} · {risk.score}%
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">{RISK_MESSAGE[risk.level]}</p>
          </CardContent>
        </Card>

        {/* График + Heatmap */}
        <Card>
          <div className="grid grid-cols-1 divide-y lg:grid-cols-[3fr_1fr] lg:divide-x lg:divide-y-0">
            <div className="p-6">
              <p className="mb-4 text-lg font-semibold">Динамика вовлечённости (8 недель)</p>
              <ScoreChartWrapper data={chartData} courseNames={courses.map((c) => c.name)} />
            </div>
            <div className="p-6">
              <p className="mb-4 text-lg font-semibold">Активность (последние 12 недель)</p>
              <ActivityHeatmapWrapper data={heatmapData} />
            </div>
          </div>
        </Card>

        {/* История активности */}
        <Card>
          <CardHeader>
            <CardTitle>История активности (последние 4 недели)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-4 py-3 font-medium">Дата</th>
                    <th className="px-4 py-3 font-medium">Тип</th>
                    <th className="px-4 py-3 font-medium">Элемент курса</th>
                    <th className="px-4 py-3 font-medium">Курс</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-muted-foreground px-4 py-6 text-center">
                        Нет активности за последние 4 недели
                      </td>
                    </tr>
                  ) : (
                    activities.map((a) => (
                      <tr key={a.id} className="hover:bg-muted/30 border-b last:border-0">
                        <td className="text-muted-foreground px-4 py-2.5">
                          {a.createdAt.toLocaleDateString("ru-RU", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-2.5">{ACTIVITY_LABELS[a.type]}</td>
                        <td className="px-4 py-2.5">
                          {a.courseItem ? (
                            a.courseItem.title
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="text-muted-foreground px-4 py-2.5">{a.course.name}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
