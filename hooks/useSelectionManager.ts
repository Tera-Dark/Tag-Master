
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TagImage } from '../types';

export const useSelectionManager = (visibleImages: { image: TagImage, projectId: string }[]) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [multiSelection, setMultiSelection] = useState<Set<string>>(new Set());
    
    const lastSelectedIdRef = useRef<string | null>(null);
    const isSelectionDraggingRef = useRef(false);
    const selectionModeRef = useRef<'select' | 'deselect'>('select');

    useEffect(() => {
        const handleUp = () => { isSelectionDraggingRef.current = false; };
        window.addEventListener('pointerup', handleUp);
        return () => window.removeEventListener('pointerup', handleUp);
    }, []);

    const handleSelectAll = useCallback(() => {
        if (multiSelection.size === visibleImages.length && visibleImages.length > 0) {
            setMultiSelection(new Set());
        } else {
            setMultiSelection(new Set(visibleImages.map(v => v.image.id)));
        }
    }, [multiSelection.size, visibleImages]);

    const handleCardPointerDown = useCallback((id: string, e: React.PointerEvent) => {
        if (e.button !== 0) return;

        // Shift + Click Range Selection
        if (e.shiftKey && lastSelectedIdRef.current) {
            e.preventDefault();
            const lastIdx = visibleImages.findIndex(v => v.image.id === lastSelectedIdRef.current);
            const currIdx = visibleImages.findIndex(v => v.image.id === id);
            
            if (lastIdx !== -1 && currIdx !== -1) {
                const start = Math.min(lastIdx, currIdx);
                const end = Math.max(lastIdx, currIdx);
                const newSet = new Set(multiSelection);
                for (let i = start; i <= end; i++) {
                    newSet.add(visibleImages[i].image.id);
                }
                setMultiSelection(newSet);
                return;
            }
        }

        // Drag Select Start
        isSelectionDraggingRef.current = true;
        const isCurrentlySelected = multiSelection.has(id);

        if (e.ctrlKey || e.metaKey) {
            selectionModeRef.current = isCurrentlySelected ? 'deselect' : 'select';
        } else {
            if (!isCurrentlySelected) {
                setMultiSelection(new Set([id]));
                selectionModeRef.current = 'select';
            } else {
                selectionModeRef.current = 'select'; // Keep dragging
            }
        }

        setMultiSelection(prev => {
            const next = new Set(e.ctrlKey || e.metaKey ? prev : []);
            if (selectionModeRef.current === 'select') next.add(id);
            else next.delete(id);
            
            if (!e.ctrlKey && !e.metaKey) next.add(id); // Ensure current is added on standard click
            return next;
        });

        setSelectedId(id);
        lastSelectedIdRef.current = id;
    }, [visibleImages, multiSelection]);

    const handleCardPointerEnter = useCallback((id: string, e: React.PointerEvent) => {
        if (isSelectionDraggingRef.current) {
            setMultiSelection(prev => {
                const next = new Set(prev);
                if (selectionModeRef.current === 'select') next.add(id);
                else next.delete(id);
                return next;
            });
            lastSelectedIdRef.current = id;
        }
    }, []);

    const clearSelection = useCallback(() => {
        setMultiSelection(new Set());
        setSelectedId(null);
    }, []);

    return {
        selectedId,
        setSelectedId,
        multiSelection,
        setMultiSelection,
        handleSelectAll,
        handleCardPointerDown,
        handleCardPointerEnter,
        clearSelection
    };
};
