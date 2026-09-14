
import { useDeferredValue, useMemo, useState } from 'react';
import { Project, TagImage } from '../types';

export const useSearch = (projects: Project[], activeProjectId: string | 'all') => {
    const [searchQuery, setSearchQuery] = useState('');
    const [viewFilter, setViewFilter] = useState<'all' | 'pending' | 'completed'>('all');

    const deferredQuery = useDeferredValue(searchQuery.trim().toLowerCase());

    const filteredImages = useMemo(() => {
        const allImages: { projId: string, img: TagImage }[] = [];

        if (activeProjectId === 'all') {
            projects.forEach(p => {
                if (!p.isCollapsed) {
                    p.images.forEach(img => allImages.push({ projId: p.id, img }));
                }
            });
        } else {
            const project = projects.find(p => p.id === activeProjectId);
            if (project) {
                project.images.forEach(img => allImages.push({ projId: project.id, img }));
            }
        }

        const lengthMatch = /^len\s*([<>])\s*(\d+)$/.exec(deferredQuery);
        return allImages.filter(({ img }) => {
            // 1. Status Filter
            if (viewFilter === 'pending' && img.status === 'success') return false;
            if (viewFilter === 'completed' && img.status !== 'success' && !(img.status === 'loading' && img.caption)) return false;

            // 2. Search Query
            const query = deferredQuery;
            if (!query) return true;
            if (lengthMatch) {
                const limit = Number(lengthMatch[2]);
                return lengthMatch[1] === '>' ? img.caption.length > limit : img.caption.length < limit;
            }

            // Advanced Search: status:error
            if (query.startsWith('status:')) {
                const status = query.slice(7).trim();
                return img.status === status;
            }

            // Standard Text Search
            return (
                img.file.name.toLowerCase().includes(query) ||
                (img.caption && img.caption.toLowerCase().includes(query))
            );
        });
    }, [projects, activeProjectId, deferredQuery, viewFilter]);

    return {
        searchQuery,
        setSearchQuery,
        viewFilter,
        setViewFilter,
        filteredImages
    };
};
