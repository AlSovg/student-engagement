import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getEngagementLevel, LEVEL_LABELS, type EngagementLevel } from "@/lib/engagement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartPoint } from "@/components/dashboard/engagement-chart";
import { EngagementChartWrapper } from "@/components/dashboard/engagement-chart-wrapper";
import { RecalculateButton } from "@/components/dashboard/recalculate-button";
import { AppHeader } from "@/components/app-header";
import { DashboardFilters } from "@/components/dashboard/dashboard-filters";

// Цвета бейджей уровня
const LEVEL_STYLE: Record<EngagementLevel, string> = {
  high: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    course?: string;
    group?: string;
    level?: string;
    search?: string;
    sort?: string;
  }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const isTeacher = session.user.role === "TEACHER";

  // --- Данные для преподавателя ---
  if (!isTeacher) {
    return (
      <div className="p-8">
        <h1 className="mb-2 text-2xl font-bold">Дашборд</h1>
        <p className="text-gray-500">
          Добро пожаловать, {session.user.name}. Дашборд доступен только преподавателям.
        </p>
      </div>
    );
  }

  // 1. Курсы преподавателя
  const courses = await db.course.findMany({
    where: { teacherId: session.user.id },
    orderBy: { name: "asc" },
  });
  const courseIds = courses.map((c) => c.id);

  // 2. Оценки вовлечённости за последние 4 недели
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - 28);

  const scores = await db.engagementScore.findMany({
    where: { courseId: { in: courseIds }, period: { gte: from } },
    include: { user: { select: { id: true, name: true, email: true, group: true } } },
    orderBy: { period: "asc" },
  });

  // 3. Данные таблицы: последний score на студента × курс
  const latestMap = new Map<string, (typeof scores)[0]>();
  for (const s of scores) {
    const k = `${s.userId}_${s.courseId}`;
    const prev = latestMap.get(k);
    if (!prev || s.period > prev.period) latestMap.set(k, s);
  }

  type StudentRow = {
    id: string;
    name: string;
    email: string;
    group: string | null;
    scores: { courseId: string; courseName: string; score: number; level: EngagementLevel }[];
    avgScore: number;
  };

  const studentMap = new Map<string, StudentRow>();
  for (const s of latestMap.values()) {
    if (!studentMap.has(s.userId)) {
      studentMap.set(s.userId, {
        id: s.userId,
        name: s.user.name ?? s.user.email,
        email: s.user.email,
        group: s.user.group,
        scores: [],
        avgScore: 0,
      });
    }
    const course = courses.find((c) => c.id === s.courseId)!;
    studentMap.get(s.userId)!.scores.push({
      courseId: s.courseId,
      courseName: course.name,
      score: s.score,
      level: getEngagementLevel(s.score),
    });
  }

  const students: StudentRow[] = Array.from(studentMap.values()).map((r) => ({
    ...r,
    avgScore: r.scores.reduce((acc, s) => acc + s.score, 0) / (r.scores.length || 1),
  }));

  // 5. Фильтрация и сортировка по searchParams
  const f = await searchParams;

  let filtered = students;
  if (f.course) filtered = filtered.filter((s) => s.scores.some((sc) => sc.courseId === f.course));
  if (f.group) filtered = filtered.filter((s) => s.group === f.group);
  if (f.level) filtered = filtered.filter((s) => getEngagementLevel(s.avgScore) === f.level);
  if (f.search) {
    const q = f.search.toLowerCase();
    filtered = filtered.filter(
      (s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    );
  }

  if (f.sort === "name")
    filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name, "ru"));
  else if (f.sort === "group")
    filtered = [...filtered].sort((a, b) => (a.group ?? "").localeCompare(b.group ?? "", "ru"));
  else filtered = [...filtered].sort((a, b) => b.avgScore - a.avgScore);

  // 6. График: строим по отфильтрованным студентам и курсу
  const filteredIds = new Set(filtered.map((s) => s.id));
  const chartCourses = f.course ? courses.filter((c) => c.id === f.course) : courses;

  const weekMap = new Map<string, Record<string, { sum: number; count: number }>>();
  const weekLabels = new Map<string, string>();

  for (const s of scores) {
    if (!filteredIds.has(s.userId)) continue;
    if (f.course && s.courseId !== f.course) continue;
    const key = s.period.toISOString();
    const label = s.period.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
    weekLabels.set(key, label);
    if (!weekMap.has(key)) weekMap.set(key, {});
    const entry = weekMap.get(key)!;
    const course = courses.find((c) => c.id === s.courseId)!;
    entry[course.name] ??= { sum: 0, count: 0 };
    entry[course.name].sum += s.score;
    entry[course.name].count += 1;
  }

  const chartData: ChartPoint[] = Array.from(weekMap.entries()).map(([key, byCoarse]) => {
    const point: ChartPoint = { week: weekLabels.get(key)! };
    for (const course of chartCourses) {
      const agg = byCoarse[course.name];
      point[course.name] = agg ? Math.round((agg.sum / agg.count) * 10) / 10 : 0;
    }
    return point;
  });

  // 7. Сводная статистика (по всем студентам, без фильтров)
  const totalStudents = students.length;
  const avgScore =
    totalStudents > 0
      ? Math.round((students.reduce((a, s) => a + s.avgScore, 0) / totalStudents) * 10) / 10
      : 0;
  const levelCounts = { high: 0, medium: 0, low: 0, critical: 0 };
  for (const s of students) levelCounts[getEngagementLevel(s.avgScore)]++;

  // 7. Уникальные группы для фильтра
  const allGroups = [...new Set(students.map((s) => s.group).filter(Boolean) as string[])].sort();

  // 8. URL для экспорта с текущими фильтрами
  const exportParams = new URLSearchParams();
  if (f.course) exportParams.set("course", f.course);
  if (f.group) exportParams.set("group", f.group);
  if (f.level) exportParams.set("level", f.level);
  if (f.search) exportParams.set("search", f.search);
  if (f.sort) exportParams.set("sort", f.sort);
  const exportQuery = exportParams.toString() ? `?${exportParams.toString()}` : "";

  return (
    <>
      <AppHeader name={session.user.name} email={session.user.email} />
      <div className="space-y-6 p-8">
        {/* Заголовок */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Дашборд преподавателя</h1>
            <p className="text-muted-foreground text-sm">{session.user.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/import"
              className="border-input bg-background hover:bg-accent rounded-md border px-3 py-2 text-sm"
            >
              Импорт CSV
            </Link>
            <a
              href={`/api/export/dashboard-csv${exportQuery}`}
              className="border-input bg-background hover:bg-accent rounded-md border px-3 py-2 text-sm"
            >
              Скачать CSV
            </a>
            <a
              href={`/api/export/dashboard-pdf${exportQuery}`}
              className="border-input bg-background hover:bg-accent rounded-md border px-3 py-2 text-sm"
            >
              Скачать PDF
            </a>
            <RecalculateButton />
          </div>
        </div>

        {/* Сводные карточки */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Студентов</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalStudents}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Средний индекс</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{avgScore}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Высокая / Средняя</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                <span className="text-green-600">{levelCounts.high}</span>
                <span className="text-muted-foreground mx-1 text-lg">/</span>
                <span className="text-yellow-600">{levelCounts.medium}</span>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Низкая / Критич.</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                <span className="text-orange-600">{levelCounts.low}</span>
                <span className="text-muted-foreground mx-1 text-lg">/</span>
                <span className="text-red-600">{levelCounts.critical}</span>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* График */}
        <Card>
          <CardHeader>
            <CardTitle>Динамика вовлечённости (последние 4 недели)</CardTitle>
          </CardHeader>
          <CardContent>
            <EngagementChartWrapper
              data={chartData}
              courseNames={chartCourses.map((c) => c.name)}
            />
          </CardContent>
        </Card>

        {/* Таблица студентов */}
        <Card>
          <CardHeader>
            <CardTitle>Студенты</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            {/* Фильтры */}
            <Suspense fallback={null}>
              <DashboardFilters courses={courses} groups={allGroups} />
            </Suspense>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-4 py-3 font-medium">Студент</th>
                    <th className="px-4 py-3 font-medium">Группа</th>
                    {chartCourses.map((c) => (
                      <th key={c.id} className="px-4 py-3 font-medium">
                        {c.name}
                      </th>
                    ))}
                    <th className="px-4 py-3 font-medium">Средний</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={chartCourses.length + 3}
                        className="text-muted-foreground px-4 py-6 text-center"
                      >
                        {students.length === 0
                          ? "Нет данных. Нажмите «Пересчитать индексы»."
                          : "Нет студентов, соответствующих фильтрам."}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((student) => (
                      <tr key={student.id} className="hover:bg-muted/30 border-b last:border-0">
                        <td className="px-4 py-3">
                          <Link
                            href={`/students/${student.id}`}
                            className="font-medium hover:underline"
                          >
                            {student.name}
                          </Link>
                          <p className="text-muted-foreground text-xs">{student.email}</p>
                        </td>
                        <td className="text-muted-foreground px-4 py-3">{student.group ?? "—"}</td>
                        {chartCourses.map((c) => {
                          const entry = student.scores.find((s) => s.courseId === c.id);
                          return (
                            <td key={c.id} className="px-4 py-3">
                              {entry ? (
                                <div className="flex flex-col gap-1">
                                  <span className="font-medium">{entry.score}</span>
                                  <span
                                    className={`w-fit rounded px-1.5 py-0.5 text-xs ${LEVEL_STYLE[entry.level]}`}
                                  >
                                    {LEVEL_LABELS[entry.level]}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 font-semibold">{student.avgScore.toFixed(1)}</td>
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
