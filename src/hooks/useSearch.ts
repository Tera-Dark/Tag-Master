
import { useMemo, useState } from 'react';
import { Project, TagImage } from '../types';

export const useSearch = (projects: Project[], activeProjectId: string | 'all') => {
    const [searchQuery, setSearchQuery] = useState('');
    const [viewFilter, setViewFilter] = useState<'all' | 'pending' | 'completed'>('all');

    const filteredImages = useMemo(() => {
        let allImages: { projId: string, img: TagImage }[] = [];

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

        return allImages.filter(({ img }) => {
            // 1. Status Filter
            if (viewFilter === 'pending' && img.status === 'success') return false;
            if (viewFilter === 'completed' && img.status !== 'success') return false;

            // 2. Search Query
            if (!searchQuery.trim()) return true;

            const query = searchQuery.toLowerCase();

            // Advanced Search: len > 50
            if (query.startsWith('len>') || query.startsWith('len <')) {
                const operator = query.includes('>') ? '>' : '<';
                const limit = parseInt(query.split(operator)[1]);
                if (!isNaN(limit)) {
                    const captionLen = img.caption.length;
                    return operator === '>' ? captionLen > limit : captionLen < limit;
                }
            }

            // Advanced Search: status:error
            if (query.startsWith('status:')) {
                const status = query.split(':')[1];
                return img.status === status;
            }

            // Standard Text Search
            return (
                img.file.name.toLowerCase().includes(query) ||
                (img.caption && img.caption.toLowerCase().includes(query))
            );
        });
    }, [projects, activeProjectId, searchQuery, viewFilter]);

    return {
        searchQuery,
        setSearchQuery,
        viewFilter,
        setViewFilter,
        filteredImages
    };
};
