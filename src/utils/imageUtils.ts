import { AspectBucket, DatasetItem, Project } from '../types/prompt';

export function getAspectBucket(width: number, height: number): Exclude<AspectBucket, 'all'> {
  if (!width || !height) return 'square';
  const ratio = width / height;
  if (ratio > 1.15) return 'landscape';
  if (ratio < 0.87) return 'portrait';
  return 'square';
}

export async function urlOrDataToBase64(
  url: string
): Promise<{ base64: string; mimeType: string }> {
  if (url.startsWith('data:')) {
    const match = url.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      return { mimeType: match[1], base64: match[2] };
    }
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load image (${res.status})`);
  }
  const blob = await res.blob();
  const mimeType = blob.type || 'image/jpeg';

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const idx = dataUrl.indexOf(',');
      resolve({
        mimeType,
        base64: idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl,
      });
    };
    reader.onerror = () => reject(new Error('Failed to encode image as base64'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Downscales large images before sending to Gemini Vision API to reduce payload size
 * and upload latency while preserving crisp visual detail.
 */
export async function prepareVisionPayload(
  url: string,
  maxDimension = 1536
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const w = img.naturalWidth || 1024;
      const h = img.naturalHeight || 1024;
      const longest = Math.max(w, h);

      if (longest <= maxDimension && url.startsWith('data:image/jpeg')) {
        const idx = url.indexOf(',');
        resolve({ mimeType: 'image/jpeg', base64: idx >= 0 ? url.slice(idx + 1) : url });
        return;
      }

      const scale = longest > maxDimension ? maxDimension / longest : 1;
      const targetW = Math.max(1, Math.round(w * scale));
      const targetH = Math.max(1, Math.round(h * scale));

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        urlOrDataToBase64(url).then(resolve, reject);
        return;
      }
      ctx.drawImage(img, 0, 0, targetW, targetH);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      const idx = dataUrl.indexOf(',');
      resolve({
        mimeType: 'image/jpeg',
        base64: idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl,
      });
    };
    img.onerror = () => {
      urlOrDataToBase64(url).then(resolve, reject);
    };
    img.src = url;
  });
}

export async function readImageFile(file: File): Promise<{
  previewUrl: string;
  width: number;
  height: number;
  mimeType: string;
}> {
  const rawUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Unable to read ${file.name}`));
    reader.readAsDataURL(file);
  });

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const origW = img.naturalWidth || 1024;
      const origH = img.naturalHeight || 1024;
      const maxEdge = 1920;
      const longest = Math.max(origW, origH);

      // Keep memory & IndexedDB footprint lean for massive 4K+ photo imports
      if (longest > maxEdge || file.size > 1_800_000) {
        const scale = longest > maxEdge ? maxEdge / longest : 1;
        const w = Math.max(1, Math.round(origW * scale));
        const h = Math.max(1, Math.round(origH * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          resolve({
            previewUrl: canvas.toDataURL('image/jpeg', 0.9),
            width: origW,
            height: origH,
            mimeType: 'image/jpeg',
          });
          return;
        }
      }

      resolve({
        previewUrl: rawUrl,
        width: origW,
        height: origH,
        mimeType: file.type || 'image/jpeg',
      });
    };
    img.onerror = () =>
      resolve({
        previewUrl: rawUrl,
        width: 1024,
        height: 1024,
        mimeType: file.type || 'image/jpeg',
      });
    img.src = rawUrl;
  });
}

export async function cropImageToAspect(
  srcUrl: string,
  targetRatio: number | null
): Promise<{ previewUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const sw = img.naturalWidth;
      const sh = img.naturalHeight;
      let cropW = sw;
      let cropH = sh;

      if (targetRatio !== null) {
        const currentRatio = sw / sh;
        if (currentRatio > targetRatio) {
          cropH = sh;
          cropW = Math.round(sh * targetRatio);
        } else {
          cropW = sw;
          cropH = Math.round(sw / targetRatio);
        }
      } else {
        cropW = Math.round(sw * 0.9);
        cropH = Math.round(sh * 0.9);
      }

      const sx = Math.round((sw - cropW) / 2);
      const sy = Math.round((sh - cropH) / 2);

      const canvas = document.createElement('canvas');
      canvas.width = cropW;
      canvas.height = cropH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }
      ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, cropW, cropH);
      resolve({
        previewUrl: canvas.toDataURL('image/jpeg', 0.92),
        width: cropW,
        height: cropH,
      });
    };
    img.onerror = () => reject(new Error('Failed to load image for cropping'));
    img.src = srcUrl;
  });
}

export function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportProjectsZip(
  projects: Project[],
  format: 'txt' | 'json'
): Promise<void> {
  // Lazy-load JSZip only when exporting to keep initial bundle light
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();

  for (const project of projects) {
    if (project.items.length === 0) continue;
    const safeFolder = project.name.replace(/[\\/:*?"<>|]+/g, '_').trim() || 'dataset';
    const folder = zip.folder(safeFolder);
    if (!folder) continue;

    const usedNames = new Map<string, number>();

    for (const item of project.items) {
      const dotIdx = item.name.lastIndexOf('.');
      const baseRaw = dotIdx > 0 ? item.name.slice(0, dotIdx) : item.name;
      const extRaw = dotIdx > 0 ? item.name.slice(dotIdx) : '.jpg';

      const count = usedNames.get(baseRaw) ?? 0;
      usedNames.set(baseRaw, count + 1);
      const finalBase = count === 0 ? baseRaw : `${baseRaw}_${count + 1}`;

      try {
        const { base64 } = await urlOrDataToBase64(item.previewUrl);
        folder.file(`${finalBase}${extRaw}`, base64, { base64: true });
      } catch {
        // Skip binary if unreachable
      }

      if (format === 'txt') {
        folder.file(`${finalBase}.txt`, item.caption || '');
      } else {
        const payload = item.layoutSpec
          ? item.layoutSpec
          : {
              filename: `${finalBase}${extRaw}`,
              target_model: item.targetModel,
              krea_variant: item.kreaVariant,
              dimensions: { width: item.width, height: item.height },
              prompt: item.caption || '',
            };
        folder.file(`${finalBase}.json`, JSON.stringify(payload, null, 2));
      }
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tag-master-dataset-${format}-${new Date().toISOString().slice(0, 10)}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

export function getSidecarFilename(item: DatasetItem, format: 'txt' | 'json'): string {
  const dotIdx = item.name.lastIndexOf('.');
  const base = dotIdx > 0 ? item.name.slice(0, dotIdx) : item.name;
  return `${base}.${format}`;
}
