import { useState, useRef, useEffect, useCallback } from 'react';
import { Project, AppSettings, TagImage } from '../types';
import { generateCaption } from '../services/geminiService';

export const useTagProcessor = (
    projects: Project[],
    settings: AppSettings,
    updateImageStatus: (projectId: string, imageId: string, status: TagImage['status'], error?: string, caption?: string) => void,
    onShowToast?: (message: string, type: 'success' | 'error' | 'info') => void
) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const shouldStopRef = useRef(false);
    // We use a ref to track current projects state without re-triggering the effect loop constantly,
    // but we need to ensure it's always fresh before the interval checks.
    const projectsRef = useRef(projects);

    useEffect(() => {
        projectsRef.current = projects;
    }, [projects]);

    const filterCaption = (text: string, blocked: string[]) => {
        if (!blocked || blocked.length === 0) return text;
        let filtered = text;
        blocked.forEach(word => {
            if (!word.trim()) return;
            // Case insensitive replacement
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            filtered = filtered.replace(regex, '');
        });
        // Clean up double commas/spaces
        return filtered.replace(/,\s*,/g, ',').replace(/\s\s+/g, ' ').trim().replace(/^,/, '').replace(/,$/, '');
    };

    const handleTagSingle = useCallback(async (projId: string, imgId: string): Promise<boolean> => {
        const currentProject = projectsRef.current.find(p => p.id === projId);
        const img = currentProject?.images.find(i => i.id === imgId);
        if (!currentProject || !img) return false;

        updateImageStatus(projId, imgId, 'loading');
        try {
            let caption = '';
            let attempts = 0;
            const maxAttempts = 3;

            while (attempts < maxAttempts) {
                try {
                    caption = await generateCaption(img.file, settings);
                    break; // Success
                } catch (error: unknown) {
                    attempts++;
                    const err = error as Error;
                    const errMsg = err.message || String(error);
                    const isAuthError = errMsg.includes('401') || errMsg.includes('unauthorized') || errMsg.includes('403') || errMsg.includes('key') || errMsg.includes('Key');

                    if (attempts < maxAttempts && !isAuthError) {
                        const delay = attempts * 2500;
                        onShowToast?.(`Retrying ${img.file.name} in ${delay / 1000}s... (${attempts}/${maxAttempts})`, 'info');
                        const isTestEnv = typeof globalThis !== 'undefined' &&
                            'process' in globalThis &&
                            (globalThis as unknown as { process: { env: { NODE_ENV: string } } }).process?.env?.NODE_ENV === 'test';
                        if (isTestEnv) {
                            // Skip timeout in unit tests
                            await Promise.resolve();
                        } else {
                            await new Promise(resolve => setTimeout(resolve, delay));
                        }
                    } else {
                        throw error;
                    }
                }
            }

            // Apply filtering (legacy blocked words)
            if (settings.blockedWords && settings.blockedWords.length > 0) {
                caption = filterCaption(caption, settings.blockedWords);
            }

            // Apply Replacement Rules (Regex)
            if (settings.replacementRules && settings.replacementRules.length > 0) {
                settings.replacementRules.forEach(rule => {
                    if (rule.pattern) {
                        try {
                            // Support regex flags if user wraps in /.../gi, otherwise default to global case-insensitive string match
                            let pattern = rule.pattern;
                            let flags = 'gi';
                            if (pattern.startsWith('/') && pattern.lastIndexOf('/') > 0) {
                                const lastSlash = pattern.lastIndexOf('/');
                                flags = pattern.substring(lastSlash + 1);
                                pattern = pattern.substring(1, lastSlash);
                            }
                            const regex = new RegExp(pattern, flags);
                            caption = caption.replace(regex, rule.replace);
                        } catch (e) {
                            console.warn("Invalid regex rule:", rule.pattern, e);
                        }
                    }
                });
            }

            // Apply Trigger Word
            if (currentProject.triggerWord) {
                const trigger = currentProject.triggerWord.trim();
                // Remove if already exists to avoid duplication
                const regex = new RegExp(`\\b${trigger}\\b`, 'gi');
                caption = caption.replace(regex, '').replace(/,\s*,/g, ',').trim();
                // Prepend
                caption = `${trigger}, ${caption}`;
            }

            // Cleanup comma mess
            caption = caption.replace(/,\s*,/g, ',').replace(/\s\s+/g, ' ').trim().replace(/^,/, '').replace(/,$/, '');

            updateImageStatus(projId, imgId, 'success', undefined, caption);
            onShowToast?.(`Tagged: ${img.file.name}`, 'success');
            return true;
        } catch (error: unknown) {
            const err = error as Error;
            updateImageStatus(projId, imgId, 'error', err.message);
            onShowToast?.(`Failed: ${img.file.name}`, 'error');
            return false;
        }
    }, [settings, updateImageStatus, onShowToast]);

    const handleBatchTag = useCallback((targetProjectId: string | 'all', onStartSettingsError: () => void, selectedIds?: Set<string>) => {
        if (!settings.apiKey) {
            onStartSettingsError();
            return;
        }

        shouldStopRef.current = false;
        setIsProcessing(true);
        const countMsg = selectedIds && selectedIds.size > 0 ? ` (${selectedIds.size} selected)` : '';
        onShowToast?.(`Batch processing started${countMsg}`, 'info');

        // Calculate Queue
        const queue: { projId: string, imgId: string }[] = [];
        // If selectedIds provided, we scan all projects but only add if image ID is in selection
        // Optimization: In 'all' mode or specific project mode, we still scan projects structure
        const targetProjects = targetProjectId === 'all'
            ? projectsRef.current
            : projectsRef.current.filter(p => p.id === targetProjectId);

        targetProjects.forEach(p => {
            p.images.forEach(img => {
                // If selective mode, check existence. If not, process all idle/error
                const isSelected = selectedIds && selectedIds.size > 0 ? selectedIds.has(img.id) : true;

                if (isSelected && (img.status === 'idle' || img.status === 'error')) {
                    queue.push({ projId: p.id, imgId: img.id });
                }
            });
        });

        if (queue.length === 0) {
            setIsProcessing(false);
            onShowToast?.('No images to process', 'info');
            return;
        }

        const concurrency = Math.max(1, Math.min(20, settings.concurrency || 3));
        let active = 0;
        let idx = 0;

        let consecutiveErrors = 0;
        const processNext = async () => {
            if (shouldStopRef.current || idx >= queue.length) return;

            // Offline protection
            if (!navigator.onLine) {
                shouldStopRef.current = true;
                onShowToast?.('Network offline. Processing suspended.', 'error');
                return;
            }

            const task = queue[idx++];
            active++;
            try { 
                const success = await handleTagSingle(task.projId, task.imgId); 
                if (success) {
                    consecutiveErrors = 0;
                } else {
                    consecutiveErrors++;
                    if (consecutiveErrors >= 5) {
                        shouldStopRef.current = true;
                        onShowToast?.('Multiple consecutive errors. Batch paused. Please check API Config.', 'error');
                    }
                }
            }
            finally {
                active--;
                if (!shouldStopRef.current) processNext();
            }
        };

        // Start initial pool
        const initialBatch = [];
        for (let i = 0; i < concurrency; i++) initialBatch.push(processNext());

        // Monitor completion
        const interval = setInterval(() => {
            if ((idx >= queue.length && active === 0) || shouldStopRef.current) {
                clearInterval(interval);
                setIsProcessing(false);
                if (!shouldStopRef.current) {
                    onShowToast?.('Batch processing complete', 'success');
                } else {
                    onShowToast?.('Batch processing paused', 'info');
                }
            }
        }, 500);
    }, [settings, handleTagSingle, onShowToast]);

    const pause = useCallback(() => {
        shouldStopRef.current = true;
    }, []);

    return {
        isProcessing,
        startBatch: handleBatchTag,
        pause,
        processSingle: handleTagSingle
    };
};