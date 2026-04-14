export const runtime = "nodejs";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEngagementLevel } from "@/lib/engagement";
import { renderToBuffer } from "@react-pdf/renderer";
import { StudentReport } from "@/components/pdf/student-report";
import { NextRequest } from "next/server";
import React from "react";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "TEACHER") {
    return new Response("Forbidden", { status: 403 });
  }

  const studentId = req.nextUrl.searchParams.get("id");
  if (!studentId) return new Response("Missing id", { status: 400 });

  const student = await db.user.findUnique({
    where: { id: studentId, role: "STUDENT" },
    select: { id: true, name: true, email: true },
  });
  if (!student) return new Response("Not found", { status: 404 });

  // Курсы преподавателя, на которые записан студент
  const enrollments = await db.enrollment.findMany({
    where: { userId: studentId, course: { teacherId: session.user.id } },
    include: { course: true },
  });
  const courses = enrollments.map((e) => e.course);
  const courseIds = courses.map((c) => c.id);

  // Последние индексы по курсам
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - 56);

  const scoreRecords = await db.engagementScore.findMany({
    where: { userId: studentId, courseId: { in: courseIds }, period: { gte: from } },
    orderBy: { period: "asc" },
  });

  const latestByCourse = new Map<string, number>();
  for (const s of scoreRecords) {
    latestByCourse.set(s.courseId, s.score);
  }

  const scores = courses.map((c) => ({
    courseName: c.name,
    score: latestByCourse.get(c.id) ?? 0,
    level: getEngagementLevel(latestByCourse.get(c.id) ?? 0),
  }));

  // История активности (4 недели, 60 записей)
  const activityFrom = new Date();
  activityFrom.setUTCDate(activityFrom.getUTCDate() - 28);

  const activityRecords = await db.activity.findMany({
    where: { userId: studentId, courseId: { in: courseIds }, createdAt: { gte: activityFrom } },
    include: { course: true },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  const activities = activityRecords.map((a) => ({
    type: a.type,
    courseName: a.course.name,
    createdAt: a.createdAt,
  }));

  const buffer = await renderToBuffer(
    React.createElement(StudentReport, {
      name: student.name ?? student.email,
      email: student.email,
      scores,
      activities,
      generatedAt: new Date(),
    })
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="student-${studentId}.pdf"`,
    },
  });
}
