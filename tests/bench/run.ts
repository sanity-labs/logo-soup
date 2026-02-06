import { GlobalRegistrator } from "@happy-dom/global-registrator";
GlobalRegistrator.register();

import { bench, boxplot, summary, run, do_not_optimize } from "mitata";

import {
  normalizeSource,
  logosEqual,
  calculateNormalizedDimensions,
  createNormalizedLogo,
} from "../../src/utils/normalize";
import { getVisualCenterTransform } from "../../src/utils/getVisualCenterTransform";
import {
  detectContentBoundingBox,
  calculateVisualCenter,
  measurePixelDensity,
  measureWithContentDetection,
} from "../../src/utils/measure";
import {
  DEFAULT_ALIGN_BY,
  DEFAULT_BASE_SIZE,
  DEFAULT_CONTRAST_THRESHOLD,
  DEFAULT_DENSITY_FACTOR,
  DEFAULT_SCALE_FACTOR,
} from "../../src/constants";
import type { LogoSource, MeasurementResult } from "../../src/types";
import { welchTTest, fmtNs, type TTestResult } from "./welch";

// Dimensions sourced from real SVGs in static/logos/
const LOGO_DIMS: { w: number; h: number; name: string }[] = [
  { w: 317, h: 92, name: "clerk" },
  { w: 288, h: 66, name: "replit" },
  { w: 325, h: 50, name: "samsung" },
  { w: 128, h: 128, name: "unity" },
  { w: 200, h: 60, name: "expedia" },
  { w: 160, h: 42, name: "redis" },
  { w: 180, h: 180, name: "kahoot" },
  { w: 300, h: 40, name: "nordstrom" },
  { w: 100, h: 100, name: "cursor" },
  { w: 240, h: 80, name: "retool" },
  { w: 150, h: 55, name: "coda" },
  { w: 280, h: 70, name: "pinecone" },
  { w: 110, h: 110, name: "hinge" },
  { w: 350, h: 45, name: "carhartt" },
  { w: 90, h: 90, name: "poc" },
  { w: 260, h: 75, name: "eurostar" },
  { w: 320, h: 55, name: "siemens" },
  { w: 200, h: 85, name: "lvmh" },
  { w: 170, h: 50, name: "frame" },
  { w: 140, h: 140, name: "gala-games" },
];

const logoUrl = (name: string) => `https://cdn.example.com/logos/${name}.svg`;

function makeMeasurement(dim: { w: number; h: number }): MeasurementResult {
  const padX = Math.round(dim.w * 0.08);
  const padY = Math.round(dim.h * 0.1);
  return {
    width: dim.w,
    height: dim.h,
    contentBox: {
      x: padX,
      y: padY,
      width: dim.w - padX * 2,
      height: dim.h - padY * 2,
    },
    pixelDensity: 0.25 + Math.random() * 0.4,
    visualCenter: {
      x: dim.w / 2 + (Math.random() - 0.5) * dim.w * 0.1,
      y: dim.h / 2 + (Math.random() - 0.5) * dim.h * 0.1,
      offsetX: (Math.random() - 0.5) * 20,
      offsetY: (Math.random() - 0.5) * 10,
    },
  };
}

function makeSource(i: number): LogoSource {
  const d = LOGO_DIMS[i % LOGO_DIMS.length]!;
  return { src: logoUrl(d.name), alt: d.name };
}

function makeNormalized(i: number) {
  const d = LOGO_DIMS[i % LOGO_DIMS.length]!;
  const m = makeMeasurement(d);
  return createNormalizedLogo(
    makeSource(i),
    m,
    DEFAULT_BASE_SIZE,
    DEFAULT_SCALE_FACTOR,
    DEFAULT_DENSITY_FACTOR,
  );
}

