export type RiskLevel = "low" | "medium" | "high";

export interface RiskResult {
  score: number; // 0–100
  level: RiskLevel;
  factors: string[]; // человекочитаемые причины
}

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
};

export const RISK_LEVEL_STYLE: Record<RiskLevel, string> = {
  low: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-red-100 text-red-700",
};

/**
 * Эвристический расчёт риска снижения вовлечённости (0–100).
 *
 * @param scoreHistory - история недельных индексов, отсортированная по period asc
 * @param activities   - активности студента за последние 2+ недели
 * @param now          - опциональная "текущая" дата (для тестов)
 */
export function calculateRisk(
  scoreHistory: { score: number; period: Date }[],
  activities: { type: string; createdAt: Date }[],
  now: Date = new Date()
): RiskResult {
  let risk = 0;
  const factors: string[] = [];

  const sorted = [...scoreHistory].sort((a, b) => b.period.getTime() - a.period.getTime());

  // 1. Тренд: падение > 10 пунктов за последнюю неделю
  if (sorted.length >= 2) {
    const trend = sorted[0].score - sorted[1].score;
    if (trend < -10) {
      risk += 40;
      factors.push(`Индекс падает: ${trend.toFixed(1)} за неделю`);
    }
  }

  // 2. Низкий текущий индекс
  const currentScore = sorted[0]?.score ?? 0;
  if (currentScore < 40) {
    risk += 30;
    factors.push(`Низкий индекс: ${currentScore.toFixed(1)}`);
  }

  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(now.getDate() - 14);

  // 3. Нет сданных заданий за последние 2 недели
  const recentAssignments = activities.filter(
    (a) => a.type === "ASSIGNMENT_SUBMIT" && a.createdAt >= twoWeeksAgo
  );
  if (recentAssignments.length === 0) {
    risk += 20;
    factors.push("Нет сданных заданий за 2 недели");
  }

  // 4. Редкие входы (< 2 в неделю за последние 2 недели = < 4 за период)
  const recentLogins = activities.filter((a) => a.type === "LOGIN" && a.createdAt >= twoWeeksAgo);
  if (recentLogins.length < 4) {
    risk += 10;
    factors.push(`Редкие входы: ${recentLogins.length} за 2 недели`);
  }

  risk = Math.min(100, risk);
  const level: RiskLevel = risk >= 61 ? "high" : risk >= 31 ? "medium" : "low";

  return { score: risk, level, factors };
}
