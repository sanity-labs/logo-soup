import type { MeasurementResult } from "../types";

export function computeScanSize(
  w: number,
  h: number,
): { sw: number; sh: number } {
  var PIXEL_BUDGET = 2048;
  var totalPixels = w * h;
  var ratio =
    totalPixels > PIXEL_BUDGET ? Math.sqrt(PIXEL_BUDGET / totalPixels) : 1;
  var sw = Math.max(1, Math.round(w * ratio));
  var sh = Math.max(1, Math.round(h * ratio));
  return { sw: sw, sh: sh };
}

export function scanPixelData(
  data32: Uint32Array,
  sw: number,
  sh: number,
  w: number,
  h: number,
  contrastThreshold: number,
  includeDensity: boolean,
): MeasurementResult {
  var scaleX = w / sw;
  var scaleY = h / sh;
  var threshSq = contrastThreshold * contrastThreshold * 3;

  var minX = sw;
  var minY = sh;
  var maxX = 0;
  var maxY = 0;

  var totalWeight = 0;
  var weightedX = 0;
  var weightedY = 0;

  var filledPixels = 0;
  var totalWeightedOpacity = 0;

  var pixelCount = sw * sh;
  for (var i = 0; i < pixelCount; i++) {
    var pixel = data32[i]!;

    var a = pixel >>> 24;
    if (a <= contrastThreshold) continue;

    var r = pixel & 0xff;
    var g = (pixel >>> 8) & 0xff;
    var b = (pixel >>> 16) & 0xff;

    var dr = r - 255;
    var dg = g - 255;
    var db = b - 255;

    var distSq = dr * dr + dg * dg + db * db;
    if (distSq < threshSq) continue;

    var x = i % sw;
    var y = (i - x) / sw;

    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;

    var weight = distSq * a;

    totalWeight += weight;
    weightedX += (x + 0.5) * weight;
    weightedY += (y + 0.5) * weight;

    filledPixels++;
    totalWeightedOpacity += a;
  }

  if (minX > maxX || minY > maxY) {
    return {
      width: w,
      height: h,
      contentBox: { x: 0, y: 0, width: w, height: h },
      visualCenter: { x: w / 2, y: h / 2, offsetX: 0, offsetY: 0 },
      pixelDensity: includeDensity ? 0.5 : undefined,
    };
  }

  var cbX = Math.floor(minX * scaleX);
  var cbY = Math.floor(minY * scaleY);
  var contentBox = {
    x: cbX,
    y: cbY,
    width: Math.min(Math.ceil((maxX + 1) * scaleX), w) - cbX,
    height: Math.min(Math.ceil((maxY + 1) * scaleY), h) - cbY,
  };

  var visualCenter;
  if (totalWeight === 0) {
    var centerX = contentBox.x + contentBox.width / 2;
    var centerY = contentBox.y + contentBox.height / 2;
    visualCenter = { x: centerX, y: centerY, offsetX: 0, offsetY: 0 };
  } else {
    var globalCenterX = (weightedX / totalWeight) * scaleX;
    var globalCenterY = (weightedY / totalWeight) * scaleY;
    var localCenterX = globalCenterX - contentBox.x;
    var localCenterY = globalCenterY - contentBox.y;
    var geometricCenterX = contentBox.width / 2;
    var geometricCenterY = contentBox.height / 2;
    visualCenter = {
      x: globalCenterX,
      y: globalCenterY,
      offsetX: localCenterX - geometricCenterX,
      offsetY: localCenterY - geometricCenterY,
    };
  }

  var result: MeasurementResult = {
    width: w,
    height: h,
    contentBox: contentBox,
    visualCenter: visualCenter,
  };

  if (includeDensity) {
    var scanArea = (maxX - minX + 1) * (maxY - minY + 1);
    if (scanArea === 0) {
      result.pixelDensity = 0.5;
    } else {
      var coverageRatio = filledPixels / scanArea;
      var averageOpacity =
        filledPixels > 0 ? totalWeightedOpacity / 255 / filledPixels : 0;
      result.pixelDensity = coverageRatio * averageOpacity;
    }
  }

  return result;
}
