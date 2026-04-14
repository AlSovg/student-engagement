"use client";

const MONTH_NAMES = [
  "янв",
  "фев",
  "мар",
  "апр",
  "май",
  "июн",
  "июл",
  "авг",
  "сен",
  "окт",
  "ноя",
  "дек",
];

// Показываем подпись только для Пн, Ср, Пт (индексы 0, 2, 4 = пн, вт, ср... нет, 0=пн)
const DAY_LABELS = ["Пн", "", "Ср", "", "Пт", "", ""];

function getColor(count: number): string {
  if (count === 0) return "bg-muted";
  if (count <= 2) return "bg-green-200";
  if (count <= 5) return "bg-green-400";
  if (count <= 9) return "bg-green-600";
  return "bg-green-800";
}

function pluralize(n: number): string {
  if (n === 1) return "событие";
  if (n >= 2 && n <= 4) return "события";
  return "событий";
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

interface Props {
  data: Record<string, number>;
}

export function ActivityHeatmap({ data }: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Находим понедельник текущей недели
  const dayOfWeek = today.getDay(); // 0=вс, 1=пн, ...
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() - daysFromMonday);

  // Начало сетки: 11 недель назад от текущего понедельника → 12 колонок итого
  const gridStart = new Date(currentMonday);
  gridStart.setDate(currentMonday.getDate() - 77);

  // Строим 12 недель × 7 дней
  const weeks: Date[][] = [];
  for (let w = 0; w < 12; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(gridStart);
      day.setDate(gridStart.getDate() + w * 7 + d);
      week.push(day);
    }
    weeks.push(week);
  }

  // Метки месяцев: показываем когда меняется месяц
  const monthLabels: (string | null)[] = weeks.map((week, i) => {
    const first = week[0];
    if (i === 0) return MONTH_NAMES[first.getMonth()];
    if (first.getMonth() !== weeks[i - 1][0].getMonth()) {
      return MONTH_NAMES[first.getMonth()];
    }
    return null;
  });

  return (
    <div className="flex gap-2">
      {/* Подписи дней недели */}
      <div className="flex flex-col gap-[3px] pt-[23px]">
        {DAY_LABELS.map((label, i) => (
          <div
            key={i}
            className="text-muted-foreground h-[16px] w-6 text-right text-xs leading-[16px]"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Сетка */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-[3px]">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {/* Метка месяца */}
              <div className="text-muted-foreground h-5 text-xs leading-5">
                {monthLabels[wi] ?? ""}
              </div>
              {/* Ячейки дней */}
              {week.map((day, di) => {
                const isFuture = day > today;
                const key = toDateKey(day);
                const count = isFuture ? 0 : (data[key] ?? 0);
                const dateLabel = day.toLocaleDateString("ru-RU", {
                  day: "numeric",
                  month: "long",
                });
                const tooltip = isFuture
                  ? dateLabel
                  : count === 0
                    ? `${dateLabel} · нет активности`
                    : `${dateLabel} · ${count} ${pluralize(count)}`;

                return (
                  <div
                    key={di}
                    title={tooltip}
                    className={`h-[16px] w-[16px] rounded-sm ${isFuture ? "bg-muted/40" : getColor(count)}`}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Легенда */}
        <div className="text-muted-foreground mt-2 flex items-center gap-1 text-xs">
          <span>Меньше</span>
          {(
            ["bg-muted", "bg-green-200", "bg-green-400", "bg-green-600", "bg-green-800"] as const
          ).map((cls, i) => (
            <div key={i} className={`h-[16px] w-[16px] rounded-sm ${cls}`} />
          ))}
          <span>Больше</span>
        </div>
      </div>
    </div>
  );
}
