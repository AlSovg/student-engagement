import React from "react";
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";

type DocumentBaseProps = Omit<React.ComponentProps<typeof Document>, "children">;

// Регистрируем шрифт с поддержкой кириллицы
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
  subtitle: { fontSize: 11, color: "#6b7280", marginBottom: 20 },
  meta: { fontSize: 9, color: "#9ca3af", marginBottom: 24 },
  sectionTitle: { fontSize: 12, fontWeight: 700, marginBottom: 8, marginTop: 16 },
  table: { borderTop: "1pt solid #e5e7eb" },
  row: { flexDirection: "row", borderBottom: "1pt solid #e5e7eb", paddingVertical: 6 },
  headerRow: {
    flexDirection: "row",
    borderBottom: "1pt solid #d1d5db",
    paddingVertical: 6,
    backgroundColor: "#f9fafb",
  },
  col1: { width: "40%", paddingHorizontal: 4 },
  col2: { width: "30%", paddingHorizontal: 4 },
  col3: { width: "30%", paddingHorizontal: 4 },
  headerText: { fontWeight: 700, fontSize: 9, color: "#374151" },
  cellText: { fontSize: 9 },
  mutedText: { fontSize: 9, color: "#6b7280" },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 8,
    alignSelf: "flex-start",
  },
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

const ACTIVITY_LABELS: Record<string, string> = {
  LOGIN: "Вход в систему",
  MATERIAL_VIEW: "Просмотр материала",
  ASSIGNMENT_SUBMIT: "Сдача задания",
  DISCUSSION_POST: "Сообщение в обсуждении",
  QUIZ_COMPLETE: "Прохождение теста",
  VIDEO_WATCH: "Просмотр видео",
};

interface ScoreEntry {
  courseName: string;
  score: number;
  level: string;
}

interface ActivityEntry {
  type: string;
  courseName: string;
  createdAt: Date;
}

interface Props extends DocumentBaseProps {
  name: string;
  email: string;
  scores: ScoreEntry[];
  activities: ActivityEntry[];
  generatedAt: Date;
}

export function StudentReport({ name, email, scores, activities, generatedAt }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Заголовок */}
        <Text style={styles.title}>{name}</Text>
        <Text style={styles.subtitle}>{email}</Text>
        <Text style={styles.meta}>Отчёт сформирован: {generatedAt.toLocaleString("ru-RU")}</Text>

        {/* Индексы по курсам */}
        <Text style={styles.sectionTitle}>Индексы вовлечённости по курсам</Text>
        <View style={styles.table}>
          <View style={styles.headerRow}>
            <View style={styles.col1}>
              <Text style={styles.headerText}>Курс</Text>
            </View>
            <View style={styles.col2}>
              <Text style={styles.headerText}>Индекс</Text>
            </View>
            <View style={styles.col3}>
              <Text style={styles.headerText}>Уровень</Text>
            </View>
          </View>
          {scores.map((s, i) => (
            <View key={i} style={styles.row}>
              <View style={styles.col1}>
                <Text style={styles.cellText}>{s.courseName}</Text>
              </View>
              <View style={styles.col2}>
                <Text style={styles.cellText}>{s.score.toFixed(1)}</Text>
              </View>
              <View style={styles.col3}>
                <View
                  style={[styles.badge, { backgroundColor: LEVEL_COLORS[s.level] ?? "#f3f4f6" }]}
                >
                  <Text style={styles.cellText}>{LEVEL_LABELS[s.level] ?? s.level}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* История активности */}
        <Text style={styles.sectionTitle}>
          История активности (последние 4 недели, до 60 записей)
        </Text>
        <View style={styles.table}>
          <View style={styles.headerRow}>
            <View style={{ width: "35%", paddingHorizontal: 4 }}>
              <Text style={styles.headerText}>Дата</Text>
            </View>
            <View style={{ width: "40%", paddingHorizontal: 4 }}>
              <Text style={styles.headerText}>Тип</Text>
            </View>
            <View style={{ width: "25%", paddingHorizontal: 4 }}>
              <Text style={styles.headerText}>Курс</Text>
            </View>
          </View>
          {activities.map((a, i) => (
            <View key={i} style={styles.row}>
              <View style={{ width: "35%", paddingHorizontal: 4 }}>
                <Text style={styles.mutedText}>
                  {a.createdAt.toLocaleString("ru-RU", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
              <View style={{ width: "40%", paddingHorizontal: 4 }}>
                <Text style={styles.cellText}>{ACTIVITY_LABELS[a.type] ?? a.type}</Text>
              </View>
              <View style={{ width: "25%", paddingHorizontal: 4 }}>
                <Text style={styles.mutedText}>{a.courseName}</Text>
              </View>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}
