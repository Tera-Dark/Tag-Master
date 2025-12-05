
import React, { useState, useRef, useCallback } from 'react';
import { scanEntry, isImageFile } from '../services/fileHelpers';

export const useFileHandler = (
    activeProjectId: string | 'all',
    addFilesToProject: (files: File[], target: { mode: 'append', projectId: string } | { mode: 'create', name?: string }) => Promise<void>
) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const dragCounter = useRef(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Drag & Drop Handlers ---
    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current += 1;
        if (e.dataTransfer.types && Array.prototype.indexOf.call(e.dataTransfer.types, "Files") !== -1) {
            setIsDragOver(true);
        }
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current -= 1;
        if (dragCounter.current <= 0) {
            setIsDragOver(false);
            dragCounter.current = 0;
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        dragCounter.current = 0;

        const items = e.dataTransfer.items;
        let processedAsEntries = false;

        if (items && items.length > 0) {
            // @ts-ignore - webkitGetAsEntry is non-standard but widely supported
            const entries = Array.from(items).map(item => item.webkitGetAsEntry ? item.webkitGetAsEntry() : null).filter((e): e is FileSystemEntry => e !== null);
            if (entries.length > 0) {
                processedAsEntries = true;
                const looseFiles: File[] = [];
                for (const entry of entries) {
                    if (entry.isDirectory) {
                        const files = await scanEntry(entry);
                        const validFiles = files.filter(isImageFile);
                        if (validFiles.length > 0) {
                            await addFilesToProject(validFiles, { mode: 'create', name: entry.name });
                        }
                    } else if (entry.isFile) {
                        looseFiles.push(...(await scanEntry(entry)));
                    }
                }
                const validLoose = looseFiles.filter(isImageFile);
                if (validLoose.length > 0) {
                    await addFilesToProject(validLoose, activeProjectId === 'all' ? { mode: 'create' } : { mode: 'append', projectId: activeProjectId });
                }
                return;
            }
        }

        if (!processedAsEntries && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files).filter(isImageFile) as File[];
            if (files.length > 0) {
                await addFilesToProject(files, activeProjectId === 'all' ? { mode: 'create' } : { mode: 'append', projectId: activeProjectId });
            }
        }
    }, [activeProjectId, addFilesToProject]);

    const handleFileInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files).filter(isImageFile) as File[];
            if (files.length > 0) {
                await addFilesToProject(files, activeProjectId === 'all' ? { mode: 'create' } : { mode: 'append', projectId: activeProjectId });
            }
            // Reset input
            e.target.value = '';
        }
    }, [activeProjectId, addFilesToProject]);

    const openFileDialog = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    return {
        isDragOver,
        fileInputRef,
        handleDragEnter,
        handleDragLeave,
        handleDragOver,
        handleDrop,
        handleFileInputChange,
        openFileDialog
    };
};
