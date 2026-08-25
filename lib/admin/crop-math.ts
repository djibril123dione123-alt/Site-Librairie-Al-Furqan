export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropData extends CropRect {
  // Natural pixel dimensions of the ORIGINAL image this rect was drawn
  // against — kept alongside the rect so a future edit can sanity-check
  // the rect still makes sense even if something upstream ever changes.
  sourceWidth: number;
  sourceHeight: number;
}

export const MIN_CROP_SIZE = 24;

export function clampRect(rect: CropRect, boundsWidth: number, boundsHeight: number): CropRect {
  let { x, y, width, height } = rect;
  width = Math.max(MIN_CROP_SIZE, Math.min(width, boundsWidth));
  height = Math.max(MIN_CROP_SIZE, Math.min(height, boundsHeight));
  x = Math.max(0, Math.min(x, boundsWidth - width));
  y = Math.max(0, Math.min(y, boundsHeight - height));
  return { x, y, width, height };
}

// No realistic storefront surface (catalogue card, PDP gallery, author/
// publisher strip, collection block) needs more than this on the long
// side — Next.js's own Image Optimization already downsamples per
// `sizes` on top of this. Caps real high-resolution phone/scanner
// originals (routinely 3000px+) down to something proportionate, never
// upscales anything smaller (Phase L.1 §14).
export const MAX_DERIVED_DIMENSION = 2000;

/**
 * Draws the crop rectangle from a source image onto a canvas, scaled down
 * to fit within maxDimension on the long side if the rectangle itself is
 * larger — never stretched to a fixed aspect ratio, and never upscaled:
 * a rectangle already smaller than maxDimension is copied at its own
 * native size.
 */
export function drawCropToCanvas(image: HTMLImageElement, rect: CropRect, maxDimension = MAX_DERIVED_DIMENSION): HTMLCanvasElement {
  const scale = Math.min(1, maxDimension / Math.max(rect.width, rect.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(rect.width * scale));
  canvas.height = Math.max(1, Math.round(rect.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(
    image,
    rect.x,
    rect.y,
    rect.width,
    rect.height,
    0,
    0,
    canvas.width,
    canvas.height
  );
  return canvas;
}

/**
 * Same 1:1 crop as drawCropToCanvas, downscaled to fit within maxDimension
 * on the long side — for the live "Aperçu boutique" preview only, which
 * only ever renders at card size (~160px). Never used for the actual
 * saved derivative; keeps a preview redraw on every drag frame cheap
 * regardless of how large the real source image is.
 */
export function drawPreviewCanvas(image: HTMLImageElement, rect: CropRect, maxDimension = 240): HTMLCanvasElement {
  const scale = Math.min(1, maxDimension / Math.max(rect.width, rect.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(rect.width * scale));
  canvas.height = Math.max(1, Math.round(rect.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Échec de la génération de l\'image recadrée'));
    }, 'image/png');
  });
}

// High-quality WebP: real photographic covers compress far smaller than
// PNG at this quality with no visible loss (verified — see Phase L.1
// report), and WebP keeps the alpha channel a source PNG might use.
// 0.92 was chosen empirically: 0.95 saved negligible visual difference
// for meaningfully larger files; below ~0.85 fine typography started
// softening.
export const DERIVED_WEBP_QUALITY = 0.92;

export function canvasToWebpBlob(canvas: HTMLCanvasElement, quality = DERIVED_WEBP_QUALITY): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Échec de la génération de l\'image recadrée'));
    }, 'image/webp', quality);
  });
}

/**
 * Conservative margin detection: scans inward from each edge and stops at
 * the first row/column that isn't uniformly near-white/transparent. Only
 * ever used to PROPOSE a crop rectangle — the caller must still require
 * explicit confirmation before applying it (Phase L §17).
 */
export function detectContentBounds(
  image: HTMLImageElement,
  options: { whiteThreshold?: number; tolerance?: number } = {}
): CropRect | null {
  const { whiteThreshold = 245, tolerance = 0.06 } = options;
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0);
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  } catch {
    return null; // tainted canvas (cross-origin) — caller falls back to manual crop
  }

  const w = canvas.width;
  const h = canvas.height;

  function isMarginPixel(idx: number): boolean {
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = data[idx + 3];
    if (a < 10) return true; // near-transparent
    return r >= whiteThreshold && g >= whiteThreshold && b >= whiteThreshold;
  }

  function rowIsMargin(y: number): boolean {
    let marginCount = 0;
    for (let x = 0; x < w; x++) {
      if (isMarginPixel((y * w + x) * 4)) marginCount++;
    }
    return marginCount / w >= 1 - tolerance;
  }

  function colIsMargin(x: number): boolean {
    let marginCount = 0;
    for (let y = 0; y < h; y++) {
      if (isMarginPixel((y * w + x) * 4)) marginCount++;
    }
    return marginCount / h >= 1 - tolerance;
  }

  let top = 0;
  while (top < h - 1 && rowIsMargin(top)) top++;
  let bottom = h - 1;
  while (bottom > top && rowIsMargin(bottom)) bottom--;
  let left = 0;
  while (left < w - 1 && colIsMargin(left)) left++;
  let right = w - 1;
  while (right > left && colIsMargin(right)) right--;

  const rect: CropRect = { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
  // If detection found essentially the whole image (nothing to trim), it's
  // not a useful proposal — let the caller keep the full-image default.
  if (rect.width >= w * 0.98 && rect.height >= h * 0.98) return null;
  if (rect.width < MIN_CROP_SIZE || rect.height < MIN_CROP_SIZE) return null;
  return rect;
}
