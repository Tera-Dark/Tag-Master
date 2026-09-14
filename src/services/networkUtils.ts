// Abort-aware timing and explicit, allowlisted transport. No public proxy or automatic paid-request replay.

export const sleepWithSignal = (ms: number, signal?: AbortSignal): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(new DOMException('Aborted by user', 'AbortError'));
    }
    const timer = setTimeout(() => {
      if (signal) signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted by user', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
};

/** Explicit allowlisted development proxy, never a speculative retry of a paid POST. */
export const smartFetch = async (url: string, options: RequestInit): Promise<Response> => {
  const allowed = String(import.meta.env.VITE_API_PROXY_ORIGINS || '').split(',');
  const target = new URL(url);
  if (import.meta.env.DEV && allowed.includes(target.origin)) {
    const headers = new Headers(options.headers);
    headers.set('X-Target-Url', target.origin);
    return fetch(`/api/proxy${target.pathname}${target.search}`, { ...options, headers });
  }
  return fetch(url, options);
};
