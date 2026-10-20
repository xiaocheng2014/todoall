export const metricTypes = [
  "CHECK",
  "COUNT",
  "DURATION",
  "DISTANCE",
  "QUANTITY",
] as const;

export type MetricType = (typeof metricTypes)[number];

export const metricLabels: Record<MetricType, string> = {
  CHECK: "完成一次",
  COUNT: "次数",
  DURATION: "时长",
  DISTANCE: "距离",
  QUANTITY: "数量",
};

export function isMetricType(value: string): value is MetricType {
  return metricTypes.includes(value as MetricType);
}

export function normalizeMetricTarget(
  metricType: MetricType,
  rawValue: string,
  rawUnit: string,
): { targetValue: number; unit: string } | { error: string } {
  if (metricType === "CHECK") {
    return { targetValue: 1, unit: "次" };
  }

  const numericValue = Number(rawValue);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return { error: "目标值必须大于 0" };
  }

  if (metricType === "COUNT") {
    if (!Number.isInteger(numericValue)) {
      return { error: "次数必须填写整数" };
    }
    return { targetValue: numericValue, unit: rawUnit.trim() || "次" };
  }

  if (metricType === "DURATION") {
    return { targetValue: Math.round(numericValue * 60), unit: "秒" };
  }

  if (metricType === "DISTANCE") {
    return { targetValue: Math.round(numericValue * 1000), unit: "米" };
  }

  if (!Number.isInteger(numericValue)) {
    return { error: "第一版自定义数量需要填写整数" };
  }

  const unit = rawUnit.trim();
  if (!unit || unit.length > 12) {
    return { error: "请填写不超过 12 个字符的单位" };
  }

  return { targetValue: numericValue, unit };
}

function trimDecimal(value: number, fractionDigits = 1): string {
  return value.toFixed(fractionDigits).replace(/\.0+$/, "");
}

export function formatMetricValue(
  metricType: string,
  value: number,
  unit: string,
): string {
  if (metricType === "CHECK") {
    return value >= 1 ? "已完成" : "未完成";
  }

  if (metricType === "DURATION") {
    if (value >= 3600 && value % 3600 === 0) {
      return `${value / 3600} 小时`;
    }
    return `${trimDecimal(value / 60)} 分钟`;
  }

  if (metricType === "DISTANCE") {
    return `${trimDecimal(value / 1000, 2)} 公里`;
  }

  return `${value} ${unit}`;
}

export function metricInputDescription(metricType: MetricType): string {
  if (metricType === "DURATION") return "按分钟填写";
  if (metricType === "DISTANCE") return "按公里填写";
  if (metricType === "CHECK") return "完成后直接勾选";
  return "填写每次任务的目标数量";
}

export function normalizeProgressInput(
  metricType: string,
  rawValue: string,
): number | null {
  if (metricType === "CHECK") return 1;

  const numericValue = Number(rawValue);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return null;
  if (metricType === "DURATION") return Math.round(numericValue * 60);
  if (metricType === "DISTANCE") return Math.round(numericValue * 1000);
  if (
    (metricType === "COUNT" || metricType === "QUANTITY") &&
    Number.isInteger(numericValue)
  ) {
    return numericValue;
  }
  return null;
}

export function storedValueToInput(metricType: string, value: number): number {
  if (metricType === "DURATION") return value / 60;
  if (metricType === "DISTANCE") return value / 1000;
  return value;
}
