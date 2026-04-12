import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createClient() {
  // pg >= 8.x выдаёт deprecation warning на sslmode=require — заменяем на verify-full
  // (поведение идентичное, предупреждение исчезает)
  const url = (process.env.DATABASE_URL ?? "").replace("sslmode=require", "sslmode=verify-full");
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

// Singleton — предотвращает создание множества соединений в dev-режиме (hot reload)
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
