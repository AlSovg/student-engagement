import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEngagementLevel, LEVEL_LABELS } from "@/lib/engagement";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "TEACHER") {
    return new Response("Forbidden", { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const fCourse = searchParams.get("course") ?? undefined;
  const fGroup = searchParams.get("group") ?? undefined;
  const fLevel = searchParams.get("level") ?? undefined;
  const fSearch = searchParams.get("search") ?? undefined;
  const fSort = searchParams.get("sort") ?? undefined;

  // Загружаем данные (та же логика что в dashboard/page.tsx)
  const courses = await db.course.findMany({
    where: { teacherId: session.user.id },
    orderBy: { name: "asc" },
  });
  const courseIds = courses.map((c) => c.id);

  const from = new Date();
  from.setUTCDate(from.getUTCDate() - 28);

  const scores = await db.engagementScore.findMany({
    where: { courseId: { in: courseIds }, period: { gte: from } },
    include: { user: { select: { id: true, name: true, email: true, group: true } } },
    orderBy: { period: "asc" },
  });

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
    scores: { courseId: string; score: number }[];
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
    studentMap.get(s.userId)!.scores.push({ courseId: s.courseId, score: s.score });
  }

  let students: StudentRow[] = Array.from(studentMap.values()).map((r) => ({
    ...r,
    avgScore: r.scores.reduce((acc, s) => acc + s.score, 0) / (r.scores.length || 1),
  }));

  // Фильтрация
  if (fCourse) students = students.filter((s) => s.scores.some((sc) => sc.courseId === fCourse));
  if (fGroup) students = students.filter((s) => s.group === fGroup);
  if (fLevel) students = students.filter((s) => getEngagementLevel(s.avgScore) === fLevel);
  if (fSearch) {
    const q = fSearch.toLowerCase();
    students = students.filter(
      (s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    );
  }

  // Сортировка
  if (fSort === "name") students.sort((a, b) => a.name.localeCompare(b.name, "ru"));
  else if (fSort === "group")
    students.sort((a, b) => (a.group ?? "").localeCompare(b.group ?? "", "ru"));
  else students.sort((a, b) => b.avgScore - a.avgScore);

  const visibleCourses = fCourse ? courses.filter((c) => c.id === fCourse) : courses;

  // Генерация CSV
  const header = [
    "Имя",
    "Email",
    "Группа",
    ...visibleCourses.map((c) => c.name),
    "Средний индекс",
    "Уровень",
  ];

  const rows = students.map((s) => [
    s.name,
    s.email,
    s.group ?? "",
    ...visibleCourses.map((c) => {
      const entry = s.scores.find((sc) => sc.courseId === c.id);
      return entry ? entry.score.toFixed(1) : "";
    }),
    s.avgScore.toFixed(1),
    LEVEL_LABELS[getEngagementLevel(s.avgScore)],
  ]);

  const csvLines = [header, ...rows].map((row) =>
    row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
  );
  const csv = "\uFEFF" + csvLines.join("\r\n"); // BOM для корректного открытия в Excel

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="students.csv"',
    },
  });
}
