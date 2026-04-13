import React from "react";
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";

type DocumentBaseProps = Omit<React.ComponentProps<typeof Document>, "children">;

Font.register({
  family: "Roboto",
  fonts: [
    {
      src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf",
      fontWeight: 400,
    },
    {
      src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf",
      fontWeight: 700,
    },
  ],
});

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Roboto", fontSize: 10, color: "#111827" },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  meta: { fontSize: 9, color: "#9ca3af", marginBottom: 8 },
  filters: { fontSize: 9, color: "#6b7280", marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontWeight: 700, marginBottom: 8, marginTop: 16 },
  statsRow: { flexDirection: "row", gap: 16, marginBottom: 20 },
  statBox: {
    flex: 1,
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 4,
    border: "1pt solid #e5e7eb",
  },
  statLabel: { fontSize: 8, color: "#6b7280", marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: 700 },
  table: { borderTop: "1pt solid #e5e7eb" },
  headerRow: {
    flexDirection: "row",
    borderBottom: "1pt solid #d1d5db",
    paddingVertical: 6,
    backgroundColor: "#f9fafb",
  },
  row: { flexDirection: "row", borderBottom: "1pt solid #e5e7eb", paddingVertical: 5 },
  headerText: { fontWeight: 700, fontSize: 9, color: "#374151", paddingHorizontal: 4 },
  cellText: { fontSize: 9, paddingHorizontal: 4 },
  mutedText: { fontSize: 9, color: "#6b7280", paddingHorizontal: 4 },
  badge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3, fontSize: 8 },
});

const LEVEL_LABELS: Record<string, string> = {
  high: "Высокая",
  medium: "Средняя",
  low: "Низкая",
  critical: "Критическая",
};

const LEVEL_COLORS: Record<string, string> = {
  high: "#dcfce7",
  medium: "#fef9c3",
  low: "#ffedd5",
  critical: "#fee2e2",
};

interface CourseScore {
  courseId: string;
  score: number;
}

interface StudentRow {
  name: string;
  email: string;
  group: string | null;
  scores: CourseScore[];
  avgScore: number;
}

interface Props extends DocumentBaseProps {
  students: StudentRow[];
  courses: { id: string; name: string }[];
  totalAll: number;
  avgScoreAll: number;
  levelCounts: Record<string, number>;
  activeFilters: Record<string, string>;
  generatedAt: Date;
}

export function DashboardReport({
  students,
  courses,
  totalAll,
  avgScoreAll,
  levelCounts,
  activeFilters,
  generatedAt,
}: Props) {
  const filterEntries = Object.entries(activeFilters).filter(([, v]) => v);

  return (
    <Document>
      <Page size="A4" style={styles.page} orientation="landscape">
        {/* Заголовок */}
        <Text style={styles.title}>Отчёт: дашборд преподавателя</Text>
        <Text style={styles.meta}>Сформирован: {generatedAt.toLocaleString("ru-RU")}</Text>
        {filterEntries.length > 0 && (
          <Text style={styles.filters}>
            Активные фильтры: {filterEntries.map(([k, v]) => `${k}: ${v}`).join(" · ")}
          </Text>
        )}

        {/* Сводная статистика */}
        <Text style={styles.sectionTitle}>Общая статистика (все студенты)</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Всего студентов</Text>
            <Text style={styles.statValue}>{totalAll}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Средний индекс</Text>
            <Text style={styles.statValue}>{avgScoreAll.toFixed(1)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Высокая</Text>
            <Text style={[styles.statValue, { color: "#16a34a" }]}>{levelCounts.high ?? 0}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Средняя</Text>
            <Text style={[styles.statValue, { color: "#ca8a04" }]}>{levelCounts.medium ?? 0}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Низкая</Text>
            <Text style={[styles.statValue, { color: "#ea580c" }]}>{levelCounts.low ?? 0}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Критическая</Text>
            <Text style={[styles.statValue, { color: "#dc2626" }]}>
              {levelCounts.critical ?? 0}
            </Text>
          </View>
        </View>

        {/* Таблица студентов */}
        <Text style={styles.sectionTitle}>
          Студенты
          {students.length !== totalAll ? ` (фильтр: ${students.length} из ${totalAll})` : ""}
        </Text>
        <View style={styles.table}>
          <View style={styles.headerRow}>
            <Text style={[styles.headerText, { width: "20%" }]}>Студент</Text>
            <Text style={[styles.headerText, { width: "10%" }]}>Группа</Text>
            {courses.map((c) => (
              <Text key={c.id} style={[styles.headerText, { width: `${50 / courses.length}%` }]}>
                {c.name}
              </Text>
            ))}
            <Text style={[styles.headerText, { width: "12%" }]}>Средний</Text>
            <Text style={[styles.headerText, { width: "12%" }]}>Уровень</Text>
          </View>
          {students.map((s, i) => {
            const level =
              s.avgScore >= 80
                ? "high"
                : s.avgScore >= 50
                  ? "medium"
                  : s.avgScore >= 20
                    ? "low"
                    : "critical";
            return (
              <View key={i} style={styles.row}>
                <View style={{ width: "20%", paddingHorizontal: 4 }}>
                  <Text style={styles.cellText}>{s.name}</Text>
                  <Text style={styles.mutedText}>{s.email}</Text>
                </View>
                <Text style={[styles.mutedText, { width: "10%" }]}>{s.group ?? "—"}</Text>
                {courses.map((c) => {
                  const entry = s.scores.find((sc) => sc.courseId === c.id);
                  return (
                    <Text
                      key={c.id}
                      style={[styles.cellText, { width: `${50 / courses.length}%` }]}
                    >
                      {entry ? entry.score.toFixed(1) : "—"}
                    </Text>
                  );
                })}
                <Text style={[styles.cellText, { width: "12%" }]}>{s.avgScore.toFixed(1)}</Text>
                <View style={{ width: "12%", paddingHorizontal: 4 }}>
                  <View style={[styles.badge, { backgroundColor: LEVEL_COLORS[level] }]}>
                    <Text style={{ fontSize: 8 }}>{LEVEL_LABELS[level]}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </Page>
    </Document>
  );
}
