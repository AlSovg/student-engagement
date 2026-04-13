"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props {
  courses: { id: string; name: string }[];
  groups: string[];
}

export function DashboardFilters({ courses, groups }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        placeholder="Поиск по имени или email..."
        defaultValue={searchParams.get("search") ?? ""}
        onChange={(e) => update("search", e.target.value)}
        className="w-56"
      />
      <select
        className="border-input bg-background rounded-md border px-3 py-2 text-sm"
        value={searchParams.get("course") ?? ""}
        onChange={(e) => update("course", e.target.value)}
      >
        <option value="">Все курсы</option>
        {courses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        className="border-input bg-background rounded-md border px-3 py-2 text-sm"
        value={searchParams.get("group") ?? ""}
        onChange={(e) => update("group", e.target.value)}
      >
        <option value="">Все группы</option>
        {groups.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </select>
      <select
        className="border-input bg-background rounded-md border px-3 py-2 text-sm"
        value={searchParams.get("level") ?? ""}
        onChange={(e) => update("level", e.target.value)}
      >
        <option value="">Все уровни</option>
        <option value="high">Высокий</option>
        <option value="medium">Средний</option>
        <option value="low">Низкий</option>
        <option value="critical">Критический</option>
      </select>
      <select
        className="border-input bg-background rounded-md border px-3 py-2 text-sm"
        value={searchParams.get("sort") ?? "score"}
        onChange={(e) => update("sort", e.target.value)}
      >
        <option value="score">По индексу ↓</option>
        <option value="name">По имени</option>
        <option value="group">По группе</option>
      </select>
      <Button variant="outline" size="sm" onClick={() => router.push(pathname)}>
        Сбросить
      </Button>
    </div>
  );
}
