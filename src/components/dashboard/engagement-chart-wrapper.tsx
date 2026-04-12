"use client";

import dynamic from "next/dynamic";
import { type ChartPoint } from "./engagement-chart";

const EngagementChart = dynamic(() => import("./engagement-chart").then((m) => m.EngagementChart), {
  ssr: false,
  loading: () => <div className="bg-muted h-[260px] animate-pulse rounded" />,
});

interface Props {
  data: ChartPoint[];
  courseNames: string[];
}

export function EngagementChartWrapper({ data, courseNames }: Props) {
  return <EngagementChart data={data} courseNames={courseNames} />;
}
