import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getEngagementLevel, LEVEL_LABELS, type EngagementLevel } from "@/lib/engagement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartPoint } from "@/components/dashboard/engagement-chart";
import { EngagementChartWrapper } from "@/components/dashboard/engagement-chart-wrapper";
import { RecalculateButton } from "@/components/dashboard/recalculate-button";

// Цвета бейджей уровня
const LEVEL_STYLE: Record<EngagementLevel, string> = {
  high: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

export default async function DashboardPage() {
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
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { period: "asc" },
  });

  // 3. Данные для графика: avg score per week per course
  const weekMap = new Map<string, Record<string, { sum: number; count: number }>>();
  const weekLabels = new Map<string, string>();

  for (const s of scores) {
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
    for (const course of courses) {
      const agg = byCoarse[course.name];
      point[course.name] = agg ? Math.round((agg.sum / agg.count) * 10) / 10 : 0;
    }
    return point;
  });

  // 4. Данные таблицы: последний score на студента × курс
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

  const students = Array.from(studentMap.values())
    .map((r) => ({
      ...r,
      avgScore: r.scores.reduce((acc, s) => acc + s.score, 0) / (r.scores.length || 1),
    }))
    .sort((a, b) => b.avgScore - a.avgScore);

  // 5. Сводная статистика
  const totalStudents = students.length;
  const avgScore =
    totalStudents > 0
      ? Math.round((students.reduce((a, s) => a + s.avgScore, 0) / totalStudents) * 10) / 10
      : 0;
  const levelCounts = { high: 0, medium: 0, low: 0, critical: 0 };
  for (const s of students) levelCounts[getEngagementLevel(s.avgScore)]++;

  return (
    <div className="space-y-6 p-8">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Дашборд преподавателя</h1>
          <p className="text-muted-foreground text-sm">{session.user.name}</p>
        </div>
        <RecalculateButton />
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
          <EngagementChartWrapper data={chartData} courseNames={courses.map((c) => c.name)} />
        </CardContent>
      </Card>

      {/* Таблица студентов */}
      <Card>
        <CardHeader>
          <CardTitle>Студенты</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-4 py-3 font-medium">Студент</th>
                  {courses.map((c) => (
                    <th key={c.id} className="px-4 py-3 font-medium">
                      {c.name}
                    </th>
                  ))}
                  <th className="px-4 py-3 font-medium">Средний</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td
                      colSpan={courses.length + 2}
                      className="text-muted-foreground px-4 py-6 text-center"
                    >
                      Нет данных. Нажмите «Пересчитать индексы».
                    </td>
                  </tr>
                ) : (
                  students.map((student) => (
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
                      {courses.map((c) => {
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
  );
}
