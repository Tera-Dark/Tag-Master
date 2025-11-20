import { useState, useEffect, useRef, useCallback } from 'react';
import { Project, TagImage } from '../types';
import { saveProjectsToDB, loadProjectsFromDB } from '../services/storageService';
import { createTagImages } from '../services/fileHelpers';

export const useProjectManager = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
    const saveTimeoutRef = useRef<number | undefined>(undefined);

    // Load from DB on mount
    useEffect(() => {
        loadProjectsFromDB().then(savedProjects => {
            if (savedProjects?.length) {
                setProjects(savedProjects.map(p => ({
                    ...p,
                    images: p.images.map(img => ({
                        ...img,
                        previewUrl: img.file ? URL.createObjectURL(img.file) : '',
                        status: img.status || 'idle'
                    }))
                })));
            }
            setIsLoaded(true);
        }).catch(() => setIsLoaded(true));
    }, []);

    // Auto-save to DB
    useEffect(() => {
        if (!isLoaded) return;
        setSaveStatus('saving');
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = window.setTimeout(() => {
            saveProjectsToDB(projects)
                .then(() => setSaveStatus('saved'))
                .catch(() => setSaveStatus('unsaved'));
        }, 1000);
        return () => clearTimeout(saveTimeoutRef.current);
    }, [projects, isLoaded]);

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

    const deleteProject = useCallback((id: string) => {
        setProjects(prev => prev.filter(p => p.id !== id));
    }, []);

    const removeImages = useCallback((imageIds: Set<string>) => {
        setProjects(prev => prev.map(p => ({
            ...p,
            images: p.images.filter(img => !imageIds.has(img.id))
        })).filter(p => p.images.length > 0));
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

    const batchUpdateCaptions = useCallback((targetIds: Set<string>, operation: any, params: any) => {
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
                    const uniqueToAdd = params.tags.map((t: string) => t.trim()).filter((t: string) => !existingLower.has(t.toLowerCase()));
                    if (uniqueToAdd.length > 0) newCaption = [...currentTags, ...uniqueToAdd].join(', ');
                }
                else if (operation === 'removeTags' && params.tags) {
                    const tagsToRemove = new Set(params.tags.map((t: string) => t.trim().toLowerCase()).filter(Boolean));
                    newCaption = newCaption.split(',').map(t => t.trim()).filter(t => !tagsToRemove.has(t.toLowerCase())).join(', ');
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

            let movingImages: TagImage[] = [];
            // Extract images from all projects
            next = next.map(p => {
                if (p.id === destId) return p; // Don't remove from destination if we are moving within (edge case)
                const staying = p.images.filter(img => !sourceImageIds.has(img.id));
                const moving = p.images.filter(img => sourceImageIds.has(img.id));
                movingImages.push(...moving);
                return { ...p, images: staying };
            }).filter(p => p.images.length > 0 || p.id === destId); // Remove empty source projects

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
            let next = [...prev];
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
        setProjects(prev => prev.map(p => ({
            ...p,
            images: p.images.filter(i => i.status !== 'success')
        })).filter(p => p.images.length > 0));
    }, []);

    return {
        projects,
        setProjects, // Exposed for advanced cases or ref updates
        isLoaded,
        saveStatus,
        addFilesToProject,
        deleteProject,
        removeImages,
        renameImage,
        updateImageCaption,
        updateImageStatus,
        batchUpdateCaptions,
        moveImages,
        mergeProjects,
        retryErrors,
        clearDone
    };
};