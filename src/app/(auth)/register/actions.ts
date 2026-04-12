"use server";

import { db } from "@/lib/db";
import { hash } from "bcryptjs";
import { redirect } from "next/navigation";

export async function registerUser(_prevState: { error?: string }, formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as "STUDENT" | "TEACHER";

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Пользователь с таким email уже существует" };
  }

  const hashedPassword = await hash(password, 12);

  await db.user.create({
    data: { name, email, password: hashedPassword, role },
  });

  redirect("/login");
}
