import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useProjectManager } from '../useProjectManager';
import { loadProjectsFromDB, syncProjectsIncrementally } from '../../services/storageService';
import { Project } from '../../types';
vi.mock('../../services/storageService', () => ({ loadProjectsFromDB: vi.fn(), syncProjectsIncrementally: vi.fn() }));
const projects = (): Project[] => [
  { id: 'a', name: 'A', status: 'idle', images: [{ id: 'img', file: new File(['a'], 'a.png'), caption: 'cat', status: 'success', previewUrl: '' }] },
  { id: 'b', name: 'B', status: 'idle', images: [] },
];
async function setup() {
  const hook = renderHook(() => useProjectManager());
  await waitFor(() => expect(hook.result.current.isLoaded).toBe(true));
  return hook;
}
beforeEach(() => {
  vi.mocked(loadProjectsFromDB).mockResolvedValue(projects());
  vi.mocked(syncProjectsIncrementally).mockResolvedValue(undefined);
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:test'), revokeObjectURL: vi.fn() }));
});
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); vi.unstubAllGlobals(); });
describe('project integrity', () => {
  it('does not delete a project when merged with itself', async () => {
    const { result } = await setup();
    act(() => result.current.mergeProjects('a', 'a'));
    expect(result.current.projects).toHaveLength(2);
    expect(result.current.projects[0].images).toHaveLength(1);
  });
  it('does not lose images when move destination is missing', async () => {
    const { result } = await setup();
    act(() => result.current.moveImages(new Set(['img']), 'missing'));
    expect(result.current.projects[0].images).toHaveLength(1);
  });
  it('does not remove source when merge destination is missing', async () => {
    const { result } = await setup();
    act(() => result.current.mergeProjects('a', 'missing'));
    expect(result.current.projects.map(p => p.id)).toEqual(['a', 'b']);
  });
  it('preserves empty projects and references when removing images', async () => {
    const { result } = await setup();
    const untouched = result.current.projects[1];
    act(() => result.current.removeImages(new Set(['img'])));
    expect(result.current.projects).toHaveLength(2);
    expect(result.current.projects[1]).toBe(untouched);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });
  it('moves without deleting source metadata', async () => {
    const { result } = await setup();
    act(() => result.current.moveImages(new Set(['img']), 'b'));
    expect(result.current.projects[0].images).toHaveLength(0);
    expect(result.current.projects[1].images).toHaveLength(1);
  });
  it('deduplicates added tags including duplicates in the input', async () => {
    const { result } = await setup();
    act(() => result.current.batchUpdateCaptions(new Set(['img']), 'addTags', { tags: ['Cat', 'dog', 'DOG', ''] }));
    expect(result.current.projects[0].images[0].caption).toBe('cat, dog');
  });
  it('blocks saving after load failure rather than overwriting the database', async () => {
    vi.mocked(loadProjectsFromDB).mockRejectedValueOnce(new Error('Denied'));
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useProjectManager());
    await waitFor(() => expect(result.current.loadError).toBe(true));
    expect(result.current.isLoaded).toBe(false);
    expect(syncProjectsIncrementally).not.toHaveBeenCalled();
    error.mockRestore();
  });
  it('serializes saves and never marks newer edits saved by an older write', async () => {
    const { result } = await setup();
    vi.useFakeTimers();
    let finish!: () => void;
    vi.mocked(syncProjectsIncrementally).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    act(() => result.current.renameProject('a', 'First'));
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    act(() => result.current.renameProject('a', 'Second'));
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(syncProjectsIncrementally).toHaveBeenCalledTimes(1);
    expect(result.current.saveStatus).toBe('saving');
    await act(async () => { finish(); });
    expect(syncProjectsIncrementally).toHaveBeenCalledTimes(2);
    expect(vi.mocked(syncProjectsIncrementally).mock.calls[1][0][0].name).toBe('Second');
    expect(result.current.saveStatus).toBe('saved');
  });
});
