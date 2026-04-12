"use client";

import dynamic from "next/dynamic";
import { type ScorePoint } from "./score-chart";

const ScoreChart = dynamic(() => import("./score-chart").then((m) => m.ScoreChart), {
  ssr: false,
  loading: () => <div className="bg-muted h-[220px] animate-pulse rounded" />,
});

interface Props {
  data: ScorePoint[];
  courseNames: string[];
}

export function ScoreChartWrapper({ data, courseNames }: Props) {
  return <ScoreChart data={data} courseNames={courseNames} />;
}
