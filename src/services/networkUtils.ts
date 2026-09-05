// Smart network layer: automatic fallback to local Vite dynamic proxy when direct call fails due to CORS or network errors
export const smartFetch = async (url: string, options: RequestInit): Promise<Response> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s quick timeout for direct connection detection
    const res = await fetch(url, {
      ...options,
      signal: options.signal || controller.signal
    });
    clearTimeout(timeoutId);
    return res;
  } catch (err: unknown) {
    const error = err as Error;
    const isNetworkOrCorsError = error.name === 'TypeError' && error.message.includes('Failed to fetch');
    const isTimeout = error.name === 'AbortError';

    const isDevelopment = typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    if ((isNetworkOrCorsError || isTimeout) && isDevelopment) {
      console.warn("Direct API call failed/timed out. Falling back to local Vite proxy...", error.message);
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
