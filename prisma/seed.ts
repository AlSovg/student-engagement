import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const url = (process.env.DATABASE_URL ?? "").replace("sslmode=require", "sslmode=verify-full");
const adapter = new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter });

// --- helpers ---

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// --- seed ---

async function main() {
  const PASSWORD = await bcrypt.hash("password123", 10);

  // 1. Users
  const teacher = await prisma.user.upsert({
    where: { email: "teacher@university.edu" },
    update: {},
    create: {
      email: "teacher@university.edu",
      name: "Иван Петров",
      password: PASSWORD,
      role: "TEACHER",
    },
  });

  const studentData = [
    {
      email: "student1@university.edu",
      name: "Алексей Смирнов",
      group: "ИСТ-2025",
      birthDate: new Date("2001-05-12"),
    },
    {
      email: "student2@university.edu",
      name: "Мария Иванова",
      group: "ИСТ-2025",
      birthDate: new Date("2002-09-23"),
    },
    {
      email: "student3@university.edu",
      name: "Дмитрий Козлов",
      group: "ИСТ-2024",
      birthDate: new Date("2000-03-07"),
    },
    {
      email: "student4@university.edu",
      name: "Анна Новикова",
      group: "ИСТ-2024",
      birthDate: new Date("2001-11-30"),
    },
    {
      email: "student5@university.edu",
      name: "Сергей Морозов",
      group: "ИСТ-2025",
      birthDate: new Date("2003-01-15"),
    },
  ];

  const students = await Promise.all(
    studentData.map((s) =>
      prisma.user.upsert({
        where: { email: s.email },
        update: { group: s.group, birthDate: s.birthDate },
        create: { ...s, password: PASSWORD, role: "STUDENT" },
      })
    )
  );

  // 2. Courses
  const courseData = [
    {
      id: "course-is-101",
      name: "Информационные системы",
      description: "IS-101 · Базовый курс по проектированию информационных систем",
      teacherId: teacher.id,
    },
    {
      id: "course-da-201",
      name: "Анализ данных",
      description: "DA-201 · Методы анализа данных и машинное обучение",
      teacherId: teacher.id,
    },
  ];

  const courses = await Promise.all(
    courseData.map((c) =>
      prisma.course.upsert({
        where: { id: c.id },
        update: {},
        create: c,
      })
    )
  );

  // 3. Enrollments — all students in both courses
  for (const student of students) {
    for (const course of courses) {
      await prisma.enrollment.upsert({
        where: { userId_courseId: { userId: student.id, courseId: course.id } },
        update: {},
        create: { userId: student.id, courseId: course.id },
      });
    }
  }

  // 4. CourseItems
  type CourseItemType = "VIDEO" | "MATERIAL" | "ASSIGNMENT" | "QUIZ";

  const courseItemsData: Record<
    string,
    { id: string; title: string; type: CourseItemType; order: number }[]
  > = {
    "course-is-101": [
      {
        id: "item-is-mat-1",
        title: "Лекция 1: Введение в информационные системы",
        type: "MATERIAL",
        order: 1,
      },
      {
        id: "item-is-mat-2",
        title: "Лекция 2: Архитектура информационных систем",
        type: "MATERIAL",
        order: 2,
      },
      { id: "item-is-mat-3", title: "Лекция 3: Базы данных и СУБД", type: "MATERIAL", order: 3 },
      { id: "item-is-mat-4", title: "Лекция 4: Проектирование ИС", type: "MATERIAL", order: 4 },
      { id: "item-is-vid-1", title: "Видео: Обзор информационных систем", type: "VIDEO", order: 5 },
      {
        id: "item-is-vid-2",
        title: "Видео: Клиент-серверная архитектура",
        type: "VIDEO",
        order: 6,
      },
      {
        id: "item-is-asgn-1",
        title: "Практика 1: Анализ предметной области",
        type: "ASSIGNMENT",
        order: 7,
      },
      { id: "item-is-asgn-2", title: "Практика 2: SQL-запросы", type: "ASSIGNMENT", order: 8 },
      {
        id: "item-is-quiz-1",
        title: "Тест 1: Основы информационных систем",
        type: "QUIZ",
        order: 9,
      },
      { id: "item-is-quiz-2", title: "Тест 2: Архитектурные паттерны", type: "QUIZ", order: 10 },
    ],
    "course-da-201": [
      {
        id: "item-da-mat-1",
        title: "Лекция 1: Введение в Data Science",
        type: "MATERIAL",
        order: 1,
      },
      { id: "item-da-mat-2", title: "Лекция 2: Основы статистики", type: "MATERIAL", order: 2 },
      { id: "item-da-mat-3", title: "Лекция 3: Методы кластеризации", type: "MATERIAL", order: 3 },
      { id: "item-da-mat-4", title: "Лекция 4: Нейронные сети", type: "MATERIAL", order: 4 },
      { id: "item-da-vid-1", title: "Видео: Python для анализа данных", type: "VIDEO", order: 5 },
      { id: "item-da-vid-2", title: "Видео: Pandas и NumPy", type: "VIDEO", order: 6 },
      {
        id: "item-da-asgn-1",
        title: "Практика 1: Разведочный анализ данных (EDA)",
        type: "ASSIGNMENT",
        order: 7,
      },
      {
        id: "item-da-asgn-2",
        title: "Практика 2: Построение модели",
        type: "ASSIGNMENT",
        order: 8,
      },
      { id: "item-da-quiz-1", title: "Тест 1: Основы статистики", type: "QUIZ", order: 9 },
      {
        id: "item-da-quiz-2",
        title: "Тест 2: Алгоритмы машинного обучения",
        type: "QUIZ",
        order: 10,
      },
    ],
  };

  // Upsert course items
  for (const [courseId, items] of Object.entries(courseItemsData)) {
    for (const item of items) {
      await prisma.courseItem.upsert({
        where: { id: item.id },
        update: { title: item.title, type: item.type, order: item.order },
        create: { courseId, ...item },
      });
    }
  }

  // Build lookup: courseId + activityType → courseItemIds
  const activityTypeToCourseItemType: Partial<Record<string, CourseItemType>> = {
    VIDEO_WATCH: "VIDEO",
    MATERIAL_VIEW: "MATERIAL",
    ASSIGNMENT_SUBMIT: "ASSIGNMENT",
    QUIZ_COMPLETE: "QUIZ",
  };

  // courseId → CourseItemType → item ids
  const itemIdsByType: Record<string, Record<CourseItemType, string[]>> = {};
  for (const [courseId, items] of Object.entries(courseItemsData)) {
    itemIdsByType[courseId] = { VIDEO: [], MATERIAL: [], ASSIGNMENT: [], QUIZ: [] };
    for (const item of items) {
      itemIdsByType[courseId][item.type].push(item.id);
    }
  }

  function pickItemId(courseId: string, activityType: string): string | null {
    const cit = activityTypeToCourseItemType[activityType];
    if (!cit) return null;
    const ids = itemIdsByType[courseId]?.[cit] ?? [];
    if (ids.length === 0) return null;
    return ids[Math.floor(Math.random() * ids.length)];
  }

  // 5. Activities — last 4 weeks
  type ActivityType =
    | "LOGIN"
    | "MATERIAL_VIEW"
    | "ASSIGNMENT_SUBMIT"
    | "DISCUSSION_POST"
    | "QUIZ_COMPLETE"
    | "VIDEO_WATCH";

  const activityWeights: { type: ActivityType; weight: number }[] = [
    { type: "LOGIN", weight: 5 },
    { type: "MATERIAL_VIEW", weight: 4 },
    { type: "VIDEO_WATCH", weight: 4 },
    { type: "ASSIGNMENT_SUBMIT", weight: 2 },
    { type: "QUIZ_COMPLETE", weight: 2 },
    { type: "DISCUSSION_POST", weight: 1 },
  ];

  function pickActivity(): ActivityType {
    const total = activityWeights.reduce((s, a) => s + a.weight, 0);
    let rand = Math.random() * total;
    for (const a of activityWeights) {
      rand -= a.weight;
      if (rand <= 0) return a.type;
    }
    return "LOGIN";
  }

  // Each student: 5-12 events per week per course
  const activitiesToCreate: {
    userId: string;
    courseId: string;
    courseItemId: string | null;
    type: ActivityType;
    createdAt: Date;
  }[] = [];

  for (const student of students) {
    for (const course of courses) {
      for (let week = 3; week >= 0; week--) {
        const count = randomBetween(5, 12);
        for (let i = 0; i < count; i++) {
          const daysOffset = week * 7 + randomBetween(0, 6);
          const type = pickActivity();
          activitiesToCreate.push({
            userId: student.id,
            courseId: course.id,
            courseItemId: pickItemId(course.id, type),
            type,
            createdAt: daysAgo(daysOffset),
          });
        }
      }
    }
  }

  // Delete existing seed activities to keep idempotency
  await prisma.activity.deleteMany({
    where: { userId: { in: students.map((s) => s.id) } },
  });
  await prisma.activity.createMany({ data: activitiesToCreate });

  // 5. EngagementScore — one record per (student × course × week)
  const scoreWeights: Record<ActivityType, number> = {
    ASSIGNMENT_SUBMIT: 30,
    QUIZ_COMPLETE: 25,
    DISCUSSION_POST: 20,
    VIDEO_WATCH: 10,
    MATERIAL_VIEW: 10,
    LOGIN: 5,
  };
  const MAX_SCORE = 100;

  await prisma.engagementScore.deleteMany({
    where: { userId: { in: students.map((s) => s.id) } },
  });

  for (const student of students) {
    for (const course of courses) {
      for (let week = 3; week >= 0; week--) {
        const period = startOfWeek(daysAgo(week * 7));
        const weekActs = activitiesToCreate.filter(
          (a) =>
            a.userId === student.id &&
            a.courseId === course.id &&
            a.createdAt >= period &&
            a.createdAt < new Date(period.getTime() + 7 * 86400 * 1000)
        );

        const raw = weekActs.reduce((sum, a) => sum + (scoreWeights[a.type] ?? 0), 0);
        const score = Math.min(MAX_SCORE, (raw / 80) * MAX_SCORE);

        await prisma.engagementScore.create({
          data: { userId: student.id, courseId: course.id, score, period },
        });
      }
    }
  }

  console.log(
    `Seed complete: 1 teacher, ${students.length} students, ${courses.length} courses, ${activitiesToCreate.length} activities`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
