"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function RecalculateButton() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");

  async function handleClick() {
    setLoading(true);
    setStatus("idle");
    let ok = false;
    try {
      const res = await fetch("/api/engagement/recalculate", { method: "POST" });
      ok = res.ok;
      setStatus(ok ? "ok" : "error");
    } catch {
      setStatus("error");
    } finally {
      setLoading(false);
      // Перезагружаем страницу чтобы показать обновлённые данные
      if (ok) setTimeout(() => window.location.reload(), 800);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {status === "ok" && <span className="text-sm text-green-600">Пересчитано</span>}
      {status === "error" && <span className="text-sm text-red-600">Ошибка</span>}
      <Button onClick={handleClick} disabled={loading} variant="outline" size="sm">
        {loading ? "Пересчёт..." : "Пересчитать индексы"}
      </Button>
    </div>
  );
}
