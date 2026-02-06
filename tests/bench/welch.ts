export interface TTestResult {
  t: number;
  df: number;
  p: number;
  significant: boolean;
  marker: string;
}

export function mean(arr: number[]): number {
  let s = 0;
  for (let i = 0; i < arr.length; i++) s += arr[i]!;
  return s / arr.length;
}

function variance(arr: number[]): number {
  const m = mean(arr);
  let s = 0;
  for (let i = 0; i < arr.length; i++) s += (arr[i]! - m) ** 2;
  return s / (arr.length - 1);
}

// Lanczos approximation for ln(Gamma(z))
const LANCZOS_G = 7;
const LANCZOS_C = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028,
  771.32342877765313, -176.61502916214059, 12.507343278686905,
  -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
];

function lnGamma(z: number): number {
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
  }
  z -= 1;
  let x = LANCZOS_C[0]!;
  for (let i = 1; i < LANCZOS_G + 2; i++) x += LANCZOS_C[i]! / (z + i);
  const t = z + LANCZOS_G + 0.5;
  return (
    0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x)
  );
}

// Regularized incomplete beta function I_x(a, b) via continued fraction (Lentz)
function betaReg(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  if (x > (a + 1) / (a + b + 2)) return 1 - betaReg(1 - x, b, a);

  const lnPre =
    a * Math.log(x) +
    b * Math.log(1 - x) -
    Math.log(a) -
    (lnGamma(a) + lnGamma(b) - lnGamma(a + b));
  const front = Math.exp(lnPre);

  let f = 1;
  let c = 1;
  let d = 0;

  for (let i = 0; i <= 200; i++) {
    const m = i >> 1;
    let num: number;
    if (i === 0) {
      num = 1;
    } else if (i & 1) {
      num = -((a + m) * (a + b + m) * x) / ((a + 2 * m) * (a + 2 * m + 1));
    } else {
      num = (m * (b - m) * x) / ((a + 2 * m - 1) * (a + 2 * m));
    }

    d = 1 + num * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    d = 1 / d;

    c = 1 + num / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;

    f *= c * d;
    if (Math.abs(c * d - 1) < 1e-14) break;
  }

  return front * (f - 1);
}

function studentTCdf(t: number, df: number): number {
  const x = df / (df + t * t);
  const ib = betaReg(x, df / 2, 0.5);
  return t >= 0 ? 1 - 0.5 * ib : 0.5 * ib;
}

export function welchTTest(a: number[], b: number[]): TTestResult {
  const n1 = a.length;
  const n2 = b.length;
  const v1 = variance(a);
  const v2 = variance(b);
  const se = v1 / n1 + v2 / n2;

  if (se === 0) {
    return { t: 0, df: n1 + n2 - 2, p: 1, significant: false, marker: "" };
  }

  const t = (mean(a) - mean(b)) / Math.sqrt(se);
  const df = se ** 2 / ((v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1));
  const p = Math.min(1, Math.max(0, 2 * (1 - studentTCdf(Math.abs(t), df))));
  const marker = p < 0.001 ? "***" : p < 0.01 ? "**" : p < 0.05 ? "*" : "";

  return { t, df, p, significant: p < 0.05, marker };
}

export function fmtP(p: number): string {
  if (p === 0 || p < 0.001) return "<0.001";
  return p.toFixed(3);
}

export function fmtNs(ns: number): string {
  if (ns < 1_000) return `${ns.toFixed(0)} ns`;
  if (ns < 1_000_000) return `${(ns / 1_000).toFixed(2)} us`;
  if (ns < 1_000_000_000) return `${(ns / 1_000_000).toFixed(2)} ms`;
  return `${(ns / 1_000_000_000).toFixed(3)} s`;
}
