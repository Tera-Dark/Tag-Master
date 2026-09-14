import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useSearch } from '../useSearch';
import { Project } from '../../types';
const data: Project[] = [{ id: 'p', name: 'P', status: 'idle', images: [
  { id: 'one', file: new File([''], 'CAT.png'), caption: 'short', status: 'error', previewUrl: '' },
  { id: 'two', file: new File([''], 'dog.png'), caption: 'long caption', status: 'success', previewUrl: '' },
] }];
describe('normalized search', () => {
  it.each([['len<6', 'one'], ['len < 6', 'one'], ['len > 10', 'two'], [' CAT ', 'one'], ['status: error', 'one']])('supports %s', (query, id) => {
    const { result } = renderHook(() => useSearch(data, 'all'));
    act(() => result.current.setSearchQuery(query));
    expect(result.current.filteredImages.map(v => v.img.id)).toEqual([id]);
  });
});
