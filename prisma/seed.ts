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
    { email: "student1@university.edu", name: "Алексей Смирнов" },
    { email: "student2@university.edu", name: "Мария Иванова" },
    { email: "student3@university.edu", name: "Дмитрий Козлов" },
    { email: "student4@university.edu", name: "Анна Новикова" },
    { email: "student5@university.edu", name: "Сергей Морозов" },
  ];

  const students = await Promise.all(
    studentData.map((s) =>
      prisma.user.upsert({
        where: { email: s.email },
        update: {},
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

  // 4. Activities — last 4 weeks
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
    type: ActivityType;
    createdAt: Date;
  }[] = [];

  for (const student of students) {
    for (const course of courses) {
      for (let week = 3; week >= 0; week--) {
        const count = randomBetween(5, 12);
        for (let i = 0; i < count; i++) {
          const daysOffset = week * 7 + randomBetween(0, 6);
          activitiesToCreate.push({
            userId: student.id,
            courseId: course.id,
            type: pickActivity(),
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