// happy-dom canvas provides pixel data for the measurement functions
function createSyntheticImage(w: number, h: number): HTMLImageElement {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(w * 0.1, h * 0.15, w * 0.45, h * 0.7);
    ctx.fillStyle = "#e94560";
    ctx.beginPath();
    ctx.arc(w * 0.65, h * 0.5, h * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0f3460";
    ctx.fillRect(w * 0.55, h * 0.4, w * 0.3, h * 0.2);
  }
  const img = new Image();
  Object.defineProperty(img, "naturalWidth", { value: w });
  Object.defineProperty(img, "naturalHeight", { value: h });
  try {
    img.src = canvas.toDataURL("image/png");
  } catch {
    /* noop */
  }
  return img;
}

interface SizedImage {
  label: string;
  pixels: string;
  img: HTMLImageElement;
  bbox: ReturnType<typeof detectContentBoundingBox>;
}

const SIZED_IMAGES: SizedImage[] = [
  { w: 64, h: 32, label: "64x32", pixels: "2K" },
  { w: 400, h: 200, label: "400x200", pixels: "80K" },
  { w: 1200, h: 600, label: "1200x600", pixels: "720K" },
].map(({ w, h, label, pixels }) => {
  const img = createSyntheticImage(w, h);
  return {
    label,
    pixels,
    img,
    bbox: detectContentBoundingBox(img, DEFAULT_CONTRAST_THRESHOLD),
  };
});

const [, medium, large] = SIZED_IMAGES;

const measurements = LOGO_DIMS.map(makeMeasurement);
const basicMeasurement: MeasurementResult = { width: 400, height: 200 };
const sources = LOGO_DIMS.map((_, i) => makeSource(i));
const logos20 = Array.from({ length: 20 }, (_, i) => makeNormalized(i));
const logos100 = Array.from({ length: 100 }, (_, i) => makeNormalized(i));
const stringLogos5 = LOGO_DIMS.slice(0, 5).map((d) => logoUrl(d.name));
const stringLogos20 = LOGO_DIMS.map((d) => logoUrl(d.name));

function benchBySize(prefix: string, fn: (s: SizedImage) => unknown) {
  boxplot(() => {
    summary(() => {
      for (const s of SIZED_IMAGES) {
        bench(`${prefix}: ${s.label} (${s.pixels} px)`, () => {
          do_not_optimize(fn(s));
        });
      }
    });
  });
}

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
    do_not_optimize(getVisualCenterTransform(logo, DEFAULT_ALIGN_BY));
  }
}

// Per-render hot path: getVisualCenterTransform (called in JSX .map() every render)

summary(() => {
  bench("getVCT: bounds (early return)", () => {
    do_not_optimize(getVisualCenterTransform(logos20[0]!, "bounds"));
  });

  bench("getVCT: visual-center", () => {
    do_not_optimize(getVisualCenterTransform(logos20[0]!, "visual-center"));
  });

  bench("getVCT: visual-center-x", () => {
    do_not_optimize(getVisualCenterTransform(logos20[0]!, "visual-center-x"));
  });

  bench("getVCT: visual-center-y (default)", () => {
    do_not_optimize(getVisualCenterTransform(logos20[0]!, DEFAULT_ALIGN_BY));
  });
});

boxplot(() => {
  summary(() => {
    bench("getVCT x 1 logo", () => {
      do_not_optimize(getVisualCenterTransform(logos20[0]!, DEFAULT_ALIGN_BY));
    });

    bench("getVCT x 20 logos (typical)", () => {
      for (let i = 0; i < 20; i++) {
        do_not_optimize(
          getVisualCenterTransform(logos20[i]!, DEFAULT_ALIGN_BY),
        );
      }
    });

    bench("getVCT x 100 logos (stress)", () => {
      for (let i = 0; i < 100; i++) {
        do_not_optimize(
          getVisualCenterTransform(logos100[i]!, DEFAULT_ALIGN_BY),
        );
      }
    });
  });
});

// Normalization: pure math, runs on mount / option change

summary(() => {
  bench("normalizeSource (string)", () => {
    do_not_optimize(normalizeSource(logoUrl("clerk")));
  });

  bench("normalizeSource (LogoSource)", () => {
    do_not_optimize(normalizeSource(sources[0]!));
  });
});

