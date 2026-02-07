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
  cropToDataUrl,
  measureImage,
  measureWithContentDetection,
} from "../../src/utils/measure";
import { createNormalizedLogo } from "../../src/utils/normalize";
import { fmtCost, fmtNs, fmtP, welchTTest } from "./welch";

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

const QUICK = !!process.env.CI;

console.log(
  `Loading ${svgFiles.length} real SVGs from static/logos/…${QUICK ? " (quick mode)" : ""}`,
);

const allLogos: RenderedLogo[] = await Promise.all(
  svgFiles.map(async (file) => {
    const buf = Buffer.from(
      await Bun.file(join(LOGOS_DIR, file)).arrayBuffer(),
    );
    const { img, width, height } = await loadSvgAtWidth(buf, 400);
    return { name: file.replace(/\.svg$/, ""), img, width, height };
  }),
);

const byPixels = [...allLogos].sort(
  (a, b) => a.width * a.height - b.width * b.height,
);
const medianLogo = byPixels[Math.floor(byPixels.length / 2)]!;

console.log(
  `Rasterized ${allLogos.length} logos, median: ${medianLogo.name} (${medianLogo.width}x${medianLogo.height})`,
);

const sources: LogoSource[] = allLogos.map((l) => ({
  src: `static/logos/${l.name}.svg`,
  alt: l.name,
}));

const realMeasurements: MeasurementResult[] = allLogos.map((logo) =>
  measureWithContentDetection(logo.img, DEFAULT_CONTRAST_THRESHOLD, true),
);

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

const logos20 = allLogos.slice(0, 20);

const TIME_BUDGET_MS = QUICK ? 800 : 2_000;
const MIN_SAMPLES = QUICK ? 20 : 30;
const MAX_SAMPLES = 2_000;
const WARMUP_MS = QUICK ? 80 : 200;

