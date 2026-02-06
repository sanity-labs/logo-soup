import { GlobalRegistrator } from "@happy-dom/global-registrator";

GlobalRegistrator.register();

import { mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import {
  DEFAULT_ALIGN_BY,
  DEFAULT_BASE_SIZE,
  DEFAULT_CONTRAST_THRESHOLD,
  DEFAULT_DENSITY_FACTOR,
  DEFAULT_SCALE_FACTOR,
} from "../../src/constants";
import type { LogoSource, MeasurementResult } from "../../src/types";
import { getVisualCenterTransform } from "../../src/utils/getVisualCenterTransform";
import {
  detectContentBoundingBox,
  measureWithContentDetection,
} from "../../src/utils/measure";
import {
  calculateNormalizedDimensions,
  createNormalizedLogo,
} from "../../src/utils/normalize";
import { fmtNs, fmtP, type TTestResult, welchTTest } from "./welch";

const origCreateElement = document.createElement.bind(document);
document.createElement = ((tag: string, options?: ElementCreationOptions) => {
  if (tag === "canvas")
    return createCanvas(1, 1) as unknown as HTMLCanvasElement;
  return origCreateElement(tag, options);
}) as typeof document.createElement;

let _sink: unknown;
function blackhole(x: unknown) {
  _sink = x;
}

interface RenderedLogo {
  name: string;
  img: HTMLImageElement;
  width: number;
  height: number;
}

async function loadSvgAtWidth(
  svgBuffer: Buffer,
  fitWidth: number,
): Promise<{ img: HTMLImageElement; width: number; height: number }> {
  const native = await loadImage(svgBuffer);
  const scale = fitWidth / native.width;
  const w = fitWidth;
  const h = Math.round(native.height * scale);
  const canvas = createCanvas(w, h);
  canvas.getContext("2d").drawImage(native, 0, 0, w, h);
  const scaled = await loadImage(canvas.toBuffer("image/png"));
  return {
    img: scaled as unknown as HTMLImageElement,
    width: scaled.width,
    height: scaled.height,
  };
}

const LOGOS_DIR = join(import.meta.dir, "../../static/logos");
const svgFiles = readdirSync(LOGOS_DIR)
  .filter((f) => f.endsWith(".svg"))
  .sort();

console.log(`Loading ${svgFiles.length} real SVGs from static/logos/…`);

const allLogos: RenderedLogo[] = [];
for (const file of svgFiles) {
  const buf = Buffer.from(await Bun.file(join(LOGOS_DIR, file)).arrayBuffer());
  const { img, width, height } = await loadSvgAtWidth(buf, 400);
  allLogos.push({ name: file.replace(/\.svg$/, ""), img, width, height });
}

console.log(
  `Rasterized ${allLogos.length} logos (${allLogos
    .map((l) => `${l.width}x${l.height}`)
    .slice(0, 5)
    .join(", ")}…)`,
);

// Render one representative logo at 3 scales for size-varied benchmarks
const repSvgBuf = Buffer.from(
  await Bun.file(join(LOGOS_DIR, svgFiles[0]!)).arrayBuffer(),
);

interface SizedLogo {
  label: string;
  img: HTMLImageElement;
}

const sizedLogos: SizedLogo[] = [];
for (const w of [64, 400, 1200]) {
  const r = await loadSvgAtWidth(repSvgBuf, w);
  sizedLogos.push({ label: `${r.width}x${r.height}`, img: r.img });
}

const [sizedSmall, sizedMedium, sizedLarge] = sizedLogos;

const realMeasurements: MeasurementResult[] = allLogos.map((logo) =>
  measureWithContentDetection(logo.img, DEFAULT_CONTRAST_THRESHOLD, true),
);

const sources: LogoSource[] = allLogos.map((l) => ({
  src: `static/logos/${l.name}.svg`,
  alt: l.name,
}));

const normalized20 = Array.from({ length: 20 }, (_, i) => {
  const idx = i % allLogos.length;
  return createNormalizedLogo(
    sources[idx]!,
    realMeasurements[idx]!,
    DEFAULT_BASE_SIZE,
    DEFAULT_SCALE_FACTOR,
    DEFAULT_DENSITY_FACTOR,
  );
});

const normalized100 = Array.from({ length: 100 }, (_, i) => {
  const idx = i % allLogos.length;
  return createNormalizedLogo(
    sources[idx]!,
    realMeasurements[idx]!,
    DEFAULT_BASE_SIZE,
    DEFAULT_SCALE_FACTOR,
    DEFAULT_DENSITY_FACTOR,
  );
});

function worstCaseRun(img: HTMLImageElement, count: number) {
  for (let i = 0; i < count; i++) {
    const m = measureWithContentDetection(
      img,
      DEFAULT_CONTRAST_THRESHOLD,
      true,
    );
    const logo = createNormalizedLogo(
      sources[i % sources.length]!,
      m,
      DEFAULT_BASE_SIZE,
      DEFAULT_SCALE_FACTOR,
      DEFAULT_DENSITY_FACTOR,
    );
    blackhole(getVisualCenterTransform(logo, DEFAULT_ALIGN_BY));
  }
}

const ITERS = 2000;
const WARMUP = 200;

function collectSamples(fn: () => void): number[] {
  for (let i = 0; i < WARMUP; i++) fn();
  const samples: number[] = new Array(ITERS);
  for (let i = 0; i < ITERS; i++) {
    const s = Bun.nanoseconds();
    fn();
    samples[i] = Bun.nanoseconds() - s;
  }
  return samples;
}

function stats(samples: number[]) {
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  for (const v of samples) {
    sum += v;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const m = sum / samples.length;
  let sqSum = 0;
  for (const v of samples) sqSum += (v - m) ** 2;
  const stddev = Math.sqrt(sqSum / (samples.length - 1));
  return { mean: m, min, max, stddev };
}

const benchCalcDimsWithDensity = () =>
  calculateNormalizedDimensions(
    realMeasurements[0]!,
    DEFAULT_BASE_SIZE,
    DEFAULT_SCALE_FACTOR,
    DEFAULT_DENSITY_FACTOR,
  );

const benchGetVCT20 = () => {
  for (let i = 0; i < 20; i++)
    getVisualCenterTransform(normalized20[i]!, DEFAULT_ALIGN_BY);
};

const benchFullPipelineDensityOn = () =>
  measureWithContentDetection(
    sizedMedium!.img,
    DEFAULT_CONTRAST_THRESHOLD,
    true,
  );

const keyBenchmarks: Record<string, () => void> = {
  "getVCT x 20": benchGetVCT20,
  "calcDims with density": benchCalcDimsWithDensity,
  createNormalizedLogo: () =>
    createNormalizedLogo(
      sources[0]!,
      realMeasurements[0]!,
      DEFAULT_BASE_SIZE,
      DEFAULT_SCALE_FACTOR,
      DEFAULT_DENSITY_FACTOR,
    ),
  [`fullPipeline ${sizedMedium!.label} density ON`]: benchFullPipelineDensityOn,
  [`worstCase 1 x ${sizedMedium!.label}`]: () =>
    worstCaseRun(sizedMedium!.img, 1),
  [`worstCase 20 x ${sizedMedium!.label}`]: () =>
    worstCaseRun(sizedMedium!.img, 20),
};

interface ABComparison {
  name: string;
  a: { label: string; fn: () => void };
  b: { label: string; fn: () => void };
}

const abComparisons: ABComparison[] = [
  {
    name: `Density compensation (1 logo, ${sizedMedium!.label})`,
    a: { label: "calcDims WITH density", fn: benchCalcDimsWithDensity },
    b: {
      label: "calcDims WITHOUT density",
      fn: () =>
        calculateNormalizedDimensions(
          realMeasurements[0]!,
          DEFAULT_BASE_SIZE,
          DEFAULT_SCALE_FACTOR,
          0,
        ),
    },
  },
  {
    name: "Alignment mode: visual-center-y vs bounds (20 logos)",
    a: { label: "visual-center-y x 20", fn: benchGetVCT20 },
    b: {
      label: "bounds x 20",
      fn: () => {
        for (let i = 0; i < 20; i++)
          getVisualCenterTransform(normalized20[i]!, "bounds");
      },
    },
  },
  {
    name: `Full pipeline: density ON vs OFF (1 logo, ${sizedMedium!.label})`,
    a: { label: "density ON", fn: benchFullPipelineDensityOn },
    b: {
      label: "density OFF",
      fn: () =>
        measureWithContentDetection(
          sizedMedium!.img,
          DEFAULT_CONTRAST_THRESHOLD,
          false,
        ),
    },
  },
  {
    name: `Bounding box scaling: ${sizedLarge!.label} vs ${sizedSmall!.label}`,
    a: {
      label: sizedLarge!.label,
      fn: () =>
        detectContentBoundingBox(sizedLarge!.img, DEFAULT_CONTRAST_THRESHOLD),
    },
    b: {
      label: sizedSmall!.label,
      fn: () =>
        detectContentBoundingBox(sizedSmall!.img, DEFAULT_CONTRAST_THRESHOLD),
    },
  },
  {
    name: "Per-render overhead: 100 logos vs 20 logos",
    a: {
      label: "100 logos",
      fn: () => {
        for (let i = 0; i < 100; i++)
          getVisualCenterTransform(normalized100[i]!, DEFAULT_ALIGN_BY);
      },
    },
    b: {
      label: "20 logos",
      fn: () => {
        for (let i = 0; i < 20; i++)
          getVisualCenterTransform(normalized20[i]!, DEFAULT_ALIGN_BY);
      },
    },
  },
];

console.log();
console.log("─".repeat(72));
console.log("  KEY BENCHMARKS");
console.log(
  `  ${allLogos.length} real logos, ${ITERS} samples, ${WARMUP} warmup`,
);
console.log("─".repeat(72));

const benchSamples: Record<string, number[]> = {};

for (const [name, fn] of Object.entries(keyBenchmarks)) {
  const samples = collectSamples(fn);
  benchSamples[name] = samples;
  const s = stats(samples);
  console.log(
    `  ${name.padEnd(38)} ${fmtNs(s.mean).padStart(10)} ± ${fmtNs(s.stddev).padStart(10)}  (min ${fmtNs(s.min)}, max ${fmtNs(s.max)})`,
  );
}

console.log();
console.log("─".repeat(72));
console.log("  FEATURE COMPARISONS (Welch's t-test, two-tailed)");
console.log("  Legend: * p<0.05  ** p<0.01  *** p<0.001");
console.log("─".repeat(72));

interface ABResult {
  name: string;
  aLabel: string;
  bLabel: string;
  aMean: string;
  bMean: string;
  pctChange: number;
  result: TTestResult;
}

const abResults: ABResult[] = [];

for (const comp of abComparisons) {
  const samplesA = collectSamples(comp.a.fn);
  const samplesB = collectSamples(comp.b.fn);
  const result = welchTTest(samplesA, samplesB);
  const sA = stats(samplesA);
  const sB = stats(samplesB);
  const pctChange = sB.mean !== 0 ? ((sA.mean - sB.mean) / sB.mean) * 100 : 0;

  const sig = result.significant ? `YES ${result.marker}` : "NO";
  const sign = pctChange > 0 ? "+" : "";
  console.log(`  > ${comp.name}`);
  console.log(
    `    ${comp.a.label}: ${fmtNs(sA.mean)}  vs  ${comp.b.label}: ${fmtNs(sB.mean)}  (${sign}${pctChange.toFixed(1)}%)`,
  );
  console.log(`    p=${fmtP(result.p)}  significant=${sig}`);
  console.log();

  abResults.push({
    name: comp.name,
    aLabel: comp.a.label,
    bLabel: comp.b.label,
    aMean: fmtNs(sA.mean),
    bMean: fmtNs(sB.mean),
    pctChange,
    result,
  });
}

const md: string[] = [
  "## react-logo-soup Benchmark Report",
  "",
  `Test fixtures: ${allLogos.length} real SVGs from static/logos/. ` +
    `${ITERS} samples per group, ${WARMUP} warmup iterations.`,
  "",
  "### Feature Comparisons (Welch's t-test)",
  "",
  "| Test | A | B | Delta | Sig |",
  "|:-----|--:|--:|------:|:----|",
];

for (const r of abResults) {
  const sig = r.result.significant ? `YES ${r.result.marker}` : "NO";
  const sign = r.pctChange > 0 ? "+" : "";
  md.push(
    `| ${r.name} | ${r.aMean} | ${r.bMean} | ${sign}${r.pctChange.toFixed(1)}% | ${fmtP(r.result.p)} ${sig} |`,
  );
}

md.push("");
md.push(
  "A/B columns match the order in the test name. Sig: `*` p<0.05, `**` p<0.01, `***` p<0.001.",
);
md.push("");

const outDir = process.env.BENCH_OUT_DIR ?? "tmp";
mkdirSync(outDir, { recursive: true });

try {
  const reportPath = join(outDir, "benchmark-report.md");
  await Bun.write(reportPath, md.join("\n"));
  console.log("─".repeat(72));
  console.log(`  Wrote ${reportPath}`);
} catch {
  // non-critical
}

try {
  const samplesPath = join(outDir, "benchmark-samples.json");
  await Bun.write(samplesPath, JSON.stringify(benchSamples));
  console.log(`  Wrote ${samplesPath}`);
} catch {
  // non-critical
}

console.log("─".repeat(72));
