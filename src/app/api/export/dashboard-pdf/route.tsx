export const runtime = "nodejs";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEngagementLevel } from "@/lib/engagement";
import { renderToBuffer } from "@react-pdf/renderer";
import { DashboardReport } from "@/components/pdf/dashboard-report";
import { NextRequest } from "next/server";
import React from "react";

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

  const allStudents: StudentRow[] = Array.from(studentMap.values()).map((r) => ({
    ...r,
    avgScore: r.scores.reduce((acc, s) => acc + s.score, 0) / (r.scores.length || 1),
  }));

  // Общая статистика (до фильтров)
  const levelCounts = { high: 0, medium: 0, low: 0, critical: 0 };
  for (const s of allStudents) levelCounts[getEngagementLevel(s.avgScore)]++;
  const avgScoreAll =
    allStudents.length > 0
      ? allStudents.reduce((a, s) => a + s.avgScore, 0) / allStudents.length
      : 0;

  // Фильтрация
  let filtered = allStudents;
  if (fCourse) filtered = filtered.filter((s) => s.scores.some((sc) => sc.courseId === fCourse));
  if (fGroup) filtered = filtered.filter((s) => s.group === fGroup);
  if (fLevel) filtered = filtered.filter((s) => getEngagementLevel(s.avgScore) === fLevel);
  if (fSearch) {
    const q = fSearch.toLowerCase();
    filtered = filtered.filter(
      (s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    );
  }
  if (fSort === "name") filtered.sort((a, b) => a.name.localeCompare(b.name, "ru"));
  else if (fSort === "group")
    filtered.sort((a, b) => (a.group ?? "").localeCompare(b.group ?? "", "ru"));
  else filtered.sort((a, b) => b.avgScore - a.avgScore);

  const visibleCourses = fCourse ? courses.filter((c) => c.id === fCourse) : courses;

  const activeFilters: Record<string, string> = {};
  if (fCourse) activeFilters["Курс"] = visibleCourses[0]?.name ?? fCourse;
  if (fGroup) activeFilters["Группа"] = fGroup;
  if (fLevel) activeFilters["Уровень"] = fLevel;
  if (fSearch) activeFilters["Поиск"] = fSearch;

  const buffer = await renderToBuffer(
    React.createElement(DashboardReport, {
      students: filtered,
      courses: visibleCourses,
      totalAll: allStudents.length,
      avgScoreAll,
      levelCounts,
      activeFilters,
      generatedAt: new Date(),
    })
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="dashboard.pdf"',
    },
  });
}
