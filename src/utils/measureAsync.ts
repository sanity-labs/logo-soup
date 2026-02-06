import type { MeasurementResult } from "../types";
import { measureWithContentDetection } from "./measure";
import { computeScanSize, scanPixelData } from "./scanPixels";

const WORKER_SOURCE = `
'use strict';
var computeScanSize = ${computeScanSize.toString()};
var scanPixelData = ${scanPixelData.toString()};

self.onmessage = function(e) {
  var msg = e.data;
  try {
    var w = msg.bitmap.width;
    var h = msg.bitmap.height;
    var size = computeScanSize(w, h);
    var canvas = new OffscreenCanvas(size.sw, size.sh);
    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      try { msg.bitmap.close(); } catch (_) {}
      self.postMessage({ id: msg.id, result: { width: w, height: h } });
      return;
    }
    ctx.drawImage(msg.bitmap, 0, 0, size.sw, size.sh);
    try { msg.bitmap.close(); } catch (_) {}
    var imageData = ctx.getImageData(0, 0, size.sw, size.sh);
    var data32 = new Uint32Array(imageData.data.buffer);
    var result = scanPixelData(data32, size.sw, size.sh, w, h, msg.contrastThreshold, msg.includeDensity);
    self.postMessage({ id: msg.id, result: result });
  } catch (err) {
    try { msg.bitmap.close(); } catch (_) {}
    self.postMessage({ id: msg.id, error: (err && err.message) || 'Measurement failed' });
  }
};
`;

interface PendingTask {
  resolve: (result: MeasurementResult) => void;
  reject: (error: Error) => void;
}

let _supported: boolean | null = null;
let _blobUrl: string | null = null;
let _pool: Worker[] | null = null;
let _nextId = 0;
let _nextWorker = 0;
const _pending = new Map<number, PendingTask>();

export function isParallelMeasureSupported(): boolean {
  if (_supported !== null) return _supported;
  try {
    _supported =
      typeof Worker !== "undefined" &&
      typeof OffscreenCanvas !== "undefined" &&
      typeof createImageBitmap !== "undefined";
  } catch {
    _supported = false;
  }
  return _supported;
}

function getPoolSize(): number {
  if (typeof navigator !== "undefined" && navigator.hardwareConcurrency) {
    return Math.max(1, Math.min(navigator.hardwareConcurrency, 4));
  }
  return 4;
}

function getBlobUrl(): string {
  if (!_blobUrl) {
    const blob = new Blob([WORKER_SOURCE], { type: "application/javascript" });
    _blobUrl = URL.createObjectURL(blob);
  }
  return _blobUrl;
}

function handleMessage(e: MessageEvent): void {
  const { id, result, error } = e.data;
  const task = _pending.get(id);
  if (!task) return;
  _pending.delete(id);
  if (error) {
    task.reject(new Error(error));
  } else {
    task.resolve(result as MeasurementResult);
  }
}

function ensurePool(): Worker[] | null {
  if (_pool) return _pool;
  try {
    const url = getBlobUrl();
    const size = getPoolSize();
    _pool = [];
    for (let i = 0; i < size; i++) {
      const w = new Worker(url);
      w.onmessage = handleMessage;
      _pool.push(w);
    }
    return _pool;
  } catch {
    _supported = false;
    _pool = null;
    return null;
  }
}

function dispatch(
  bitmap: ImageBitmap,
  contrastThreshold: number,
  includeDensity: boolean,
): Promise<MeasurementResult> {
  const workers = ensurePool();
  if (!workers) {
    bitmap.close();
    return Promise.reject(new Error("Worker pool unavailable"));
  }

  const id = _nextId++;
  const worker = workers[_nextWorker % workers.length]!;
  _nextWorker++;

  return new Promise<MeasurementResult>((resolve, reject) => {
    _pending.set(id, { resolve, reject });
    worker.postMessage({ id, bitmap, contrastThreshold, includeDensity }, [
      bitmap,
    ]);
  });
}

export async function measureContentAsync(
  img: HTMLImageElement,
  contrastThreshold: number,
  includeDensity: boolean,
): Promise<MeasurementResult> {
  if (!isParallelMeasureSupported()) {
    return measureWithContentDetection(img, contrastThreshold, includeDensity);
  }
  try {
    const bitmap = await createImageBitmap(img);
    return await dispatch(bitmap, contrastThreshold, includeDensity);
  } catch {
    return measureWithContentDetection(img, contrastThreshold, includeDensity);
  }
}

export async function measureContentBatchAsync(
  items: ReadonlyArray<{
    img: HTMLImageElement;
    contrastThreshold: number;
    includeDensity: boolean;
  }>,
): Promise<MeasurementResult[]> {
  if (items.length === 0) return [];

  if (!isParallelMeasureSupported()) {
    return items.map((item) =>
      measureWithContentDetection(
        item.img,
        item.contrastThreshold,
        item.includeDensity,
      ),
    );
  }

  try {
    const bitmaps = await Promise.all(
      items.map((item) => createImageBitmap(item.img)),
    );
    return await Promise.all(
      bitmaps.map((bitmap, i) => {
        const item = items[i]!;
        return dispatch(bitmap, item.contrastThreshold, item.includeDensity);
      }),
    );
  } catch {
    return items.map((item) =>
      measureWithContentDetection(
        item.img,
        item.contrastThreshold,
        item.includeDensity,
      ),
    );
  }
}

export function disposeMeasurementPool(): void {
  if (_pool) {
    for (const w of _pool) w.terminate();
    _pool = null;
  }

  for (const task of _pending.values()) {
    task.reject(new Error("Pool disposed"));
  }
  _pending.clear();
  _nextWorker = 0;

  if (_blobUrl) {
    URL.revokeObjectURL(_blobUrl);
    _blobUrl = null;
  }
}
