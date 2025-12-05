import { useState, useRef, useEffect, useCallback } from 'react';
import { Project, AppSettings } from '../types';
import { generateCaption } from '../services/geminiService';

export const useTagProcessor = (
    projects: Project[],
    settings: AppSettings,
    updateImageStatus: (projectId: string, imageId: string, status: any, error?: string, caption?: string) => void
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

    const handleTagSingle = useCallback(async (projId: string, imgId: string) => {
        const currentProject = projectsRef.current.find(p => p.id === projId);
        const img = currentProject?.images.find(i => i.id === imgId);
        if (!currentProject || !img) return;

        updateImageStatus(projId, imgId, 'loading');
        try {
            let caption = await generateCaption(img.file, settings);

            // Apply filtering
            if (settings.blockedWords && settings.blockedWords.length > 0) {
                caption = filterCaption(caption, settings.blockedWords);
            }

            updateImageStatus(projId, imgId, 'success', undefined, caption);
        } catch (error: any) {
            updateImageStatus(projId, imgId, 'error', error.message);
        }
    }, [settings, updateImageStatus]);

    const handleBatchTag = useCallback((targetProjectId: string | 'all', onStartSettingsError: () => void) => {
        if (!settings.apiKey) {
            onStartSettingsError();
            return;
        }

        shouldStopRef.current = false;
        setIsProcessing(true);

        // Calculate Queue
        const queue: { projId: string, imgId: string }[] = [];
        const targetProjects = targetProjectId === 'all'
            ? projectsRef.current
            : projectsRef.current.filter(p => p.id === targetProjectId);

        targetProjects.forEach(p => {
            p.images.forEach(img => {
                if (img.status === 'idle' || img.status === 'error') {
                    queue.push({ projId: p.id, imgId: img.id });
                }
            });
        });

        if (queue.length === 0) {
            setIsProcessing(false);
            return;
        }

        const concurrency = Math.max(1, Math.min(10, settings.concurrency || 3));
        let active = 0;
        let idx = 0;

        const processNext = async () => {
            if (shouldStopRef.current || idx >= queue.length) return;
            const task = queue[idx++];
            active++;
            try { await handleTagSingle(task.projId, task.imgId); }
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
            }
        }, 500);
    }, [settings, handleTagSingle]);

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