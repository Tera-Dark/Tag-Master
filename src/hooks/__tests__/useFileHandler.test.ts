import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFileHandler } from '../useFileHandler';
import type React from 'react';
const event = (files: File[]) =>
  ({ target: { files, value: 'selected' } }) as unknown as React.ChangeEvent<HTMLInputElement>;
describe('import feedback and recovery', () => {
  it('reports skipped non-images and resets the input', async () => {
    const add = vi.fn(),
      notice = vi.fn();
    const { result } = renderHook(() => useFileHandler('all', add, notice));
    const e = event([new File(['text'], 'notes.txt', { type: 'text/plain' })]);
    await act(() => result.current.handleFileInputChange(e));
    expect(add).not.toHaveBeenCalled();
    expect(notice).toHaveBeenLastCalledWith(expect.stringContaining('未找到'), 'info');
    expect(e.target.value).toBe('');
  });
  it('shows failures without rejecting UI event handlers and allows retrying the same file', async () => {
    const add = vi.fn().mockRejectedValueOnce(new Error('denied')).mockResolvedValue(undefined),
      notice = vi.fn();
    const { result } = renderHook(() => useFileHandler('all', add, notice));
    const e = event([new File(['image'], 'one.png', { type: 'image/png' })]);
    await act(() => result.current.handleFileInputChange(e));
    expect(notice).toHaveBeenLastCalledWith(expect.stringContaining('导入中断'), 'error');
    expect(e.target.value).toBe('');
    await act(() => result.current.handleFileInputChange(e));
    expect(notice).toHaveBeenLastCalledWith(expect.stringContaining('已导入 1 张'), 'success');
  });
  it('prevents overlapping imports', async () => {
    let finish!: () => void;
    const add = vi.fn(
        () =>
          new Promise<void>((r) => {
            finish = r;
          })
      ),
      notice = vi.fn();
    const { result } = renderHook(() => useFileHandler('all', add, notice));
    const e = () => event([new File(['image'], 'one.png', { type: 'image/png' })]);
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.handleFileInputChange(e());
    });
    await act(() => result.current.handleFileInputChange(e()));
    expect(add).toHaveBeenCalledTimes(1);
    expect(notice).toHaveBeenLastCalledWith(expect.stringContaining('正在导入'), 'info');
    await act(async () => {
      finish();
      await pending;
    });
  });
});
