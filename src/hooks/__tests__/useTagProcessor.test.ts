import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTagProcessor } from '../useTagProcessor';
import { AppSettings, Project, TagImage } from '../../types';
import * as geminiService from '../../services/geminiService';

// Mock the geminiService
vi.mock('../../services/geminiService', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../services/geminiService')>();
    return {
        ...actual,
        generateCaption: vi.fn(),
    };
});

const mockGenerateCaption = geminiService.generateCaption as import('vitest').Mock;

describe('useTagProcessor', () => {
    const mockUpdateImageStatus = vi.fn();
    const mockOnShowToast = vi.fn();

    const mockSettings: AppSettings = {
        language: 'en',
        theme: 'light',
        viewMode: 'grid',
        protocol: 'google',
        providerName: 'Google',
        apiKey: 'test-api-key',
        baseUrl: '',
        model: 'gemini-1.5-flash',
        activePrompt: 'test prompt',
        concurrency: 2,
        customTemplates: [],
        gridColumns: 4,
        blockedWords: ['ugly', 'bad'],
        replacementRules: [{ pattern: 'girl', replace: '1girl' }],
    };

    const mockImage: TagImage = {
        id: 'img1',
        file: new File([''], 'test.png', { type: 'image/png' }),
        previewUrl: 'blob:test',
        caption: '',
        status: 'idle',
    };

    const mockProject: Project = {
        id: 'proj1',
        name: 'Test Project',
        images: [mockImage],
        status: 'idle',
        triggerWord: 'test_trigger',
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should process a single image correctly and apply filters/rules/triggers', async () => {
        // Setup mock response
        mockGenerateCaption.mockResolvedValue('A beautiful girl, red hair, ugly background  , bad lighting, ');

        const { result, unmount } = renderHook(() =>
            useTagProcessor([mockProject], mockSettings, mockUpdateImageStatus, mockOnShowToast)
        );

        await act(async () => {
            await result.current.processSingle('proj1', 'img1');
        });

        // Check loading status was set
        expect(mockUpdateImageStatus).toHaveBeenCalledWith('proj1', 'img1', 'loading');

        // Check API was called
        expect(geminiService.generateCaption).toHaveBeenCalledWith(mockImage.file, mockSettings);

        // Expected processing steps:
        // 1. Raw: "A beautiful girl, red hair, ugly background  , bad lighting, "
        // 2. Blocked 'ugly', 'bad': "A beautiful girl, red hair,  background  ,  lighting, "
        // 3. Replacements 'girl' -> '1girl': "A beautiful 1girl, red hair,  background  ,  lighting, "
        // 4. Trigger 'test_trigger': "test_trigger, A beautiful 1girl, red hair, background , lighting" -> cleanup commas/spaces

        // Check final status and caption
        expect(mockUpdateImageStatus).toHaveBeenLastCalledWith(
            'proj1',
            'img1',
            'success',
            undefined,
            'test_trigger, A beautiful 1girl, red hair, background , lighting'
        );

        unmount();
    });

    it('should handle API errors correctly', async () => {
        const errorMsg = 'API Rate Limit Exceeded';
        mockGenerateCaption.mockRejectedValue(new Error(errorMsg));

        const { result, unmount } = renderHook(() =>
            useTagProcessor([mockProject], mockSettings, mockUpdateImageStatus, mockOnShowToast)
        );

        await act(async () => {
            await result.current.processSingle('proj1', 'img1');
        });

        expect(mockUpdateImageStatus).toHaveBeenLastCalledWith('proj1', 'img1', 'error', errorMsg);
        expect(mockOnShowToast).toHaveBeenCalledWith('Failed: test.png', 'error');

        unmount();
    });

    it('should apply complex regex replacements correctly', async () => {
        mockGenerateCaption.mockResolvedValue('cat, dog, bird, CAT, Dog');

        // Override settings with regex rule
        const regexSettings = {
            ...mockSettings,
            replacementRules: [{ pattern: '/cat/gi', replace: 'feline' }],
            blockedWords: [],
            triggerWord: undefined
        };

        // Remove trigger word for this test
        const projNoTrigger = { ...mockProject, triggerWord: undefined };

        const { result, unmount } = renderHook(() =>
            useTagProcessor([projNoTrigger], regexSettings, mockUpdateImageStatus, mockOnShowToast)
        );

        await act(async () => {
            await result.current.processSingle('proj1', 'img1');
        });

        expect(mockUpdateImageStatus).toHaveBeenLastCalledWith(
            'proj1',
            'img1',
            'success',
            undefined,
            'feline, dog, bird, feline, Dog'
        );

        unmount();
    });

    it('should handle RateLimitError in processSingle with cooling notification', async () => {
        const rateLimitErr = new geminiService.RateLimitError('Quota exceeded', 12);
        mockGenerateCaption.mockRejectedValue(rateLimitErr);

        const { result, unmount } = renderHook(() =>
            useTagProcessor([mockProject], mockSettings, mockUpdateImageStatus, mockOnShowToast)
        );

        await act(async () => {
            await result.current.processSingle('proj1', 'img1');
        });

        expect(mockUpdateImageStatus).toHaveBeenCalledWith(
            'proj1',
            'img1',
            'error',
            'API 速率限制 (429): 请等待 12s 后重试'
        );
        expect(mockOnShowToast).toHaveBeenCalledWith(
            '⚠️ API 速率限制 (5 RPM): 请等待 12s 后重试',
            'error'
        );

        unmount();
    });

    it('should handle RateLimitError in startBatch by reverting to idle, entering cooldown, and succeeding on retry', async () => {
        const rateLimitErr = new geminiService.RateLimitError('Quota exceeded', 10);
        // First attempt fails with rate limit, second attempt succeeds
        mockGenerateCaption
            .mockRejectedValueOnce(rateLimitErr)
            .mockResolvedValueOnce('masterpiece, girl');

        const { result, unmount } = renderHook(() =>
            useTagProcessor([mockProject], mockSettings, mockUpdateImageStatus, mockOnShowToast)
        );

        await act(async () => {
            await result.current.startBatch('proj1', vi.fn());
        });

        // Verify status was reverted to 'idle' on rate limit
        expect(mockUpdateImageStatus).toHaveBeenCalledWith('proj1', 'img1', 'idle');
        // And finally succeeded
        expect(mockUpdateImageStatus).toHaveBeenLastCalledWith(
            'proj1',
            'img1',
            'success',
            undefined,
            'test_trigger, masterpiece, 1girl'
        );

        unmount();
    });

    it('should immediately stop and revert image status to idle when pause() is called', async () => {
        mockGenerateCaption.mockImplementation((_file, _settings, signal?: AbortSignal) => {
            return new Promise((_resolve, reject) => {
                if (signal) {
                    signal.addEventListener('abort', () => {
                        const err = new DOMException('Aborted by user', 'AbortError');
                        reject(err);
                    });
                }
            });
        });

        const { result, unmount } = renderHook(() =>
            useTagProcessor([mockProject], mockSettings, mockUpdateImageStatus, mockOnShowToast)
        );

        let batchPromise: Promise<void>;
        act(() => {
            batchPromise = result.current.startBatch('proj1', vi.fn());
        });

        expect(result.current.isProcessing).toBe(true);
        expect(mockUpdateImageStatus).toHaveBeenCalledWith('proj1', 'img1', 'loading');

        // Immediately pause
        act(() => {
            result.current.pause();
        });

        await act(async () => {
            await batchPromise!;
        });

        // Processing stopped
        expect(result.current.isProcessing).toBe(false);
        // Image status reverted to 'idle'
        expect(mockUpdateImageStatus).toHaveBeenLastCalledWith('proj1', 'img1', 'idle');
        expect(mockOnShowToast).toHaveBeenCalledWith('Batch processing paused', 'info');

        unmount();
    });

    it('should process image even if it was previously stuck in loading state when explicitly selected', async () => {
        mockGenerateCaption.mockResolvedValue('a cat, sitting');

        const stuckImage: TagImage = {
            id: 'stuck1',
            file: new File([''], 'stuck.png', { type: 'image/png' }),
            previewUrl: 'blob:stuck',
            caption: '',
            status: 'loading', // Image stuck in loading
        };

        const stuckProj: Project = {
            id: 'proj_stuck',
            name: 'Stuck Project',
            images: [stuckImage],
            status: 'idle',
        };

        const localUpdateStatus = vi.fn((_pId, _iId, status) => {
            stuckImage.status = status;
        });

        const { result, unmount } = renderHook(() =>
            useTagProcessor([stuckProj], mockSettings, localUpdateStatus, mockOnShowToast)
        );

        // User explicitly selects the stuck image and clicks tag
        await act(async () => {
            await result.current.startBatch('proj_stuck', vi.fn(), new Set(['stuck1']));
        });

        // The image must be successfully processed and updated to success
        expect(localUpdateStatus).toHaveBeenCalledWith('proj_stuck', 'stuck1', 'loading');
        expect(localUpdateStatus).toHaveBeenLastCalledWith(
            'proj_stuck',
            'stuck1',
            'success',
            undefined,
            'a cat, sitting'
        );

        unmount();
    });

    it('should auto-heal orphaned loading images to idle when idle', async () => {
        const orphanImage: TagImage = {
            id: 'orphan1',
            file: new File([''], 'orphan.png', { type: 'image/png' }),
            previewUrl: 'blob:orphan',
            caption: '',
            status: 'loading',
        };

        const orphanProj: Project = {
            id: 'proj_orphan',
            name: 'Orphan Project',
            images: [orphanImage],
            status: 'idle',
        };

        const { unmount } = renderHook(() =>
            useTagProcessor([orphanProj], mockSettings, mockUpdateImageStatus, mockOnShowToast)
        );

        // Auto-healing effect should have fired
        expect(mockUpdateImageStatus).toHaveBeenCalledWith('proj_orphan', 'orphan1', 'idle');

        unmount();
    });

    it('should preserve multi-line Tag + NL format with blank line separation and apply trigger word', async () => {
        const tagNlCaption = `1girl, solo, medusa, monster girl, white hair, snake hair\n\nA delicate and ethereal character design of a pale Medusa girl sitting on a giant snake.`;
        mockGenerateCaption.mockResolvedValue(tagNlCaption);

        const projWithTrigger: Project = {
            id: 'proj_tag_nl',
            name: 'Tag NL Project',
            images: [mockImage],
            status: 'idle',
            triggerWord: 'medusa_style',
        };

        const { result, unmount } = renderHook(() =>
            useTagProcessor([projWithTrigger], { ...mockSettings, replacementRules: [] }, mockUpdateImageStatus, mockOnShowToast)
        );

        await act(async () => {
            await result.current.processSingle('proj_tag_nl', 'img1');
        });

        const expected = `medusa_style, 1girl, solo, medusa, monster girl, white hair, snake hair\n\nA delicate and ethereal character design of a pale Medusa girl sitting on a giant snake.`;

        expect(mockUpdateImageStatus).toHaveBeenLastCalledWith(
            'proj_tag_nl',
            'img1',
            'success',
            undefined,
            expected
        );

        unmount();
    });

    it('should successfully regenerate single image even after batch was paused and preserve success status', async () => {
        mockGenerateCaption.mockResolvedValue('regenerated caption, high quality, masterpiece');

        const taggedImage: TagImage = {
            ...mockImage,
            status: 'success',
            caption: 'old caption'
        };
        const taggedProj: Project = {
            ...mockProject,
            images: [taggedImage]
        };

        const { result, unmount } = renderHook(() =>
            useTagProcessor([taggedProj], { ...mockSettings, replacementRules: [], blockedWords: [] }, mockUpdateImageStatus, mockOnShowToast)
        );

        // Simulate user clicking pause on batch
        act(() => {
            result.current.pause();
        });

        // Now user clicks regenerate on this single tagged image
        await act(async () => {
            const ok = await result.current.processSingle('proj1', 'img1');
            expect(ok).toBe(true);
        });

        // Verify it was set to loading then success with new caption
        expect(mockUpdateImageStatus).toHaveBeenCalledWith('proj1', 'img1', 'loading');
        expect(mockUpdateImageStatus).toHaveBeenLastCalledWith(
            'proj1',
            'img1',
            'success',
            undefined,
            'test_trigger, regenerated caption, high quality, masterpiece'
        );

        unmount();
    });
});

