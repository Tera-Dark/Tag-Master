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
});
