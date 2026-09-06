import { useState, useRef, useEffect, useCallback } from 'react';
import { Project, AppSettings, TagImage } from '../types';
import { generateCaption, RateLimitError } from '../services/geminiService';
import { sleepWithSignal } from '../services/networkUtils';
import { appLogger } from '../services/loggerService';

export const useTagProcessor = (
    projects: Project[],
    settings: AppSettings,
    updateImageStatus: (projectId: string, imageId: string, status: TagImage['status'], error?: string, caption?: string) => void,
    onShowToast?: (message: string, type: 'success' | 'error' | 'info') => void
) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [coolingRemainingSec, setCoolingRemainingSec] = useState<number>(0);
    const shouldStopRef = useRef(false);
    const coolingUntilRef = useRef<number>(0);
    const lastRequestTimeRef = useRef<number>(0);
    const queueRef = useRef<{ projId: string; imgId: string }[]>([]);
    const activeAbortControllerRef = useRef<AbortController | null>(null);
    const activeSingleProcessingIdsRef = useRef<Set<string>>(new Set());

    // We use a ref to track current projects state without re-triggering the effect loop constantly
    const projectsRef = useRef(projects);
    const settingsRef = useRef(settings);

    useEffect(() => {
        projectsRef.current = projects;
    }, [projects]);

    useEffect(() => {
        settingsRef.current = settings;
    }, [settings]);

    // Auto-healing: If not batch processing, ensure no images remain stuck in 'loading'
    useEffect(() => {
        if (!isProcessing) {
            projectsRef.current.forEach(project => {
                project.images.forEach(img => {
                    if (img.status === 'loading' && !activeSingleProcessingIdsRef.current.has(img.id)) {
                        appLogger.warn(`检测到未决加载状态图片「${img.file.name}」，已自动恢复为待处理(idle)状态`);
                        updateImageStatus(project.id, img.id, 'idle');
                    }
                });
            });
        }
    }, [isProcessing, updateImageStatus]);

    // Cleanup abort controller on unmount
    useEffect(() => {
        return () => {
            shouldStopRef.current = true;
            if (activeAbortControllerRef.current) {
                activeAbortControllerRef.current.abort();
                activeAbortControllerRef.current = null;
            }
        };
    }, []);

    // Cooldown countdown timer tick
    useEffect(() => {
        if (coolingRemainingSec <= 0) return;
        const interval = setInterval(() => {
            const now = Date.now();
            const remaining = Math.max(0, Math.ceil((coolingUntilRef.current - now) / 1000));
            setCoolingRemainingSec(remaining);
            if (remaining <= 0) {
                coolingUntilRef.current = 0;
                clearInterval(interval);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [coolingRemainingSec]);

    const filterCaption = (text: string, blocked: string[]) => {
        if (!blocked || blocked.length === 0) return text;
        let filtered = text;
        blocked.forEach(word => {
            if (!word.trim()) return;
            // Case insensitive replacement
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            filtered = filtered.replace(regex, '');
        });
        // Clean up double commas and excess horizontal spaces without collapsing newlines
        return filtered
            .replace(/,[^\S\r\n]*,/g, ',')
            .replace(/[^\S\r\n]{2,}/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim()
            .replace(/^,\s*/, '')
            .replace(/\s*,$/, '');
    };

    const getTargetInterval = (currSettings: AppSettings): number => {
        if (currSettings.rateLimitPreset === 'google_5rpm') return 12;
        if (currSettings.rateLimitPreset === 'google_15rpm') return 4.5;
        if (currSettings.rateLimitPreset === 'custom') return Math.max(0, currSettings.requestIntervalSec || 0);
        return 0;
    };

    // Internal caption generation & formatting (throws RateLimitError to be caught by worker or single handler)
    const processImageCaption = useCallback(async (
        projId: string,
        imgId: string,
        currentSettings: AppSettings,
        signal?: AbortSignal
    ): Promise<string> => {
        const currentProject = projectsRef.current.find(p => p.id === projId);
        const img = currentProject?.images.find(i => i.id === imgId);
        if (!currentProject || !img) {
            throw new Error('Image or project not found');
        }

        updateImageStatus(projId, imgId, 'loading');
        appLogger.info(`[请求中] 正在为「${img.file.name}」生成打标描述...`);

        let caption = '';
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            if (signal?.aborted) {
                const abortErr = new Error('Processing aborted');
                abortErr.name = 'AbortError';
                throw abortErr;
            }

            try {
                caption = signal
                    ? await generateCaption(img.file, currentSettings, signal)
                    : await generateCaption(img.file, currentSettings);
                break; // Success
            } catch (error: unknown) {
                if (signal?.aborted) {
                    const abortErr = new Error('Processing aborted');
                    abortErr.name = 'AbortError';
                    throw abortErr;
                }

                if (error instanceof RateLimitError) {
                    // Propagate immediately so rate limit cooldown and auto-retry handles it
                    throw error;
                }

                attempts++;
                const err = error as Error;
                const errMsg = err.message || String(error);
                const isFatal =
                    errMsg.includes('401') ||
                    errMsg.includes('unauthorized') ||
                    errMsg.includes('403') ||
                    errMsg.includes('404') ||
                    errMsg.includes('key') ||
                    errMsg.includes('Key') ||
                    errMsg.includes('CORS') ||
                    errMsg.includes('跨域') ||
                    errMsg.includes('Failed to fetch') ||
                    errMsg.includes('NetworkError') ||
                    errMsg.includes('SAFETY') ||
                    errMsg.includes('安全') ||
                    errMsg.includes('审查') ||
                    errMsg.includes('RECITATION') ||
                    errMsg.includes('Max Tokens') ||
                    errMsg.includes('超时') ||
                    errMsg.includes('Timeout');

                if (attempts < maxAttempts && !isFatal && !signal?.aborted) {
                    const delay = attempts * 2500;
                    appLogger.warn(`[重试等待] 「${img.file.name}」将在 ${delay / 1000} 秒后进行第 ${attempts + 1} 次重试...`, errMsg);
                    onShowToast?.(`Retrying ${img.file.name} in ${delay / 1000}s... (${attempts}/${maxAttempts})`, 'info');
                    const isTestEnv = typeof globalThis !== 'undefined' &&
                        'process' in globalThis &&
                        (globalThis as unknown as { process: { env: { NODE_ENV: string } } }).process?.env?.NODE_ENV === 'test';
                    if (isTestEnv) {
                        await Promise.resolve();
                    } else {
                        await sleepWithSignal(delay, signal);
                    }
                } else {
                    appLogger.error(`[打标失败] 「${img.file.name}」: ${errMsg}`, isFatal ? '检测到不可恢复错误（内容审查拦截/请求超时/鉴权/网络），已快速停止重试' : `已连续重试 ${attempts} 次失败`);
                    throw error;
                }
            }
        }

        // Apply filtering (legacy blocked words)
        if (currentSettings.blockedWords && currentSettings.blockedWords.length > 0) {
            caption = filterCaption(caption, currentSettings.blockedWords);
        }

        // Apply Replacement Rules (Regex)
        if (currentSettings.replacementRules && currentSettings.replacementRules.length > 0) {
            currentSettings.replacementRules.forEach(rule => {
                if (rule.pattern) {
                    try {
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
            const regex = new RegExp(`\\b${trigger}\\b`, 'gi');
            caption = caption.replace(regex, '').replace(/,\s*,/g, ',').trim();
            caption = `${trigger}, ${caption}`;
        }

        // Cleanup comma mess and excess spaces without collapsing paragraph breaks
        caption = caption
            .replace(/,[^\S\r\n]*,/g, ',')
            .replace(/[^\S\r\n]{2,}/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim()
            .replace(/^,\s*/, '')
            .replace(/\s*,$/, '');
        return caption;
    }, [updateImageStatus, onShowToast]);

    const handleTagSingle = useCallback(async (projId: string, imgId: string): Promise<boolean> => {
        const currentProject = projectsRef.current.find(p => p.id === projId);
        const img = currentProject?.images.find(i => i.id === imgId);
        if (!currentProject || !img) return false;

        const currentSettings = settingsRef.current;
        if (!currentSettings.apiKey) {
            appLogger.error('打标失败: 请先在「服务商设置」中填写并配置 API Key');
            onShowToast?.('请先在「服务商设置」中填写并配置 API Key', 'error');
            return false;
        }

        const previousStatus = img.status;
        const previousCaption = img.caption;

        activeSingleProcessingIdsRef.current.add(imgId);
        appLogger.info(`开始单张打标: 「${img.file.name}」`);
        try {
            const caption = await processImageCaption(projId, imgId, currentSettings);
            updateImageStatus(projId, imgId, 'success', undefined, caption);
            appLogger.success(`「${img.file.name}」打标成功`, caption);
            onShowToast?.(`Tagged: ${img.file.name}`, 'success');
            return true;
        } catch (error: unknown) {
            if ((error as Error)?.name === 'AbortError') {
                appLogger.info(`「${img.file.name}」打标已取消`);
                updateImageStatus(projId, imgId, previousStatus, undefined, previousCaption);
                return false;
            }
            const err = error as Error;
            if (error instanceof RateLimitError) {
                appLogger.warn(`「${img.file.name}」触发 API 速率限制 (429): 请等待 ${error.retryAfterSec}s 后重试`, err.message);
                updateImageStatus(projId, imgId, 'error', `API 速率限制 (429): 请等待 ${error.retryAfterSec}s 后重试`);
                onShowToast?.(`⚠️ API 速率限制 (5 RPM): 请等待 ${error.retryAfterSec}s 后重试`, 'error');
            } else {
                appLogger.error(`「${img.file.name}」打标失败`, err.message);
                updateImageStatus(projId, imgId, 'error', err.message);
                onShowToast?.(`Failed: ${img.file.name}`, 'error');
            }
            return false;
        } finally {
            activeSingleProcessingIdsRef.current.delete(imgId);
        }
    }, [updateImageStatus, onShowToast, processImageCaption]);

    const handleBatchTag = useCallback(async (
        targetProjectId: string | 'all',
        onStartSettingsError: () => void,
        selectedIds?: Set<string>
    ) => {
        if (!settings.apiKey) {
            onStartSettingsError();
            return;
        }

        shouldStopRef.current = false;
        coolingUntilRef.current = 0;
        setCoolingRemainingSec(0);
        const abortController = new AbortController();
        activeAbortControllerRef.current = abortController;
        setIsProcessing(true);

        const countMsg = selectedIds && selectedIds.size > 0 ? ` (${selectedIds.size} selected)` : '';
        onShowToast?.(`Batch processing started${countMsg}`, 'info');

        // Calculate Queue
        const initialQueue: { projId: string, imgId: string }[] = [];
        const targetProjects = targetProjectId === 'all'
            ? projectsRef.current
            : projectsRef.current.filter(p => p.id === targetProjectId);

        const isTargetedSelection = !!(selectedIds && selectedIds.size > 0);
        targetProjects.forEach(p => {
            p.images.forEach(img => {
                const isSelected = isTargetedSelection ? selectedIds.has(img.id) : true;
                const shouldInclude = isTargetedSelection
                    ? isSelected
                    : (img.status === 'idle' || img.status === 'error' || img.status === 'loading');
                if (shouldInclude) {
                    initialQueue.push({ projId: p.id, imgId: img.id });
                }
            });
        });

        if (initialQueue.length === 0) {
            setIsProcessing(false);
            activeAbortControllerRef.current = null;
            onShowToast?.('No images to process', 'info');
            return;
        }

        queueRef.current = initialQueue;

        const isTestEnv = typeof globalThis !== 'undefined' &&
            'process' in globalThis &&
            (globalThis as unknown as { process: { env: { NODE_ENV: string } } }).process?.env?.NODE_ENV === 'test';

        // Respect rate limit presets for concurrency
        const effectiveConcurrency = settings.rateLimitPreset === 'google_5rpm'
            ? 1
            : (settings.rateLimitPreset === 'google_15rpm'
                ? 1
                : Math.max(1, Math.min(20, settings.concurrency || 3)));

        appLogger.info(`开始批量打标任务: 队列中待处理 ${initialQueue.length} 张图片，并发数 ${effectiveConcurrency}`);

        let consecutiveErrors = 0;

        const runWorker = async () => {
            while (!shouldStopRef.current && !abortController.signal.aborted) {
                // 1. If currently in cooldown, wait until cooldown expires or user pauses
                while (coolingUntilRef.current > Date.now()) {
                    if (shouldStopRef.current || abortController.signal.aborted) return;
                    const waitMs = Math.min(500, coolingUntilRef.current - Date.now());
                    if (!isTestEnv) {
                        try {
                            await sleepWithSignal(waitMs, abortController.signal);
                        } catch {
                            if (shouldStopRef.current || abortController.signal.aborted) return;
                        }
                    } else {
                        await Promise.resolve();
                        coolingUntilRef.current = 0;
                        break;
                    }
                }

                if (shouldStopRef.current || abortController.signal.aborted) break;

                // 2. Pop next task
                const task = queueRef.current.shift();
                if (!task) {
                    break; // No more tasks in queue
                }

                // 3. Active rate-limit pacing (safe interval between requests)
                const targetInterval = getTargetInterval(settingsRef.current);
                if (targetInterval > 0 && lastRequestTimeRef.current > 0) {
                    const elapsed = (Date.now() - lastRequestTimeRef.current) / 1000;
                    if (elapsed < targetInterval) {
                        const waitSec = targetInterval - elapsed;
                        if (!isTestEnv) {
                            try {
                                await sleepWithSignal(waitSec * 1000, abortController.signal);
                            } catch {
                                queueRef.current.unshift(task);
                                break;
                            }
                        }
                    }
                }

                if (shouldStopRef.current || abortController.signal.aborted) {
                    queueRef.current.unshift(task);
                    break;
                }

                // Offline protection
                if (typeof navigator !== 'undefined' && !navigator.onLine) {
                    queueRef.current.unshift(task);
                    shouldStopRef.current = true;
                    appLogger.warn('网络离线，打标任务已挂起');
                    onShowToast?.('Network offline. Processing suspended.', 'error');
                    break;
                }

                lastRequestTimeRef.current = Date.now();
                const currentProject = projectsRef.current.find(p => p.id === task.projId);
                const img = currentProject?.images.find(i => i.id === task.imgId);

                try {
                    const caption = await processImageCaption(task.projId, task.imgId, settingsRef.current, abortController.signal);
                    updateImageStatus(task.projId, task.imgId, 'success', undefined, caption);
                    if (img) {
                        appLogger.success(`「${img.file.name}」打标成功`, caption);
                        onShowToast?.(`Tagged: ${img.file.name}`, 'success');
                    }
                    consecutiveErrors = 0;
                } catch (error: unknown) {
                    const isUserAborted = shouldStopRef.current || abortController.signal.aborted;
                    if (isUserAborted) {
                        // Immediately restore to idle and back to queue
                        queueRef.current.unshift(task);
                        updateImageStatus(task.projId, task.imgId, 'idle');
                        break;
                    }

                    if (error instanceof RateLimitError) {
                        // Rate limit triggered!
                        // 1. Put task back to the front of queue to process again once quota resets
                        queueRef.current.unshift(task);
                        // 2. Keep status as 'idle' so it doesn't display as red failed error
                        updateImageStatus(task.projId, task.imgId, 'idle');

                        // 3. Set global cooldown (with +2s safety buffer)
                        const waitSec = Math.max(5, error.retryAfterSec + 2);
                        const targetUntil = Date.now() + waitSec * 1000;
                        if (targetUntil > coolingUntilRef.current) {
                            coolingUntilRef.current = targetUntil;
                            setCoolingRemainingSec(waitSec);
                            appLogger.warn(`[速率限流] 触发 API 限制 (5次/分或 Token 配额耗尽)，排队冷却 ${waitSec}s...`, `图片: ${img?.file.name || task.imgId}，将在冷却后自动继续请求`);
                            onShowToast?.(`⚠️ 触发 API 限制 (5次/分或Token配额耗尽)，正在自动排队轮询... ${waitSec}s 后自动恢复`, 'info');
                        }
                        // Note: do NOT increment consecutiveErrors!
                    } else {
                        // Standard error
                        const err = error as Error;
                        updateImageStatus(task.projId, task.imgId, 'error', err.message);
                        if (img) {
                            appLogger.error(`「${img.file.name}」打标失败: ${err.message}`);
                            onShowToast?.(`Failed: ${img.file.name}`, 'error');
                        }
                        consecutiveErrors++;
                        if (consecutiveErrors >= 5) {
                            shouldStopRef.current = true;
                            abortController.abort();
                            appLogger.error('连续 5 次请求出错，批量任务已自动熔断暂停。请检查 API 配置或网络，点击「运行日志」查看详细错误。');
                            onShowToast?.('连续多次请求出错，已自动暂停。请查看「运行日志」排查原因。', 'error');
                            break;
                        }
                    }
                }
            }
        };

        const workers = Array.from({ length: effectiveConcurrency }, () => runWorker());
        await Promise.all(workers);

        setIsProcessing(false);
        setCoolingRemainingSec(0);
        coolingUntilRef.current = 0;
        if (activeAbortControllerRef.current === abortController) {
            activeAbortControllerRef.current = null;
        }

        if (!shouldStopRef.current && !abortController.signal.aborted) {
            appLogger.success('🎉 批量打标任务已全部完成！');
            onShowToast?.('Batch processing complete', 'success');
        } else {
            appLogger.info('批量打标任务已暂停/停止');
            onShowToast?.('Batch processing paused', 'info');
        }
    }, [settings, updateImageStatus, onShowToast, processImageCaption]);

    const pause = useCallback(() => {
        appLogger.info('用户手动暂停了打标任务');
        shouldStopRef.current = true;
        coolingUntilRef.current = 0;
        setCoolingRemainingSec(0);
        if (activeAbortControllerRef.current) {
            activeAbortControllerRef.current.abort();
            activeAbortControllerRef.current = null;
        }
        // Immediately restore any image stuck in 'loading' back to 'idle'
        projectsRef.current.forEach(p => {
            p.images.forEach(img => {
                if (img.status === 'loading' && !activeSingleProcessingIdsRef.current.has(img.id)) {
                    updateImageStatus(p.id, img.id, 'idle');
                }
            });
        });
    }, [updateImageStatus]);

    const skipCooldown = useCallback(() => {
        coolingUntilRef.current = 0;
        setCoolingRemainingSec(0);
    }, []);

    return {
        isProcessing,
        isCooling: coolingRemainingSec > 0,
        coolingCountdown: coolingRemainingSec,
        skipCooldown,
        startBatch: handleBatchTag,
        pause,
        processSingle: handleTagSingle
    };
};