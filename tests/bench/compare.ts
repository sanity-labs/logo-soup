import { jStat } from "jstat";
import { welchTTest } from "./welch";

const [baseFile, headFile] = process.argv.slice(2);

if (!baseFile || !headFile) {
  console.error("Usage: bun tests/bench/compare.ts <base.json> <head.json>");
  process.exit(1);
}

const base: Record<string, number[]> = await Bun.file(baseFile).json();
const head: Record<string, number[]> = await Bun.file(headFile).json();

const THRESHOLD_PCT = 5;

function fmtNs(ns: number): string {
  if (ns < 1_000) return `${ns.toFixed(0)} ns`;
  if (ns < 1_000_000) return `${(ns / 1_000).toFixed(2)} us`;
  if (ns < 1_000_000_000) return `${(ns / 1_000_000).toFixed(2)} ms`;
  return `${(ns / 1_000_000_000).toFixed(3)} s`;
}

interface Row {
  name: string;
  baseMean: number;
  headMean: number;
  pctChange: number;
  p: number;
  significant: boolean;
  marker: string;
  verdict: string;
}

const rows: Row[] = [];

for (const name of Object.keys(base)) {
  const baseSamples = base[name];
  const headSamples = head[name];
  if (!baseSamples || !headSamples) continue;

  const baseMean = jStat.mean(baseSamples);
  const headMean = jStat.mean(headSamples);
  const pctChange = ((headMean - baseMean) / baseMean) * 100;
  const result = welchTTest(headSamples, baseSamples);

  let verdict = "unchanged";
  if (result.significant && Math.abs(pctChange) >= THRESHOLD_PCT) {
    verdict = pctChange > 0 ? "REGRESSION" : "faster";
  }

  rows.push({
    name,
    baseMean,
    headMean,
    pctChange,
    p: result.p,
    significant: result.significant,
    marker: result.marker,
    verdict,
  });
}

const regressions = rows.filter((r) => r.verdict === "REGRESSION");
const improvements = rows.filter((r) => r.verdict === "faster");

console.log("─".repeat(80));
console.log("  BENCHMARK COMPARISON: main vs PR");
console.log("─".repeat(80));

for (const r of rows) {
  const sign = r.pctChange > 0 ? "+" : "";
  const sig = r.significant ? `(p=${r.p.toExponential(2)} ${r.marker})` : "(not significant)";
  const tag = r.verdict === "REGRESSION" ? " << REGRESSION" : r.verdict === "faster" ? " << faster" : "";
  console.log(`  ${r.name}: ${fmtNs(r.baseMean)} -> ${fmtNs(r.headMean)} (${sign}${r.pctChange.toFixed(1)}%) ${sig}${tag}`);
}

if (regressions.length > 0) {
  console.log(`\n  ${regressions.length} regression(s) detected.`);
} else {
  console.log("\n  No regressions detected.");
}

console.log("─".repeat(80));

// Markdown report

const md: string[] = [
  "# Benchmark Comparison: main vs PR",
  "",
  `> Threshold for flagging: ${THRESHOLD_PCT}% change + statistically significant (p<0.05)`,
  "",
  "| Benchmark | main | PR | Change | p-value | Verdict |",
  "|:----------|:-----|:---|:-------|:--------|:--------|",
];

for (const r of rows) {
  const sign = r.pctChange > 0 ? "+" : "";
  const verdict =
    r.verdict === "REGRESSION"
      ? "REGRESSION"
      : r.verdict === "faster"
        ? "faster"
        : "unchanged";
  md.push(
    `| ${r.name} | ${fmtNs(r.baseMean)} | ${fmtNs(r.headMean)} | ${sign}${r.pctChange.toFixed(1)}% | \`${r.p.toExponential(2)}\` ${r.marker} | ${verdict} |`,
  );
}

md.push("");

if (regressions.length > 0) {
  md.push(`**${regressions.length} regression(s) detected.**`);
} else {
  md.push("No regressions detected.");
}

md.push("");
const mdContent = md.join("\n");

const outPath = process.env.BENCH_COMPARE_PATH ?? "benchmark-comparison.md";
try {
  await Bun.write(outPath, mdContent);
  console.log(`  Wrote ${outPath}`);
} catch {
  // non-critical
}

const summaryPath = process.env.GITHUB_STEP_SUMMARY;
if (summaryPath) {
  try {
    const existing = await Bun.file(summaryPath).text().catch(() => "");
    await Bun.write(summaryPath, existing + "\n" + mdContent);
  } catch {
    // non-critical
  }
}

process.exit(regressions.length > 0 ? 1 : 0);
