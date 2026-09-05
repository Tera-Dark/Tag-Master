
import React, { useState, useMemo, useEffect } from 'react';
import { Project } from '../../types';
import { LayoutTemplate, Scissors, Maximize2, Move } from '../Icons';
import { CropEditor } from './CropEditor';

interface PreprocessViewProps {
    projects: Project[];
    onUpdateImage: (projectId: string, imageId: string, newFile: File) => void;
    onNext: () => void;
}

// Helper to calc aspect ratio bucket
const getBucket = (width: number, height: number) => {
    const ratio = width / height;
    if (ratio > 1.2) return 'landscape';
    if (ratio < 0.83) return 'portrait';
    return 'square';
};

export const PreprocessView: React.FC<PreprocessViewProps> = ({ projects, onUpdateImage, onNext }) => {
    const [selectedBucket, setSelectedBucket] = useState<'all' | 'landscape' | 'portrait' | 'square'>('all');
    const [croppingId, setCroppingId] = useState<string | null>(null); // Image ID being cropped
    const [imageDims, setImageDims] = useState<Record<string, { w: number, h: number }>>({});

    // Flatten all images
    const allImages = useMemo(() => {
        return projects.flatMap(p => p.images.map(img => ({ img, projId: p.id })));
    }, [projects]);

    // Load dimensions for all images
    useEffect(() => {
        allImages.forEach(({ img }) => {
            if (!imageDims[img.id] && img.previewUrl) {
                const i = new Image();
                i.onload = () => {
                    setImageDims(prev => ({ ...prev, [img.id]: { w: i.naturalWidth, h: i.naturalHeight } }));
                };
                i.src = img.previewUrl;
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allImages]); // Dependency on allImages is safe as we check existence

    // Calculate buckets
    const buckets = useMemo(() => {
        const counts = { landscape: 0, portrait: 0, square: 0 };
        allImages.forEach(({ img }) => {
            const dims = imageDims[img.id];
            if (dims) {
                const bucket = getBucket(dims.w, dims.h);
                counts[bucket]++;
            }
        });
        return counts;
    }, [allImages, imageDims]);

    // Filter visible images
    const visibleImages = useMemo(() => {
        if (selectedBucket === 'all') return allImages;
        return allImages.filter(({ img }) => {
            const dims = imageDims[img.id];
            if (!dims) return false;
            return getBucket(dims.w, dims.h) === selectedBucket;
        });
    }, [allImages, imageDims, selectedBucket]);

    const startCropping = (id: string) => setCroppingId(id);

    return (
        <div className="flex-1 flex flex-col bg-white dark:bg-[#212121] p-6 overflow-hidden animate-in fade-in duration-300 ease-out">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-4 mb-6 shrink-0">
                {/* Segmented Pill Selector */}
                <div className="bg-[#f4f4f4] dark:bg-[#2f2f2f] p-1 rounded-full border border-black/[0.04] dark:border-white/[0.06] flex items-center gap-0.5">
                    {(['all', 'landscape', 'portrait', 'square'] as const).map(type => (
                        <button
                            key={type}
                            onClick={() => setSelectedBucket(type)}
                            className={`px-3.5 md:px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 active:scale-95 ${
                                selectedBucket === type 
                                    ? 'bg-white dark:bg-[#212121] text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold' 
                                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                            }`}
                        >
                            <LayoutTemplate className={`w-4 h-4 ${type === 'landscape' ? 'rotate-90' : ''}`} />
                            <span className="capitalize">{type}</span>
                            {type !== 'all' && <span className="bg-black/[0.05] dark:bg-white/[0.1] px-2 py-0.2 rounded-full text-xs font-mono">{buckets[type]}</span>}
                        </button>
                    ))}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2.5">
                    <button className="px-4 py-2 bg-white dark:bg-[#2f2f2f] border border-black/[0.06] dark:border-white/[0.08] rounded-full text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] flex items-center gap-2 transition-colors shadow-2xs">
                        <Maximize2 className="w-4 h-4 text-zinc-400" /> Smart Resize
                    </button>
                    <button 
                        onClick={onNext} 
                        className="px-5 py-2 bg-[#0d0d0d] dark:bg-white text-white dark:text-[#0d0d0d] rounded-full text-sm font-semibold hover:opacity-90 flex items-center gap-2 shadow-2xs active:scale-95 transition-all"
                    >
                        Next: Tagging <Move className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3.5 pb-20">
                    {visibleImages.map(({ img }) => {
                        const dims = imageDims[img.id];
                        return (
                            <div key={img.id} className="group relative aspect-square bg-[#fbfbfb] dark:bg-[#1a1a1a] rounded-2xl overflow-hidden border border-black/[0.06] dark:border-white/[0.08] hover:border-black/[0.15] dark:hover:border-white/[0.15] transition-all p-2.5 flex items-center justify-center">
                                <img src={img.previewUrl} className="w-full h-full object-contain" />

                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                    <div className="text-white text-xs font-mono bg-black/60 px-2.5 py-1 rounded-full">
                                        {dims ? `${dims.w}x${dims.h}` : 'Loading...'}
                                    </div>
                                    <button
                                        onClick={() => startCropping(img.id)}
                                        className="bg-white text-zinc-900 px-3.5 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 hover:scale-105 transition-transform shadow-xs"
                                    >
                                        <Scissors className="w-3.5 h-3.5" /> Crop
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Crop Modal */}
            {croppingId && (
                <CropEditor
                    image={allImages.find(i => i.img.id === croppingId)?.img}
                    onClose={() => setCroppingId(null)}
                    onSave={(newFile) => {
                        const target = allImages.find(i => i.img.id === croppingId);
                        if (target) onUpdateImage(target.projId, target.img.id, newFile);
                        setCroppingId(null);
                    }}
                />
            )}
        </div>
    );
};
