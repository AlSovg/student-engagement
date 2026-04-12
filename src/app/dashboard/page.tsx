import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-2">Дашборд</h1>
      <p className="text-gray-500">
        Добро пожаловать, {session.user.name} ({session.user.role})
      </p>
    </div>
  );
}
