import { useState, useEffect, useRef, useCallback } from 'react';
import { Project, TagImage, BatchCaptionParams } from '../types';
import { loadProjectsFromDB, syncProjectsIncrementally } from '../services/storageService';
import { createTagImages } from '../services/fileHelpers';

const revokeUrl = (url: string) => {
    if (url && url.startsWith('blob:')) {
        try {
            URL.revokeObjectURL(url);
        } catch (e) {
            console.warn("Failed to revoke object URL:", url, e);
        }
    }
};

export const useProjectManager = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loadError, setLoadError] = useState(false);
    const [saveRevision, setSaveRevision] = useState(0);
    const [isLoaded, setIsLoaded] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
    const saveTimeoutRef = useRef<number | undefined>(undefined);
    const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
    const saveVersionRef = useRef(0);
    const prevProjectsRef = useRef<Project[]>([]);

    // Load from DB on mount
    useEffect(() => {
        let cancelled = false;
        loadProjectsFromDB().then(savedProjects => {
            if (cancelled) return;
            if (savedProjects?.length) {
                const loaded = savedProjects.map(p => ({
                    ...p,
                    images: p.images.map(img => ({
                        ...img,
                        previewUrl: img.file ? URL.createObjectURL(img.file) : '',
                        status: img.status === 'loading' ? 'idle' : (img.status || 'idle')
                    }))
                }));
                setProjects(loaded);
                prevProjectsRef.current = loaded;
            }
            setIsLoaded(true);
        }).catch(error => {
            if (cancelled) return;
            console.error('Database load failed; automatic saving disabled to protect existing data.', error);
            setSaveStatus('unsaved');
            setLoadError(true);
        });
        return () => { cancelled = true; };
    }, []);

    // Auto-save to DB (Incremental Sync)
    useEffect(() => {
        if (!isLoaded) return;
        const version = ++saveVersionRef.current;
        setSaveStatus('saving');
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = window.setTimeout(() => {
          saveQueueRef.current = saveQueueRef.current.then(async () => {
            try {
                const current = projects;
                const prev = prevProjectsRef.current;

                // 1. Find deleted projects
                const previousById = new Map(prev.map(p => [p.id, p]));
                const currentIds = new Set(current.map(p => p.id));
                const deletedIds = prev.filter(p => !currentIds.has(p.id)).map(p => p.id);
                const updatedProjects = current.filter(p => previousById.get(p.id) !== p);

                if (updatedProjects.length > 0 || deletedIds.length > 0) {
                    await syncProjectsIncrementally(updatedProjects, deletedIds);
                }

                prevProjectsRef.current = current;
                if (version === saveVersionRef.current) setSaveStatus('saved');
            } catch (e) {
                console.error("Incremental save failed:", e);
                if (version === saveVersionRef.current) setSaveStatus('unsaved');
            }
          });
        }, 1000);
        return () => clearTimeout(saveTimeoutRef.current);
    }, [projects, isLoaded, saveRevision]);

    useEffect(() => {
        if (saveStatus === 'saved') return;
        const warnBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', warnBeforeUnload);
        return () => window.removeEventListener('beforeunload', warnBeforeUnload);
    }, [saveStatus]);

    // --- Actions ---

    const addFilesToProject = useCallback(async (files: File[], target: { mode: 'append', projectId: string } | { mode: 'create', name?: string }) => {
        const CHUNK_SIZE = 50;
        const newProjectId = crypto.randomUUID();
        const newProjectName = target.mode === 'create' ? (target.name || `Import ${new Date().toLocaleTimeString()}`) : '';

        // Process in chunks to avoid blocking UI
        for (let i = 0; i < files.length; i += CHUNK_SIZE) {
            const chunk = files.slice(i, i + CHUNK_SIZE);
            const newImages = createTagImages(chunk);

            setProjects(prev => {
                const next = [...prev];
                if (target.mode === 'append') {
                    const idx = next.findIndex(p => p.id === target.projectId);
                    if (idx > -1) next[idx] = { ...next[idx], images: [...next[idx].images, ...newImages] };
                } else {
                    const existingNewIdx = next.findIndex(p => p.id === newProjectId);
                    if (existingNewIdx > -1) {
                        next[existingNewIdx] = { ...next[existingNewIdx], images: [...next[existingNewIdx].images, ...newImages] };
                    } else {
                        next.push({ id: newProjectId, name: newProjectName, images: newImages, status: 'idle', isCollapsed: false });
                    }
                }
                return next;
            });
            await new Promise(resolve => requestAnimationFrame(resolve));
        }
    }, []);

    const createProject = useCallback((name?: string, triggerWord?: string) => {
        const newProjectId = crypto.randomUUID();
        const newProject: Project = {
            id: newProjectId,
            name: name?.trim() || `Project ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            triggerWord: triggerWord?.trim() || '',
            images: [],
            status: 'idle',
            isCollapsed: false
        };
        setProjects(prev => [...prev, newProject]);
        return newProjectId;
    }, []);

    const renameProject = useCallback((projectId: string, newName: string) => {
        const trimmed = newName.trim();
        if (!trimmed) return;
        setProjects(prev => prev.map(p => p.id === projectId ? { ...p, name: trimmed } : p));
    }, []);

    const deleteProject = useCallback((id: string) => {
        setProjects(prev => {
            const projectToDelete = prev.find(p => p.id === id);
            if (projectToDelete) {
                projectToDelete.images.forEach(img => revokeUrl(img.previewUrl));
            }
            return prev.filter(p => p.id !== id);
        });
    }, []);

    const removeImages = useCallback((imageIds: Set<string>) => {
        setProjects(prev => {
            prev.forEach(p => {
                p.images.forEach(img => {
                    if (imageIds.has(img.id)) {
                        revokeUrl(img.previewUrl);
                    }
                });
            });
            return prev.map(p => p.images.some(img => imageIds.has(img.id))
                ? { ...p, images: p.images.filter(img => !imageIds.has(img.id)) } : p);
        });
    }, []);

    const renameImage = useCallback((projectId: string, imageId: string, newName: string) => {
        setProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            return {
                ...p,
                images: p.images.map(img => {
                    if (img.id !== imageId) return img;
                    // Create a new File object with the new name (preserving other properties)
                    const newFile = new File([img.file], newName, { type: img.file.type, lastModified: img.file.lastModified });
                    return { ...img, file: newFile };
                })
            };
        }));
    }, []);

    const updateImageCaption = useCallback((projectId: string, imageId: string, caption: string) => {
        setProjects(prev => prev.map(p => p.id === projectId ? {
            ...p,
            images: p.images.map(i => i.id === imageId ? { ...i, caption } : i)
        } : p));
    }, []);

    const updateImageStatus = useCallback((projectId: string, imageId: string, status: TagImage['status'], errorMsg?: string, caption?: string) => {
        setProjects(prev => prev.map(p => p.id === projectId ? {
            ...p,
            images: p.images.map(i => i.id === imageId ? {
                ...i,
                status,
                errorMsg: errorMsg !== undefined ? errorMsg : i.errorMsg,
                caption: caption !== undefined ? caption : i.caption
            } : i)
        } : p));
    }, []);

    const batchUpdateCaptions = useCallback((
        targetIds: Set<string>,
        operation: 'replace' | 'prepend' | 'append' | 'addTags' | 'removeTags' | 'applyRules' | 'lowercase' | 'underscoreToSpace' | 'spaceToUnderscore' | 'sanitize',
        params: BatchCaptionParams
    ) => {
        setProjects(prev => prev.map(p => ({
            ...p,
            images: p.images.map(img => {
                if (!targetIds.has(img.id)) return img;
                let newCaption = img.caption;
                if (operation === 'replace' && params.find) {
                    newCaption = newCaption.replace(new RegExp(params.find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), params.replace || '');
                }
                else if (operation === 'prepend' && params.prefix) newCaption = params.prefix + newCaption;
                else if (operation === 'append' && params.suffix) newCaption = newCaption + params.suffix;
                else if (operation === 'addTags' && params.tags) {
                    const currentTags = newCaption.split(',').map(t => t.trim()).filter(Boolean);
                    const existingLower = new Set(currentTags.map(t => t.toLowerCase()));
                    const uniqueToAdd = params.tags.map(t => t.trim()).filter(t => {
                        if (!t || existingLower.has(t.toLowerCase())) return false;
                        existingLower.add(t.toLowerCase());
                        return true;
                    });
                    if (uniqueToAdd.length > 0) newCaption = [...currentTags, ...uniqueToAdd].join(', ');
                }
                else if (operation === 'removeTags' && params.tags) {
                    const tagsToRemove = new Set(params.tags.map((t: string) => t.trim().toLowerCase()).filter(Boolean));
                    newCaption = newCaption.split(',').map(t => t.trim()).filter(t => !tagsToRemove.has(t.toLowerCase())).join(', ');
                }
                else if (operation === 'applyRules' && params.rules) {
                    params.rules.forEach((rule) => {
                        if (!rule.pattern) return;
                        try {
                            let pattern = rule.pattern;
                            let flags = 'gi';
                            if (pattern.startsWith('/') && pattern.lastIndexOf('/') > 0) {
                                const lastSlash = pattern.lastIndexOf('/');
                                flags = pattern.substring(lastSlash + 1);
                                pattern = pattern.substring(1, lastSlash);
                            }
                            const regex = new RegExp(pattern, flags);
                            newCaption = newCaption.replace(regex, rule.replace || '');
                        } catch (e) {
                            // ignore invalid regex
                        }
                    });
                }
                else if (operation === 'lowercase') {
                    newCaption = newCaption.toLowerCase();
                }
                else if (operation === 'underscoreToSpace') {
                    newCaption = newCaption.replace(/_/g, ' ');
                }
                else if (operation === 'spaceToUnderscore') {
                    newCaption = newCaption.split(',')
                        .map(tag => tag.trim().replace(/\s+/g, '_'))
                        .filter(Boolean)
                        .join(', ');
                }
                else if (operation === 'sanitize') {
                    const tags = newCaption.split(',')
                        .map(t => t.trim())
                        .filter(Boolean);
                    const seen = new Set<string>();
                    const uniqueTags: string[] = [];
                    tags.forEach(t => {
                        const lower = t.toLowerCase();
                        if (!seen.has(lower)) {
                            seen.add(lower);
                            uniqueTags.push(t);
                        }
                    });
                    newCaption = uniqueTags.join(', ');
                }
                return { ...img, caption: newCaption };
            })
        })));
    }, []);

    const moveImages = useCallback((sourceImageIds: Set<string>, targetProjectId: string, newProjectName?: string) => {
        setProjects(prev => {
            let next = [...prev];
            let destId = targetProjectId;

            if (destId === 'new') {
                destId = crypto.randomUUID();
                next.push({
                    id: destId,
                    name: newProjectName || `Project ${new Date().toLocaleTimeString()}`,
                    images: [],
                    status: 'idle'
                });
            }

            if (!next.some(p => p.id === destId)) return prev;
            const movingImages: TagImage[] = [];
            // Extract images from all projects
            next = next.map(p => {
                if (p.id === destId) return p; // Don't remove from destination if we are moving within (edge case)
                const staying = p.images.filter(img => !sourceImageIds.has(img.id));
                const moving = p.images.filter(img => sourceImageIds.has(img.id));
                movingImages.push(...moving);
                return moving.length ? { ...p, images: staying } : p;
            }); // Preserve empty projects and their metadata.

            // Add to destination
            const destIdx = next.findIndex(p => p.id === destId);
            if (destIdx !== -1) {
                next[destIdx] = { ...next[destIdx], images: [...next[destIdx].images, ...movingImages] };
            }
            return next;
        });
    }, []);

    const mergeProjects = useCallback((sourceProjectId: string, targetProjectId: string, newProjectName?: string) => {
        setProjects(prev => {
            const next = [...prev];
            let destId = targetProjectId;
            if (destId === 'new') {
                destId = crypto.randomUUID();
                next.push({
                    id: destId,
                    name: newProjectName || `Merged Project`,
                    images: [],
                    status: 'idle'
                });
            }

            if (sourceProjectId === destId || !next.some(p => p.id === destId)) return prev;
            const sourceIdx = next.findIndex(p => p.id === sourceProjectId);
            if (sourceIdx === -1) return prev;

            const movingImages = [...next[sourceIdx].images];
            next.splice(sourceIdx, 1); // Remove source

            const destIdx = next.findIndex(p => p.id === destId);
            if (destIdx !== -1) {
                next[destIdx] = { ...next[destIdx], images: [...next[destIdx].images, ...movingImages] };
            }
            return next;
        });
    }, []);

    const retryErrors = useCallback(() => {
        setProjects(prev => prev.map(p => ({
            ...p,
            images: p.images.map(i => i.status === 'error' ? { ...i, status: 'idle', errorMsg: undefined } : i)
        })));
    }, []);

    const clearDone = useCallback(() => {
        setProjects(prev => {
            prev.forEach(p => {
                p.images.forEach(img => {
                    if (img.status === 'success') {
                        revokeUrl(img.previewUrl);
                    }
                });
            });
            return prev.map(p => p.images.some(i => i.status === 'success')
                ? { ...p, images: p.images.filter(i => i.status !== 'success') } : p);
        });
    }, []);

    const updateProjectTriggerWord = useCallback((projectId: string, triggerWord: string) => {
        setProjects(prev => prev.map(p => p.id === projectId ? { ...p, triggerWord } : p));
    }, []);

    return {
        projects,
        setProjects, // Exposed for advanced cases or ref updates
        isLoaded,
        loadError,
        saveStatus,
        retrySave: () => setSaveRevision(value => value + 1),
        addFilesToProject,
        createProject,
        renameProject,
        deleteProject,
        removeImages,
        renameImage,
        updateImageCaption,
        updateImageStatus,
        batchUpdateCaptions,
        moveImages,
        mergeProjects,
        retryErrors,
        clearDone,
        updateProjectTriggerWord
    };
};