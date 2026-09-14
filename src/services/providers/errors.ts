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
      const parsed = Number(retryHeader);
      if (Number.isFinite(parsed) && parsed > 0) return Math.ceil(parsed);
      const date = Date.parse(retryHeader);
      if (Number.isFinite(date) && date > Date.now()) return Math.ceil((date - Date.now()) / 1000);
    }
  }

  // 3. Try parsing seconds from error message if text like "Please retry after 24s" or "wait 20s"
  const rawMsg = errorData?.error?.message || (typeof errorData === 'string' ? errorData : '');
  if (rawMsg) {
    const match =
      rawMsg.match(/retry\s+after\s+([\d.]+)\s*s/i) || rawMsg.match(/wait\s+([\d.]+)\s*s/i);
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

export function isRateLimitResponse(
  status: number,
  errorMsg: string,
  errorData?: ApiErrorData | null
): boolean {
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

export class ProviderError extends Error {
  constructor(
    message: string,
    public status?: number,
    public retryable = false
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}