summary(() => {
  bench("logosEqual: 5 identical", () => {
    do_not_optimize(logosEqual(stringLogos5, stringLogos5));
  });

  bench("logosEqual: 20 identical", () => {
    do_not_optimize(logosEqual(stringLogos20, stringLogos20));
  });

  bench("logosEqual: 20 differ-first (early exit)", () => {
    const b = [...stringLogos20];
    b[0] = "DIFFERENT";
    do_not_optimize(logosEqual(stringLogos20, b));
  });

  bench("logosEqual: 20 differ-last (worst)", () => {
    const b = [...stringLogos20];
    b[19] = "DIFFERENT";
    do_not_optimize(logosEqual(stringLogos20, b));
  });
});

summary(() => {
  bench("calcDims: basic (no content box)", () => {
    do_not_optimize(
      calculateNormalizedDimensions(
        basicMeasurement,
        DEFAULT_BASE_SIZE,
        DEFAULT_SCALE_FACTOR,
        0,
      ),
    );
  });

  bench("calcDims: with content box", () => {
    do_not_optimize(
      calculateNormalizedDimensions(
        measurements[0]!,
        DEFAULT_BASE_SIZE,
        DEFAULT_SCALE_FACTOR,
        0,
      ),
    );
  });

  bench("calcDims: with density compensation", () => {
    do_not_optimize(
      calculateNormalizedDimensions(
        measurements[0]!,
        DEFAULT_BASE_SIZE,
        DEFAULT_SCALE_FACTOR,
        DEFAULT_DENSITY_FACTOR,
      ),
    );
  });
});

summary(() => {
  bench("createNormalizedLogo: basic", () => {
    do_not_optimize(
      createNormalizedLogo(
        sources[0]!,
        measurements[0]!,
        DEFAULT_BASE_SIZE,
        DEFAULT_SCALE_FACTOR,
        0,
      ),
    );
  });

  bench("createNormalizedLogo: with density", () => {
    do_not_optimize(
      createNormalizedLogo(
        sources[0]!,
        measurements[0]!,
        DEFAULT_BASE_SIZE,
        DEFAULT_SCALE_FACTOR,
        DEFAULT_DENSITY_FACTOR,
      ),
    );
  });
});

// Canvas pixel operations: runs on mount / option change only

benchBySize("detectBoundingBox", (s) =>
  detectContentBoundingBox(s.img, DEFAULT_CONTRAST_THRESHOLD),
);

benchBySize("visualCenter", (s) =>
  calculateVisualCenter(
    s.img,
    s.bbox.box,
    s.bbox.background,
    DEFAULT_CONTRAST_THRESHOLD,
  ),
);

benchBySize("pixelDensity", (s) =>
  measurePixelDensity(
    s.img,
    s.bbox.box,
    s.bbox.background,
    DEFAULT_CONTRAST_THRESHOLD,
  ),
);

// Full pipeline: measureWithContentDetection

boxplot(() => {
  summary(() => {
    for (const s of [medium!, large!]) {
      for (const density of [false, true]) {
        bench(
          `fullPipeline: ${s.label}, density ${density ? "ON" : "OFF"}`,
          () => {
            do_not_optimize(
              measureWithContentDetection(
                s.img,
                DEFAULT_CONTRAST_THRESHOLD,
                density,
              ),
            );
          },
        );
      }
    }
  });
});

// Worst case: all features enabled, multiple logos

boxplot(() => {
  summary(() => {
    for (const count of [1, 10, 20]) {
      bench(`worst-case: ${count} x ${medium!.label} (all features)`, () => {
        worstCaseRun(medium!.img, count);
      });
    }
  });
});

boxplot(() => {
  summary(() => {
    for (const count of [10, 20]) {
      bench(`worst-case: ${count} x ${large!.label} (all features)`, () => {
        worstCaseRun(large!.img, count);
      });
    }
  });
});

