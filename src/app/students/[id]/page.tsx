import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getEngagementLevel, LEVEL_LABELS } from "@/lib/engagement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreChartWrapper } from "@/components/students/score-chart-wrapper";
import { type ScorePoint } from "@/components/students/score-chart";
import { ActivityHeatmapWrapper } from "@/components/students/activity-heatmap-wrapper";
import { ActivityType } from "@/generated/prisma/enums";
import { AppHeader } from "@/components/app-header";
import { calculateRisk, RISK_LEVEL_LABELS, RISK_LEVEL_STYLE } from "@/lib/risk";

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

export default async function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "TEACHER") redirect("/dashboard");

  const { id } = await params;

  // Студент
  const student = await db.user.findUnique({
    where: { id, role: "STUDENT" },
    select: { id: true, name: true, email: true, group: true, birthDate: true, createdAt: true },
  });
  if (!student) notFound();

  // Курсы преподавателя, на которые записан студент
  const enrollments = await db.enrollment.findMany({
    where: {
      userId: id,
      course: { teacherId: session.user.id },
    },
    include: { course: true },
  });
  const courses = enrollments.map((e) => e.course);
  const courseIds = courses.map((c) => c.id);

  // Оценки вовлечённости за последние 8 недель
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - 56);

  const scores = await db.engagementScore.findMany({
    where: { userId: id, courseId: { in: courseIds }, period: { gte: from } },
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
  const latestByCoarse = new Map<string, { score: number; period: Date }>();
  for (const s of scores) {
    const existing = latestByCoarse.get(s.courseId);
    if (!existing || s.period > existing.period) {
      latestByCoarse.set(s.courseId, { score: s.score, period: s.period });
    }
  }

  // Данные для heatmap (12 недель = 84 дня)
  const heatmapFrom = new Date();
  heatmapFrom.setUTCDate(heatmapFrom.getUTCDate() - 83);

  const heatmapRecords = await db.activity.findMany({
    where: { userId: id, courseId: { in: courseIds }, createdAt: { gte: heatmapFrom } },
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
    where: { userId: id, courseId: { in: courseIds }, createdAt: { gte: activityFrom } },
    include: { course: true, courseItem: { select: { title: true } } },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  // Последний вход
  const lastLogin = await db.activity.findFirst({
    where: { userId: id, type: "LOGIN" },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  // Прогресс по элементам курса
  const courseItems = await db.courseItem.findMany({
    where: { courseId: { in: courseIds } },
    select: { id: true, courseId: true },
  });

  const completedItems = await db.activity.findMany({
    where: { userId: id, courseItemId: { not: null } },
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

  // Риск снижения вовлечённости
  const scoreHistory = scores.map((s) => ({ score: s.score, period: s.period }));
  const activityForRisk = activities.map((a) => ({ type: a.type, createdAt: a.createdAt }));
  const risk = calculateRisk(scoreHistory, activityForRisk);

  return (
    <>
      <AppHeader name={session.user.name} email={session.user.email} />
      <div className="space-y-6 p-8">
        {/* Навигация */}
        <div>
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground text-sm">
            ← Дашборд
          </Link>
        </div>

        {/* Заголовок */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{student.name ?? student.email}</h1>
            <p className="text-muted-foreground text-sm">{student.email}</p>
          </div>
          <a
            href={`/api/export/student-pdf?id=${id}`}
            className="border-input bg-background hover:bg-accent rounded-md border px-3 py-2 text-sm"
          >
            Скачать PDF
          </a>
        </div>

        {/* Сводная информация */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {student.group && (
                <div>
                  <p className="text-muted-foreground text-xs">Группа</p>
                  <p className="text-sm font-medium">{student.group}</p>
                </div>
              )}
              {student.birthDate && (
                <div>
                  <p className="text-muted-foreground text-xs">Дата рождения</p>
                  <p className="text-sm font-medium">
                    {student.birthDate.toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground text-xs">Зарегистрирован</p>
                <p className="text-sm font-medium">
                  {student.createdAt.toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
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
            const entry = latestByCoarse.get(course.id);
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
              <span>Риск снижения вовлечённости</span>
              <span
                className={`rounded px-2.5 py-1 text-sm font-medium ${RISK_LEVEL_STYLE[risk.level]}`}
              >
                {RISK_LEVEL_LABELS[risk.level]} · {risk.score}%
              </span>
            </CardTitle>
          </CardHeader>
          {risk.factors.length > 0 && (
            <CardContent>
              <ul className="text-muted-foreground space-y-1 text-sm">
                {risk.factors.map((f, i) => (
                  <li key={i}>• {f}</li>
                ))}
              </ul>
            </CardContent>
          )}
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
