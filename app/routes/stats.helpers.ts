import type { ApexOptions } from "apexcharts";
import type { DeepStats, Message } from "../logic/whatsapp";

export type HourBreakup = {
  hour: number;
  total: number;
  byPerson: Record<string, number>;
};

export function buildDailyChartOptions(categories: string[]): ApexOptions {
  return {
    chart: {
      type: "area",
      toolbar: { show: false },
      background: "transparent",
    },
    theme: { mode: "dark" },
    stroke: { curve: "smooth", colors: ["#22c55e"] },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.3,
        stops: [0, 90, 100],
        colorStops: [
          { color: "#22c55e", offset: 0, opacity: 0.5 },
          { color: "#22c55e", offset: 100, opacity: 0 },
        ],
      },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories,
      labels: {
        show: true,
        rotate: -45,
        hideOverlappingLabels: true,
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    grid: { borderColor: "#374151" },
    tooltip: { theme: "dark" },
  };
}

export function buildHourlyBreakup(messages: Message[]): HourBreakup[] {
  const rows: HourBreakup[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    total: 0,
    byPerson: {},
  }));

  messages.forEach((m) => {
    if (m.isSystem) return;
    const hour = Number.parseInt(m.time.split(":")[0], 10);
    if (Number.isNaN(hour) || hour < 0 || hour > 23) return;
    rows[hour].total += 1;
    rows[hour].byPerson[m.sender] = (rows[hour].byPerson[m.sender] || 0) + 1;
  });
  return rows;
}

export function buildWholeChatInsights(deepStats: DeepStats): string[] {
  const lines: string[] = [];
  if (deepStats.mostActiveWeekday) {
    lines.push(
      `${deepStats.mostActiveWeekday.label} is your busiest day (${deepStats.mostActiveWeekday.total} messages).`,
    );
  }
  if (deepStats.fastestResponder) {
    lines.push(
      `${deepStats.fastestResponder.sender} replies fastest on average (${deepStats.fastestResponder.avgReplyMinutes.toFixed(1)} min).`,
    );
  }
  if (deepStats.slowestResponder) {
    lines.push(
      `${deepStats.slowestResponder.sender} has the slowest average reply (${deepStats.slowestResponder.avgReplyMinutes.toFixed(1)} min).`,
    );
  }
  if (deepStats.longestMessage) {
    lines.push(
      `${deepStats.longestMessage.sender} sent the longest message (${deepStats.longestMessage.words} words).`,
    );
  }
  if (deepStats.mostSaidWord) {
    lines.push(
      `Most repeated chat word is "${deepStats.mostSaidWord.word}" (${deepStats.mostSaidWord.count} uses).`,
    );
  }
  return lines;
}
