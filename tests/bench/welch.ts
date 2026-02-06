import { jStat } from "jstat";

export interface TTestResult {
  t: number;
  df: number;
  p: number;
  significant: boolean;
  marker: string;
}

export function welchTTest(a: number[], b: number[]): TTestResult {
  const n1 = a.length;
  const n2 = b.length;
  const v1 = jStat.variance(a, true);
  const v2 = jStat.variance(b, true);
  const se = v1 / n1 + v2 / n2;

  if (se === 0) {
    return { t: 0, df: n1 + n2 - 2, p: 1, significant: false, marker: "" };
  }

  const t = (jStat.mean(a) - jStat.mean(b)) / Math.sqrt(se);
  const df = se ** 2 / ((v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1));
  const p = Math.min(
    1,
    Math.max(0, 2 * (1 - jStat.studentt.cdf(Math.abs(t), df))),
  );
  const marker = p < 0.001 ? "***" : p < 0.01 ? "**" : p < 0.05 ? "*" : "";

  return { t, df, p, significant: p < 0.05, marker };
}

export function fmtNs(ns: number): string {
  if (ns < 1_000) return `${ns.toFixed(0)} ns`;
  if (ns < 1_000_000) return `${(ns / 1_000).toFixed(2)} us`;
  if (ns < 1_000_000_000) return `${(ns / 1_000_000).toFixed(2)} ms`;
  return `${(ns / 1_000_000_000).toFixed(3)} s`;
}
