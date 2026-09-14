import { afterEach, describe, expect, it, vi } from 'vitest';
import { sleepWithSignal, smartFetch } from '../networkUtils';
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });
describe('abort-safe network utilities', () => {
  it('rejects already-aborted waits', async () => {
    await expect(sleepWithSignal(100, AbortSignal.abort())).rejects.toHaveProperty('name', 'AbortError');
  });
  it('cancels pending timers', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const waiting = sleepWithSignal(10000, controller.signal);
    const assertion = expect(waiting).rejects.toHaveProperty('name', 'AbortError');
    controller.abort();
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });
  it('does not retry aborted network requests', async () => {
    const fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetch);
    await expect(smartFetch('https://example.com/api', { signal: AbortSignal.abort() })).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it.each([new Headers({ Authorization: 'Bearer test' }), [['Authorization', 'Bearer test']]])('preserves headers when an explicitly allowed proxy is used', async headers => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const response = new Response('{}');
    vi.stubEnv('VITE_API_PROXY_ORIGINS', 'https://example.com');
    const fetch = vi.fn().mockResolvedValueOnce(response);
    vi.stubGlobal('fetch', fetch);
    expect(await smartFetch('https://example.com/v1/models?q=1', { headers: headers as HeadersInit })).toBe(response);
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('/api/proxy/v1/models?q=1');
    expect(options.headers.get('Authorization')).toBe('Bearer test');
    expect(options.headers.get('X-Target-Url')).toBe('https://example.com');
  });
  it('does not retry HTTP errors such as 429', async () => {
    const response = new Response('', { status: 429 });
    const fetch = vi.fn().mockResolvedValue(response);
    vi.stubGlobal('fetch', fetch);
    expect(await smartFetch('https://example.com', {})).toBe(response);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