await run();

// Welch's t-test: p-values for key feature comparisons

const PVALUE_ITERS = 2000;
const PVALUE_WARMUP = 200;

function collectSamples(fn: () => void): number[] {
  for (let i = 0; i < PVALUE_WARMUP; i++) fn();
  const samples: number[] = new Array(PVALUE_ITERS);
  for (let i = 0; i < PVALUE_ITERS; i++) {
    const s = Bun.nanoseconds();
    fn();
    samples[i] = Bun.nanoseconds() - s;
  }
  return samples;
}

const benchCalcDimsWithDensity = () =>
  calculateNormalizedDimensions(
    measurements[0]!,
    DEFAULT_BASE_SIZE,
    DEFAULT_SCALE_FACTOR,
    DEFAULT_DENSITY_FACTOR,
  );

const benchGetVCT20 = () => {
  for (let i = 0; i < 20; i++)
    getVisualCenterTransform(logos20[i]!, DEFAULT_ALIGN_BY);
};

const benchFullPipelineDensityOn = () =>
  measureWithContentDetection(medium!.img, DEFAULT_CONTRAST_THRESHOLD, true);

interface PComparison {
  name: string;
  a: { label: string; fn: () => void };
  b: { label: string; fn: () => void };
}

const pComparisons: PComparison[] = [
  {
    name: "Density compensation (1 logo, 400x200)",
    a: { label: "calcDims WITH density", fn: benchCalcDimsWithDensity },
    b: {
      label: "calcDims WITHOUT density",
      fn: () =>
        calculateNormalizedDimensions(
          measurements[0]!,
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
          getVisualCenterTransform(logos20[i]!, "bounds");
      },
    },
  },
  {
    name: `Full pipeline: density ON vs OFF (1 logo, ${medium!.label})`,
    a: { label: "density ON", fn: benchFullPipelineDensityOn },
    b: {
      label: "density OFF",
      fn: () =>
        measureWithContentDetection(
          medium!.img,
          DEFAULT_CONTRAST_THRESHOLD,
          false,
        ),
    },
  },
  {
    name: `Bounding box pixel scaling: ${large!.label} vs ${medium!.label} (1 logo)`,
    a: {
      label: large!.label,
      fn: () =>
        detectContentBoundingBox(large!.img, DEFAULT_CONTRAST_THRESHOLD),
    },
    b: {
      label: medium!.label,
      fn: () =>
        detectContentBoundingBox(medium!.img, DEFAULT_CONTRAST_THRESHOLD),
    },
  },
  {
    name: "Per-render overhead: 100 logos vs 20 logos",
    a: {
      label: "100 logos",
      fn: () => {
        for (let i = 0; i < 100; i++)
          getVisualCenterTransform(logos100[i]!, DEFAULT_ALIGN_BY);
      },
    },
    b: {
      label: "20 logos",
      fn: () => {
        for (let i = 0; i < 20; i++)
          getVisualCenterTransform(logos20[i]!, DEFAULT_ALIGN_BY);
      },
    },
  },
];

console.log("\n");
console.log("─".repeat(80));
console.log("  WELCH'S T-TEST — STATISTICAL SIGNIFICANCE (two-tailed)");
console.log("─".repeat(80));
console.log(`  Samples per group: ${PVALUE_ITERS} | Warmup: ${PVALUE_WARMUP}`);
console.log("  Legend: * p<0.05  ** p<0.01  *** p<0.001\n");

interface PResult {
  name: string;
  aLabel: string;
  bLabel: string;
  aMean: string;
  bMean: string;
  pctChange: number;
  result: TTestResult;
}

const pResults: PResult[] = [];