function collectSamples(fn: () => void): number[] {
  const warmupEnd = Bun.nanoseconds() + WARMUP_MS * 1e6;
  while (Bun.nanoseconds() < warmupEnd) fn();

  let calibrate = 0;
  const calStart = Bun.nanoseconds();
  for (let i = 0; i < 5; i++) fn();
  calibrate = (Bun.nanoseconds() - calStart) / 5;

  const iters = Math.min(
    MAX_SAMPLES,
    Math.max(MIN_SAMPLES, Math.floor((TIME_BUDGET_MS * 1e6) / calibrate)),
  );

  const samples: number[] = new Array(iters);
  for (let i = 0; i < iters; i++) {
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

const benchGetVCT20 = () => {
  for (let i = 0; i < 20; i++)
    getVisualCenterTransform(normalized20[i]!, DEFAULT_ALIGN_BY);
};

const benchMeasure = () =>
  measureWithContentDetection(medianLogo.img, DEFAULT_CONTRAST_THRESHOLD, true);

const benchMount20 = () => {
  for (let i = 0; i < 20; i++) {
    const m = measureWithContentDetection(
      logos20[i]!.img,
      DEFAULT_CONTRAST_THRESHOLD,
      true,
    );
    const logo = createNormalizedLogo(
      sources[i]!,
      m,
      DEFAULT_BASE_SIZE,
      DEFAULT_SCALE_FACTOR,
      DEFAULT_DENSITY_FACTOR,
    );
    blackhole(getVisualCenterTransform(logo, DEFAULT_ALIGN_BY));
  }
};

const benchMount20Baseline = () => {
  for (let i = 0; i < 20; i++) {
    const m = measureImage(logos20[i]!.img);
    const logo = createNormalizedLogo(
      sources[i]!,
      m,
      DEFAULT_BASE_SIZE,
      DEFAULT_SCALE_FACTOR,
      0,
    );
    blackhole(getVisualCenterTransform(logo, DEFAULT_ALIGN_BY));
  }
};

const keyBenchmarks: Record<string, () => void> = {
  "content detection (1 logo)": benchMeasure,
  "render pass (20 logos)": benchGetVCT20,
  "mount 20 logos (no detection)": benchMount20Baseline,
  "mount 20 logos (defaults)": benchMount20,
};

console.log();
console.log("─".repeat(72));
console.log("  KEY BENCHMARKS");
console.log(
  `  ${allLogos.length} real logos, ${TIME_BUDGET_MS}ms budget/bench, ${MIN_SAMPLES}-${MAX_SAMPLES} samples`,
);
console.log("─".repeat(72));

const benchSamples: Record<string, number[]> = {};

for (const [name, fn] of Object.entries(keyBenchmarks)) {
  const samples = collectSamples(fn);
  benchSamples[name] = samples;
  const s = stats(samples);
  console.log(
    `  ${name.padEnd(38)} ${fmtNs(s.mean).padStart(10)} ± ${fmtNs(s.stddev).padStart(10)}  (n=${String(samples.length).padStart(4)}, min ${fmtNs(s.min)}, max ${fmtNs(s.max)})`,
  );
}

const medianMeasurement = realMeasurements[allLogos.indexOf(medianLogo)]!;

const benchReNormalize20 = () => {
  for (let i = 0; i < 20; i++) {
    const idx = i % allLogos.length;
    const logo = createNormalizedLogo(
      sources[idx]!,
      realMeasurements[idx]!,
      DEFAULT_BASE_SIZE,
      DEFAULT_SCALE_FACTOR,
      DEFAULT_DENSITY_FACTOR,
    );
    blackhole(getVisualCenterTransform(logo, DEFAULT_ALIGN_BY));
  }
};

const abComparisons = [
  {
    name: "densityAware: true vs false",
    a: { label: "true", fn: benchMeasure },
    b: {
      label: "false",
      fn: () =>
        measureWithContentDetection(
          medianLogo.img,
          DEFAULT_CONTRAST_THRESHOLD,
          false,
        ),
    },
  },
  {
    name: "alignBy: visual-center-y vs bounds",
    a: { label: "visual-center-y", fn: benchGetVCT20 },
    b: {
      label: "bounds",
      fn: () => {
        for (let i = 0; i < 20; i++)
          getVisualCenterTransform(normalized20[i]!, "bounds");
      },
    },
  },
  {
    name: "cropToContent: true vs false",
    a: {
      label: "true",
      fn: () => {
        if (medianMeasurement.contentBox)
          blackhole(
            cropToDataUrl(medianLogo.img, medianMeasurement.contentBox),
          );
      },
    },
    b: { label: "false (noop)", fn: () => {} },
  },
  {
    name: "layout update: full mount vs cached",
    a: { label: "full mount", fn: benchMount20 },
    b: { label: "cached re-normalize", fn: benchReNormalize20 },
  },
];

console.log();
console.log("─".repeat(72));
console.log("  FEATURE COMPARISONS (Welch's t-test, two-tailed)");
console.log("  Legend: * p<0.05  ** p<0.01  *** p<0.001");
console.log("─".repeat(72));

const featuresMd: string[] = [
  "### Feature cost breakdown",
  "",
  "How expensive are individual features? Measured on this run's HEAD commit.",
  "",
  "| Feature | On | Off | Cost | Sig |",
  "|:--------|---:|----:|:-----|:----|",
];

for (const comp of abComparisons) {
  const samplesA = collectSamples(comp.a.fn);
  const samplesB = collectSamples(comp.b.fn);
  const result = welchTTest(samplesA, samplesB);
  const sA = stats(samplesA);
  const sB = stats(samplesB);
  const cost = fmtCost(sA.mean, sB.mean, result.significant);

  console.log(`  > ${comp.name}`);
  console.log(
    `    ${comp.a.label}: ${fmtNs(sA.mean)}  vs  ${comp.b.label}: ${fmtNs(sB.mean)}  → ${cost}`,
  );
  console.log(
    `    p=${fmtP(result.p)}  ${result.significant ? result.marker : "not significant"}`,
  );
  console.log();

  featuresMd.push(
    `| ${comp.name} | ${fmtNs(sA.mean)} | ${fmtNs(sB.mean)} | ${cost} | ${fmtP(result.p)} ${result.marker} |`,
  );
}

featuresMd.push("");

const outDir = process.env.BENCH_OUT_DIR ?? "tmp";
mkdirSync(outDir, { recursive: true });

const writes = [
  [join(outDir, "benchmark-features.md"), featuresMd.join("\n")],
  [join(outDir, "benchmark-samples.json"), JSON.stringify(benchSamples)],
] as const;

console.log("─".repeat(72));
for (const [path, content] of writes) {
  try {
    await Bun.write(path, content);
    console.log(`  Wrote ${path}`);
  } catch {
    // non-critical
  }
}
console.log("─".repeat(72));
