const MAX_DIMENSION = 1536; // Resize large images to this max dimension to speed up processing

/**
 * Non-blocking image resizing and JPEG encoding for multimodal vision models.
 * Uses createImageBitmap + OffscreenCanvas where available for off-main-thread processing.
 *
 * @param file The image File to process
 * @returns Base64 Data URL (image/jpeg, quality 0.85)
 */
export const processImage = async (file: File): Promise<string> => {
  // Use createImageBitmap for non-blocking decoding
  // This is much faster than FileReader + Image.onload and runs off-main-thread where possible
  const bitmap = await createImageBitmap(file);

  let { width, height } = bitmap;

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    if (width > height) {
      height = Math.round((height * MAX_DIMENSION) / width);
      width = MAX_DIMENSION;
    } else {
      width = Math.round((width * MAX_DIMENSION) / height);
      height = MAX_DIMENSION;
    }
  }

  // Use OffscreenCanvas if available for better performance
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get offscreen context');

    ctx.drawImage(bitmap, 0, 0, width, height);

    // Low quality JPEG is fine for vision models usually, but 0.85 is a safe middle ground
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
    bitmap.close();

    // fast blob to base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } else {
    // Fallback to Main Thread Canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      throw new Error('Canvas context unavailable');
    }

    ctx.drawImage(bitmap, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    bitmap.close();
    return dataUrl;
  }
};
