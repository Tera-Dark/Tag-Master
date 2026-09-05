// Smart network layer: automatic fallback to local Vite dynamic proxy when direct call fails due to CORS or network errors

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

export const smartFetch = async (url: string, options: RequestInit): Promise<Response> => {
  try {
    const res = await fetch(url, options);
    return res;
  } catch (err: unknown) {
    const error = err as Error;
    const isNetworkOrCorsError = error.name === 'TypeError' && error.message.includes('Failed to fetch');

    // If options.signal is already aborted (e.g. user pause or request timeout), do NOT retry
    if (options.signal?.aborted) {
      throw err;
    }

    const isDevelopment = typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    if (isNetworkOrCorsError && isDevelopment) {
      console.warn("Direct API call failed (CORS/Network). Falling back to local Vite proxy...", error.message);
      try {
        const targetUrl = new URL(url);
        const origin = targetUrl.origin;
        const pathname = targetUrl.pathname + targetUrl.search;

        const proxyUrl = `/api/proxy${pathname}`;
        const proxyHeaders = {
          ...(options.headers || {}),
          "X-Target-Url": origin
        } as Record<string, string>;

        return await fetch(proxyUrl, {
          ...options,
          headers: proxyHeaders
        });
      } catch (proxySetupError) {
        console.error("Vite proxy setup failed:", proxySetupError);
      }
    }
    throw err;
  }
};
