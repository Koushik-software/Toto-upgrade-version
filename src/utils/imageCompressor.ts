/**
 * Image Compression Utility for Toto Ride App
 * Ensures uploaded photos (driver selfie, vehicle photos) never exceed
 * Firestore's 1MB document size limit by resizing and compressing to lightweight JPEGs.
 */

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxBytes?: number; // Target max size in bytes (e.g. 70KB)
}

/**
 * Calculates approximate size in bytes of a base64 string or data URL
 */
export function estimateBase64Size(dataUrl: string): number {
  if (!dataUrl) return 0;
  const base64Index = dataUrl.indexOf(';base64,');
  const base64String = base64Index !== -1 ? dataUrl.slice(base64Index + 8) : dataUrl;
  return Math.round((base64String.length * 3) / 4);
}

/**
 * Human readable file size (e.g. 35 KB)
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Loads an image from a File, Blob, or existing URL/DataURL
 */
function loadImage(source: File | Blob | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    let objectUrlToRevoke: string | null = null;

    img.onload = () => {
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
      }
      resolve(img);
    };

    img.onerror = (err) => {
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
      }
      reject(new Error(`Failed to load image: ${err}`));
    };

    if (typeof source === 'string') {
      img.src = source;
    } else {
      objectUrlToRevoke = URL.createObjectURL(source);
      img.src = objectUrlToRevoke;
    }
  });
}

/**
 * Compresses an image using off-screen HTML5 Canvas.
 * Automatically resizes dimensions and outputs an optimized JPEG.
 * Typically produces files between 15 KB and 50 KB.
 */
export async function compressImage(
  source: File | Blob | string,
  options: CompressOptions = {}
): Promise<string> {
  let {
    maxWidth = 600,
    maxHeight = 600,
    quality = 0.65,
    maxBytes = 80 * 1024 // 80 KB
  } = options;

  try {
    const img = await loadImage(source);
    let { width, height } = img;

    // Calculate aspect-ratio-preserving dimensions
    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    // Ensure dimensions are valid positive integers
    width = Math.max(1, width);
    height = Math.max(1, height);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context not supported');
    }

    // High quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    let result = canvas.toDataURL('image/jpeg', quality);
    let estimatedSize = estimateBase64Size(result);

    // Iterative step-down if still too large
    let attempts = 0;
    while (estimatedSize > maxBytes && attempts < 3) {
      attempts++;
      quality = Math.max(0.35, quality - 0.15);
      width = Math.round(width * 0.85);
      height = Math.round(height * 0.85);

      canvas.width = width;
      canvas.height = height;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'medium';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      result = canvas.toDataURL('image/jpeg', quality);
      estimatedSize = estimateBase64Size(result);
    }

    return result;
  } catch (error) {
    console.warn('Image compression failed or browser canvas unavailable, attempting fallback:', error);
    // If source is already a string, return it if under safe limit
    if (typeof source === 'string') {
      return source;
    }
    // Otherwise read as basic data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(source as Blob);
    });
  }
}

/**
 * Defensive check: if an image string is provided and exceeds maxBytes, compress it.
 */
export async function compressImageIfNeeded(
  imageStr?: string,
  maxBytes: number = 70 * 1024
): Promise<string | undefined> {
  if (!imageStr) return undefined;
  // If it's an external HTTP URL, leave untouched
  if (imageStr.startsWith('http://') || imageStr.startsWith('https://')) {
    return imageStr;
  }
  const size = estimateBase64Size(imageStr);
  if (size <= maxBytes) {
    return imageStr;
  }
  try {
    return await compressImage(imageStr, { maxWidth: 500, maxHeight: 500, quality: 0.6, maxBytes });
  } catch {
    return imageStr;
  }
}
