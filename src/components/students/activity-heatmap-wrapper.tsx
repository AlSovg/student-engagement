"use client";

import dynamic from "next/dynamic";

const ActivityHeatmap = dynamic(() => import("./activity-heatmap").then((m) => m.ActivityHeatmap), {
  ssr: false,
  loading: () => <div className="bg-muted h-[120px] animate-pulse rounded" />,
});

export function ActivityHeatmapWrapper({ data }: { data: Record<string, number> }) {
  return <ActivityHeatmap data={data} />;
}
