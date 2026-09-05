
import { AppSettings } from "../types";
import { processImage } from "./imageProcessor";
import { smartFetch, sleepWithSignal } from "./networkUtils";

export class RateLimitError extends Error {
  retryAfterSec: number;
  isRateLimit = true;

  constructor(message: string, retryAfterSec = 20) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfterSec = Math.max(1, Math.ceil(retryAfterSec));
  }
}

export interface ApiErrorDetail {
  '@type'?: string;
  retryDelay?: string;
  [key: string]: unknown;
}

export interface ApiErrorData {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    details?: ApiErrorDetail[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export function parseRetryAfter(response?: Response, errorData?: ApiErrorData | null): number {
  // 1. Try Google error.details[].retryDelay (e.g. "21.45s" or "60s")
  if (errorData?.error?.details && Array.isArray(errorData.error.details)) {
    for (const detail of errorData.error.details) {
      if (detail.retryDelay && typeof detail.retryDelay === 'string') {
        const secMatch = detail.retryDelay.match(/([\d.]+)s?/);
        if (secMatch) {
          const parsed = parseFloat(secMatch[1]);
          if (!isNaN(parsed) && parsed > 0) {
            return Math.ceil(parsed);
          }
        }
      }
    }
  }

  // 2. Try HTTP header 'Retry-After'
  if (response && response.headers && typeof response.headers.get === 'function') {
    const retryHeader = response.headers.get('Retry-After');
    if (retryHeader) {
      const parsed = parseInt(retryHeader, 10);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
  }

  // 3. Try parsing seconds from error message if text like "Please retry after 24s" or "wait 20s"
  const rawMsg = errorData?.error?.message || (typeof errorData === 'string' ? errorData : '');
  if (rawMsg) {
    const match = rawMsg.match(/retry\s+after\s+([\d.]+)\s*s/i) || rawMsg.match(/wait\s+([\d.]+)\s*s/i);
    if (match) {
      const parsed = parseFloat(match[1]);
      if (!isNaN(parsed) && parsed > 0) {
        return Math.ceil(parsed);
      }
    }
  }

  // 4. Default fallback: 20 seconds for standard RPM/TPM rolling window
  return 20;
}

export function isRateLimitResponse(status: number, errorMsg: string, errorData?: ApiErrorData | null): boolean {
  if (status === 429) return true;
  const statusStr = (errorData?.error?.status || '').toUpperCase();
  if (statusStr === 'RESOURCE_EXHAUSTED' || statusStr === 'RATE_LIMIT_EXCEEDED') return true;

  const textToScan = `${errorMsg} ${JSON.stringify(errorData || '')}`.toLowerCase();
  return (
    textToScan.includes('resource_exhausted') ||
    textToScan.includes('rate_limit') ||
    textToScan.includes('rate limit') ||
    textToScan.includes('quota exceeded') ||
    textToScan.includes('too many requests') ||
    textToScan.includes('tokens per minute') ||
    textToScan.includes('requests per minute') ||
    textToScan.includes('rpm') ||
    textToScan.includes('tpm')
  );
}

const generateWithGoogle = async (file: File, settings: AppSettings, signal?: AbortSignal): Promise<string> => {
  if (signal?.aborted) {
    throw new DOMException('Aborted by user', 'AbortError');
  }

  // Use smart resizing
  const dataUrl = await processImage(file);
  if (signal?.aborted) {
    throw new DOMException('Aborted by user', 'AbortError');
  }

  const base64Data = dataUrl.split(',')[1];
  const model = settings.model || 'gemini-2.0-flash';
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${settings.apiKey}`;

  const payload = {
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Data
            }
          },
          {
            text: settings.activePrompt
          }
        ]
      }
    ]
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);
  const onAbort = () => controller.abort();
  if (signal) {
    signal.addEventListener('abort', onAbort, { once: true });
  }

  try {
    const response = await smartFetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (signal) signal.removeEventListener('abort', onAbort);

    if (!response.ok) {
      let errorMsg = response.statusText;
      let errorData: ApiErrorData | null = null;
      try {
        errorData = await response.json() as ApiErrorData;
        errorMsg = errorData.error?.message || JSON.stringify(errorData);
      } catch {
        // ignore
      }

      if (isRateLimitResponse(response.status, errorMsg, errorData)) {
        const retryAfter = parseRetryAfter(response, errorData);
        throw new RateLimitError(`Gemini API 速率限制/配额耗尽 (429): ${errorMsg}`, retryAfter);
      }

      throw new Error(`Gemini API Error ${response.status}: ${errorMsg}`);
    }

    const data = await response.json();
    
    // Check candidates structure
    const candidate = data.candidates?.[0];
    if (!candidate) {
      throw new Error("API returned no candidates.");
    }

    if (candidate.finishReason === 'MAX_TOKENS') {
      throw new Error("Response Truncated (Max Tokens).");
    }

    const text = candidate.content?.parts?.[0]?.text;
    if (!text && text !== "") {
      throw new Error("API returned an empty response.");
    }

    return text || "";
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (signal) signal.removeEventListener('abort', onAbort);
    if (signal?.aborted) {
      throw new DOMException('Aborted by user', 'AbortError');
    }
    if ((error as Error)?.name === 'AbortError') {
      throw new Error("请求超时 (60s): 无法连接至 Google Gemini API，请检查网络连接或科学上网配置。");
    }
    throw error;
  }
};

const generateWithOpenAI = async (file: File, settings: AppSettings, signal?: AbortSignal): Promise<string> => {
  if (signal?.aborted) {
    throw new DOMException('Aborted by user', 'AbortError');
  }

  // Use smart resizing
  const imageUrl = await processImage(file);
  if (signal?.aborted) {
    throw new DOMException('Aborted by user', 'AbortError');
  }

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
    model: settings.model || "gpt-4o",
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

  // Retry Logic (up to 3 attempts, but fatal errors like CORS/Auth fail fast on attempt 1)
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (signal?.aborted) {
      throw new DOMException('Aborted by user', 'AbortError');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout
    const onAbort = () => controller.abort();
    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true });
    }

    try {
      const response = await smartFetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (signal) signal.removeEventListener('abort', onAbort);

      if (!response.ok) {
        let errorMsg = response.statusText;
        let errorData: ApiErrorData | null = null;
        try {
          errorData = await response.json() as ApiErrorData;
          errorMsg = errorData.error?.message || JSON.stringify(errorData);
        } catch {
          // ignore
        }

        if (response.status === 401 || response.status === 403) {
          throw new Error(`Auth Error ${response.status}: ${errorMsg} (请检查 API Key)`);
        }

        if (isRateLimitResponse(response.status, errorMsg, errorData)) {
          const retryAfter = parseRetryAfter(response, errorData);
          throw new RateLimitError(`API 速率限制/配额耗尽 (429): ${errorMsg}`, retryAfter);
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
      clearTimeout(timeoutId);
      if (signal) signal.removeEventListener('abort', onAbort);

      if (signal?.aborted) {
        throw new DOMException('Aborted by user', 'AbortError');
      }

      if (error instanceof RateLimitError) {
        // Bubble up immediately so global batch cooldown can manage it
        throw error;
      }

      lastError = error;
      const err = error as Error;
      console.warn(`Attempt ${attempt + 1} failed:`, err.message);

      // Check for CORS / Network failure (fatal on static web, will not succeed on retry)
      const isCorsOrFetchFailed = err.name === 'TypeError' &&
        (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'));

      // Break immediately on fatal errors (Auth, 404, or CORS/Fetch failed)
      if (err.message.includes('Auth Error') || err.message.includes('404') || isCorsOrFetchFailed) {
        break;
      }

      if (err.name === 'AbortError') {
        throw new Error("Request Timeout (60s)");
      }

      // Wait before retry (Cancellable exponential backoff: 1s, 2s)
      if (attempt < 2 && !signal?.aborted) {
        await sleepWithSignal(1000 * Math.pow(2, attempt), signal);
      }
    }
  }

  // If we get here, all retries failed
  console.error("API Request Failed after retries:", lastError);
  const finalError = lastError as Error;
  if (finalError.name === 'TypeError' && (finalError.message.includes('Failed to fetch') || finalError.message.includes('NetworkError'))) {
    const isWebDeploy = typeof window !== 'undefined' && window.location.protocol.startsWith('http') &&
      !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1');

    if (isWebDeploy) {
      throw new Error(`跨域拦截 (CORS Error): 浏览器阻止了对「${apiUrl}」的请求。该服务商未开放跨域头（在 Cherry Studio 等桌面客户端中不受浏览器安全限制，因此可用；但在网页端会被浏览器拦截）。建议：1. 换用支持跨域的端点（如 Google 官方 Gemini、SiliconFlow 等）；2. 或在本地运行（npm run dev）；3. 或联系中转站开启 CORS。`);
    } else {
      throw new Error(`网络连接失败: 无法连接至「${apiUrl}」，请检查网络连接、端点地址或 CORS 设置。`);
    }
  }
  throw finalError;
};

export const generateCaption = async (
  file: File,
  settings: AppSettings,
  signal?: AbortSignal
): Promise<string> => {
  if (!settings.apiKey) {
    throw new Error("Please configure your API Key in Settings.");
  }

  try {
    if (settings.protocol === 'google') {
      return await generateWithGoogle(file, settings, signal);
    } else {
      return await generateWithOpenAI(file, settings, signal);
    }
  } catch (error: unknown) {
    if (
      error instanceof RateLimitError ||
      (error instanceof DOMException && error.name === 'AbortError') ||
      (error as Error)?.name === 'AbortError'
    ) {
      throw error;
    }
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
    if (error instanceof RateLimitError) {
      throw error;
    }
    console.error("Connection Test Error:", error);
    const err = error as Error;
    throw new Error(err.message || "Connection Test Failed");
  }
};
