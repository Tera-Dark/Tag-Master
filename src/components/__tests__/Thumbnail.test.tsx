import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Thumbnail } from '../Thumbnail';
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe('thumbnail lifecycle', () => {
  it('releases fallback URLs on unmount', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('Unsupported')));
    URL.createObjectURL = vi.fn(() => 'blob:fallback');
    URL.revokeObjectURL = vi.fn();
    const { unmount } = render(<Thumbnail file={new File(['a'], 'a.png')} />);
    await waitFor(() => expect(screen.getByRole('img').getAttribute('src')).toBe('blob:fallback'));
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fallback');
  });
  it('never revokes a caller-owned fallback URL', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('Unsupported')));
    URL.revokeObjectURL = vi.fn();
    const { unmount } = render(<Thumbnail file={new File(['a'], 'a.png')} url='blob:caller' />);
    await waitFor(() => expect(screen.getByRole('img').getAttribute('src')).toBe('blob:caller'));
    unmount();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });
  it('closes a decoded bitmap even when canvas context fails', async () => {
    const close = vi.fn();
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({ width: 300, height: 200, close })
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    render(<Thumbnail file={new File(['a'], 'a.png')} url='blob:caller' />);
    await waitFor(() => expect(close).toHaveBeenCalledOnce());
  });
  it('does not create a leaked fallback after unmount', async () => {
    let reject!: (reason: Error) => void;
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(
        () =>
          new Promise((_, fail) => {
            reject = fail;
          })
      )
    );
    URL.createObjectURL = vi.fn();
    const { unmount } = render(<Thumbnail file={new File(['a'], 'a.png')} />);
    unmount();
    reject(new Error('Unsupported'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});
