
import { GoogleGenAI } from "@google/genai";
import { AppSettings } from "../types";

const MAX_DIMENSION = 1536; // Resize large images to this max dimension to speed up processing

// Helper: Resize image and return DataURL (JPEG 0.9)
const processImage = async (file: File): Promise<string> => {
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

const generateWithGoogle = async (file: File, settings: AppSettings): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: settings.apiKey });
  // Use smart resizing
  const dataUrl = await processImage(file);
  const base64Data = dataUrl.split(',')[1];

  const response = await ai.models.generateContent({
    model: settings.model || 'gemini-2.5-flash',
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Data,
            mimeType: 'image/jpeg', // Always jpeg after resizing
          },
        },
        { text: settings.activePrompt }
      ]
    }
  });

  const candidate = response.candidates?.[0];
  if (!candidate) {
    throw new Error("API returned no candidates.");
  }

  // Check for truncation
  if (candidate.finishReason === 'MAX_TOKENS') {
    throw new Error("Response Truncated (Max Tokens). Try increasing the limit or shortening the prompt.");
  }

  // Other finish reasons that might indicate failure, though STOP is the normal one.
  // We generally accept STOP. 

  const text = response.text;
  if (!text && text !== "") {
    throw new Error("API returned an empty response.");
  }

  return text || "";
};

const generateWithOpenAI = async (file: File, settings: AppSettings): Promise<string> => {
  // Use smart resizing
  const imageUrl = await processImage(file);

  const rawBaseUrl = settings.baseUrl.trim();
  const baseUrl = rawBaseUrl.replace(/\/+$/, "");

  let apiUrl = baseUrl;

  if (apiUrl.endsWith('/chat/completions')) {
    // keep as is
  } else if (apiUrl.endsWith('/v1')) {
    apiUrl = `${apiUrl}/chat/completions`;
  } else {
    apiUrl = `${apiUrl}/v1/chat/completions`;
  }

  const payload = {
    model: settings.model || "gpt-4-vision-preview",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: settings.activePrompt },
          {
            type: "image_url",
            image_url: {
              url: imageUrl
            }
          }
        ]
      }
    ],
    max_tokens: 2000
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${settings.apiKey}`
  };

  // Inject custom headers
  if (settings.customHeaders) {
    settings.customHeaders.forEach(h => {
      if (h.key && h.value) {
        headers[h.key] = h.value;
      }
    });
  }

  // Retry Logic (3 attempts)
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

      const response = await fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMsg = response.statusText;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error?.message || JSON.stringify(errorData);
        } catch (e) {
          // ignore
        }
        // Don't throw immediately, let retry logic handle if appropriate, or throw if fatal
        if (response.status === 401 || response.status === 403) {
          throw new Error(`Auth Error ${response.status}: ${errorMsg} (Check API Key)`);
        }
        throw new Error(`API Error ${response.status}: ${errorMsg}`);
      }

      const data = await response.json();
      const choice = data.choices?.[0];

      if (!choice) throw new Error("API returned no choices.");

      if (choice.finish_reason === 'length') throw new Error("Response Truncated (Max Tokens).");
      if (choice.finish_reason === 'content_filter') throw new Error("Response Filtered (Content Policy).");

      const content = choice.message?.content;
      if (!content && content !== "") throw new Error("API returned an empty response.");

      return content || "";

    } catch (error: unknown) {
      lastError = error;
      const err = error as Error;
      console.warn(`Attempt ${attempt + 1} failed:`, err.message);

      // Break on fatal errors (Auth, 404, or abort)
      if (err.message.includes('Auth Error') || err.message.includes('404')) break;
      if (err.name === 'AbortError') throw new Error("Request Timeout (60s)");

      // Wait before retry (Exponential backoff: 1s, 2s, 4s)
      if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }

  // If we get here, all retries failed
  console.error("API Request Failed after retries:", lastError);
  const finalError = lastError as Error;
  if (finalError.name === 'TypeError' && finalError.message.includes('Failed to fetch')) {
    throw new Error(`Network Error: Could not connect to ${apiUrl}. Check CORS, URL, or your network.`);
  }
  throw finalError;
};

export const generateCaption = async (
  file: File,
  settings: AppSettings
): Promise<string> => {
  if (!settings.apiKey) {
    throw new Error("Please configure your API Key in Settings.");
  }

  try {
    if (settings.protocol === 'google') {
      return await generateWithGoogle(file, settings);
    } else {
      return await generateWithOpenAI(file, settings);
    }
  } catch (error: unknown) {
    console.error("Generation Error:", error);
    const err = error as Error;
    throw new Error(err.message || "Failed to generate caption");
  }
};

// Helper to create a 1x1 pixel Transparent GIF File object
const createDummyFile = (): File => {
  const base64 = "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: "image/gif" });
  return new File([blob], "test_connection.gif", { type: "image/gif" });
};

export const testConnection = async (settings: AppSettings): Promise<void> => {
  if (!settings.apiKey) {
    throw new Error("Please configure your API Key in Settings.");
  }

  const dummyFile = createDummyFile();
  // Temporarily override prompt to be very short to save tokens/time
  const testSettings = { ...settings, activePrompt: "Reply 'OK' if you receive this." };

  try {
    if (settings.protocol === 'google') {
      await generateWithGoogle(dummyFile, testSettings);
    } else {
      await generateWithOpenAI(dummyFile, testSettings);
    }
  } catch (error: unknown) {
    console.error("Connection Test Error:", error);
    const err = error as Error;
    throw new Error(err.message || "Connection Test Failed");
  }
};
