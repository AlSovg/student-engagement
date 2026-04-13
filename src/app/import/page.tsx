"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { previewCSV, importCSV, type PreviewRow, type CsvRow } from "./actions";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type State = "idle" | "parsing" | "preview" | "importing" | "done";

const ACTIVITY_LABELS: Record<string, string> = {
  LOGIN: "Вход",
  MATERIAL_VIEW: "Просмотр материала",
  ASSIGNMENT_SUBMIT: "Сдача задания",
  DISCUSSION_POST: "Сообщение в обсуждении",
  QUIZ_COMPLETE: "Прохождение теста",
  VIDEO_WATCH: "Просмотр видео",
};

export default function ImportPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [state, setState] = useState<State>("idle");
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [validRows, setValidRows] = useState<CsvRow[]>([]);
  const [invalidCount, setInvalidCount] = useState(0);
  const [imported, setImported] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setState("parsing");

    try {
      const formData = new FormData(e.currentTarget);
      const result = await previewCSV(formData);
      setPreview(result.rows);
      setValidRows(result.rows.filter((r) => r.valid).map((r) => r.row));
      setInvalidCount(result.invalidCount);
      setState("preview");
    } catch {
      setError("Не удалось обработать файл. Проверьте формат CSV.");
      setState("idle");
    }
  }

  async function handleImport() {
    setState("importing");
    try {
      const result = await importCSV(validRows);
      setImported(result.imported);
      setState("done");
    } catch {
      setError("Ошибка при импорте. Попробуйте ещё раз.");
      setState("preview");
    }
  }

  return (
    <>
      <AppHeader />
      <div className="space-y-6 p-8">
        {/* Навигация */}
        <div>
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground text-sm">
            ← Дашборд
          </Link>
        </div>

        <div>
          <h1 className="text-2xl font-bold">Импорт активности из CSV</h1>
          <p className="text-muted-foreground text-sm">
            Загрузите файл экспорта из LMS для пополнения данных активности.
          </p>
        </div>

        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Шаг 1: загрузка файла */}
        {(state === "idle" || state === "parsing") && (
          <Card>
            <CardHeader>
              <CardTitle>Выберите CSV-файл</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded border border-dashed p-4 text-sm">
                <p className="font-medium">Ожидаемый формат:</p>
                <pre className="bg-muted mt-2 rounded p-3 text-xs">
                  {`email,activity_type,course_id,datetime\nstudent1@university.edu,MATERIAL_VIEW,course-is-101,2026-04-01T10:30:00Z\nstudent2@university.edu,ASSIGNMENT_SUBMIT,course-da-201,2026-04-01T14:00:00Z`}
                </pre>
                <p className="text-muted-foreground mt-2">
                  Допустимые типы: LOGIN, MATERIAL_VIEW, ASSIGNMENT_SUBMIT, DISCUSSION_POST,
                  QUIZ_COMPLETE, VIDEO_WATCH
                </p>
              </div>

              <form onSubmit={handleUpload} className="flex items-center gap-3">
                <input ref={fileRef} name="file" type="file" accept=".csv" required />
                <Button type="submit" disabled={state === "parsing"}>
                  {state === "parsing" ? "Обработка..." : "Предпросмотр"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Шаг 2: предпросмотр */}
        {(state === "preview" || state === "importing") && (
          <Card>
            <CardHeader>
              <CardTitle>
                Предпросмотр ({preview.length} строк: {validRows.length} валидных
                {invalidCount > 0 && `, ${invalidCount} с ошибками`})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Тип</th>
                      <th className="px-4 py-3 font-medium">Курс</th>
                      <th className="px-4 py-3 font-medium">Дата</th>
                      <th className="px-4 py-3 font-medium">Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((item, i) => (
                      <tr
                        key={i}
                        className={`border-b last:border-0 ${item.valid ? "" : "bg-red-50"}`}
                      >
                        <td className="px-4 py-2.5">{item.row.email}</td>
                        <td className="px-4 py-2.5">
                          {ACTIVITY_LABELS[item.row.activity_type] ?? item.row.activity_type}
                        </td>
                        <td className="text-muted-foreground px-4 py-2.5">{item.row.course_id}</td>
                        <td className="text-muted-foreground px-4 py-2.5">
                          {item.row.datetime
                            ? new Date(item.row.datetime).toLocaleString("ru-RU")
                            : "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          {item.valid ? (
                            <span className="text-green-600">✓</span>
                          ) : (
                            <span className="text-xs text-red-600">{item.error}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3 p-4">
                <Button
                  onClick={handleImport}
                  disabled={validRows.length === 0 || state === "importing"}
                >
                  {state === "importing"
                    ? "Импортируется..."
                    : `Импортировать ${validRows.length} записей`}
                </Button>
                <Button variant="outline" onClick={() => setState("idle")}>
                  Выбрать другой файл
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Шаг 3: готово */}
        {state === "done" && (
          <Card>
            <CardContent className="space-y-4 py-8 text-center">
              <p className="text-2xl">✓</p>
              <p className="font-medium">
                Импортировано {imported} записей активности. Индексы вовлечённости пересчитаны.
              </p>
              <Button onClick={() => router.push("/dashboard")}>Перейти на дашборд</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