for (const comp of pComparisons) {
  const samplesA = collectSamples(comp.a.fn);
  const samplesB = collectSamples(comp.b.fn);
  const result = welchTTest(samplesA, samplesB);
  const rawA = samplesA.reduce((s, v) => s + v, 0) / samplesA.length;
  const rawB = samplesB.reduce((s, v) => s + v, 0) / samplesB.length;
  const pctChange = rawB !== 0 ? ((rawA - rawB) / rawB) * 100 : 0;

  const sig = result.significant ? `YES ${result.marker}` : "NO";
  const sign = pctChange > 0 ? "+" : "";
  console.log(`  > ${comp.name}`);
  console.log(
    `    ${comp.a.label}: ${fmtNs(rawA)}  vs  ${comp.b.label}: ${fmtNs(rawB)}  (${sign}${pctChange.toFixed(1)}%)`,
  );
  console.log(`    p=${result.p.toExponential(3)}  significant=${sig}`);
  console.log();

  pResults.push({
    name: comp.name,
    aLabel: comp.a.label,
    bLabel: comp.b.label,
    aMean: fmtNs(rawA),
    bMean: fmtNs(rawB),
    pctChange,
    result,
  });
}

// Key benchmark sampling for cross-branch comparison
const keyBenchmarks: Record<string, () => void> = {
  "getVCT x 20": benchGetVCT20,
  "calcDims with density": benchCalcDimsWithDensity,
  createNormalizedLogo: () =>
    createNormalizedLogo(
      sources[0]!,
      measurements[0]!,
      DEFAULT_BASE_SIZE,
      DEFAULT_SCALE_FACTOR,
      DEFAULT_DENSITY_FACTOR,
    ),
  [`fullPipeline ${medium!.label} density ON`]: benchFullPipelineDensityOn,
  [`worstCase 1 x ${medium!.label}`]: () => worstCaseRun(medium!.img, 1),
  [`worstCase 20 x ${medium!.label}`]: () => worstCaseRun(medium!.img, 20),
};

const benchSamples: Record<string, number[]> = {};
for (const [name, fn] of Object.entries(keyBenchmarks)) {
  benchSamples[name] = collectSamples(fn);
}

// Markdown report for CI

const jobUrl = process.env.BENCH_JOB_URL || null;

const md: string[] = [
  "# react-logo-soup Benchmark Report",
  "",
  jobUrl
    ? `> Full benchmark output in the [CI job logs](${jobUrl}). This summary covers statistical significance tests.`
    : "> This summary covers statistical significance tests.",
  "",
  `> Test fixtures: ${LOGO_DIMS.length} logo dimensions from real SVGs in static/logos/. ` +
    `${PVALUE_ITERS} samples per group, ${PVALUE_WARMUP} warmup iterations.`,
  "",
  "## Feature Comparisons (Welch's t-test)",
  "",
  "| Test | A | B | Delta | Sig |",
  "|:-----|--:|--:|------:|:----|",
];

for (const r of pResults) {
  const sig = r.result.significant ? `YES ${r.result.marker}` : "NO";
  const sign = r.pctChange > 0 ? "+" : "";
  md.push(
    `| ${r.name} | ${r.aMean} | ${r.bMean} | ${sign}${r.pctChange.toFixed(1)}% | ${sig} |`,
  );
}

md.push("");
md.push(
  "> A/B columns match the order in the test name. Sig: `*` p<0.05, `**` p<0.01, `***` p<0.001, `-` not significant.",
);
md.push("");

const mdContent = md.join("\n");

try {
  await Bun.write("benchmark-report.md", mdContent);
  console.log("─".repeat(80));
  console.log("  Wrote benchmark-report.md");
  console.log("─".repeat(80));
} catch {
  // non-critical
}

const summaryPath = process.env.GITHUB_STEP_SUMMARY;
if (summaryPath) {
  try {
    await Bun.write(summaryPath, mdContent);
    console.log("  Wrote to $GITHUB_STEP_SUMMARY");
  } catch {
    // non-critical
  }
}

const samplesPath = process.env.BENCH_SAMPLES_PATH ?? "benchmark-samples.json";
try {
  await Bun.write(samplesPath, JSON.stringify(benchSamples));
  console.log(`  Wrote ${samplesPath}`);
} catch {
  // non-critical
}
