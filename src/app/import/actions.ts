"use server";

import Papa from "papaparse";
import { db } from "@/lib/db";
import { recalculateScores } from "@/lib/engagement";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

// Допустимые типы активности (из enum ActivityType)
const VALID_ACTIVITY_TYPES = new Set([
  "LOGIN",
  "MATERIAL_VIEW",
  "ASSIGNMENT_SUBMIT",
  "DISCUSSION_POST",
  "QUIZ_COMPLETE",
  "VIDEO_WATCH",
]);

export interface CsvRow {
  email: string;
  activity_type: string;
  course_id: string;
  datetime: string;
}

export interface PreviewRow {
  row: CsvRow;
  valid: boolean;
  error?: string;
}

export interface PreviewResult {
  rows: PreviewRow[];
  validCount: number;
  invalidCount: number;
}

export async function previewCSV(formData: FormData): Promise<PreviewResult> {
  const session = await auth();
  if (!session || session.user.role !== "TEACHER") redirect("/login");

  const file = formData.get("file") as File | null;
  if (!file) return { rows: [], validCount: 0, invalidCount: 0 };

  const text = await file.text();
  const parsed = Papa.parse<CsvRow>(text, { header: true, skipEmptyLines: true });

  // Загружаем справочники из БД для валидации
  const [students, courses, enrollments] = await Promise.all([
    db.user.findMany({ where: { role: "STUDENT" }, select: { id: true, email: true } }),
    db.course.findMany({ select: { id: true } }),
    db.enrollment.findMany({ select: { userId: true, courseId: true } }),
  ]);

  const emailToId = new Map(students.map((s) => [s.email, s.id]));
  const courseIds = new Set(courses.map((c) => c.id));
  const enrolledSet = new Set(enrollments.map((e) => `${e.userId}_${e.courseId}`));

  const rows: PreviewRow[] = parsed.data.slice(0, 100).map((row) => {
    // Валидация
    if (!row.email) return { row, valid: false, error: "Пустой email" };
    if (!row.activity_type) return { row, valid: false, error: "Пустой activity_type" };
    if (!row.course_id) return { row, valid: false, error: "Пустой course_id" };
    if (!row.datetime) return { row, valid: false, error: "Пустой datetime" };

    const studentId = emailToId.get(row.email);
    if (!studentId) return { row, valid: false, error: `Студент не найден: ${row.email}` };

    if (!VALID_ACTIVITY_TYPES.has(row.activity_type))
      return { row, valid: false, error: `Неверный тип: ${row.activity_type}` };

    if (!courseIds.has(row.course_id))
      return { row, valid: false, error: `Курс не найден: ${row.course_id}` };

    if (!enrolledSet.has(`${studentId}_${row.course_id}`))
      return { row, valid: false, error: `Студент не записан на курс ${row.course_id}` };

    const date = new Date(row.datetime);
    if (isNaN(date.getTime()))
      return { row, valid: false, error: `Неверная дата: ${row.datetime}` };

    return { row, valid: true };
  });

  return {
    rows,
    validCount: rows.filter((r) => r.valid).length,
    invalidCount: rows.filter((r) => !r.valid).length,
  };
}

export async function importCSV(rows: CsvRow[]): Promise<{ imported: number }> {
  const session = await auth();
  if (!session || session.user.role !== "TEACHER") redirect("/login");

  const students = await db.user.findMany({
    where: { role: "STUDENT" },
    select: { id: true, email: true },
  });
  const emailToId = new Map(students.map((s) => [s.email, s.id]));

  const data = rows.map((row) => ({
    userId: emailToId.get(row.email)!,
    courseId: row.course_id,
    type: row.activity_type as
      | "LOGIN"
      | "MATERIAL_VIEW"
      | "ASSIGNMENT_SUBMIT"
      | "DISCUSSION_POST"
      | "QUIZ_COMPLETE"
      | "VIDEO_WATCH",
    createdAt: new Date(row.datetime),
  }));

  await db.activity.createMany({ data });
  await recalculateScores();

  return { imported: data.length };
}
