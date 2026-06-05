import React, { useState, useMemo, useRef, useEffect } from 'react';
import { TagImage, Project } from '../../types';
import {
    LayoutTemplate, Scissors, Maximize2, Move
} from '../Icons';

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
        <div className="flex-1 flex flex-col bg-zinc-50 dark:bg-zinc-950 p-6 overflow-hidden animate-in fade-in duration-300 ease-out">
            {/* Toolbar */}
            <div className="flex gap-4 mb-6">
                <div className="bg-white dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800 flex shadow-sm">
                    {(['all', 'landscape', 'portrait', 'square'] as const).map(type => (
                        <button
                            key={type}
                            onClick={() => setSelectedBucket(type)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${selectedBucket === type ? 'bg-indigo-600 text-white shadow' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                        >
                            <LayoutTemplate className={`w-4 h-4 ${type === 'landscape' ? 'rotate-90' : ''}`} />
                            <span className="capitalize">{type}</span>
                            {type !== 'all' && <span className="bg-zinc-200 dark:bg-zinc-700 px-1.5 rounded-full text-xs">{buckets[type]}</span>}
                        </button>
                    ))}
                </div>

                <div className="flex-1" />

                {/* Actions */}
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-600 font-medium hover:text-indigo-600 flex items-center gap-2 shadow-sm">
                        <Maximize2 className="w-4 h-4" /> Smart Resize
                    </button>
                    <button onClick={onNext} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">
                        Next: Tagging <Move className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 pb-20">
                    {visibleImages.map(({ img }) => {
                        const dims = imageDims[img.id];
                        return (
                            <div key={img.id} className="group relative aspect-square bg-zinc-200 dark:bg-zinc-800 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 transition-all">
                                <img src={img.previewUrl} className="w-full h-full object-contain p-2" />

                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                    <div className="text-white text-xs font-mono bg-black/50 px-2 py-1 rounded">
                                        {dims ? `${dims.w}x${dims.h}` : 'Loading...'}
                                    </div>
                                    <button
                                        onClick={() => startCropping(img.id)}
                                        className="bg-white text-zinc-900 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 hover:scale-105 transition-transform"
                                    >
                                        <Scissors className="w-3 h-3" /> Crop
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

// --- Simple Crop Editor Component (Inline) ---
const CropEditor = ({ image, onClose, onSave }: { image?: TagImage, onClose: () => void, onSave: (f: File) => void }) => {
    const imgRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0, w: 0, h: 0 }); // Pixels relative to displayed image.
    const [aspectRatio, setAspectRatio] = useState<string>('free');

    // Dragging whole box
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [startCrop, setStartCrop] = useState({ x: 0, y: 0, w: 0, h: 0 });

    // Resizing corners
    const [isResizing, setIsResizing] = useState(false);
    const [activeHandle, setActiveHandle] = useState<'nw' | 'ne' | 'se' | 'sw' | null>(null);

    if (!image) return null;

    const getRatioValue = (ratioStr: string) => {
        if (ratioStr === 'free') return null;
        if (ratioStr === '1:1') return 1;
        if (ratioStr === '2:3') return 2 / 3;
        if (ratioStr === '3:4') return 3 / 4;
        if (ratioStr === '16:9') return 16 / 9;
        if (ratioStr === '9:16') return 9 / 16;
        return null;
    };

    // Initialize crop to full image on load
    const contentLoaded = () => {
        if (imgRef.current) {
            const { width, height } = imgRef.current;
            // Default 80% center
            setCrop({ x: width * 0.1, y: height * 0.1, w: width * 0.8, h: height * 0.8 });
        }
    };

    const handleAspectRatioChange = (ratioStr: string) => {
        setAspectRatio(ratioStr);
        if (ratioStr === 'free') return;
        if (!imgRef.current) return;

        const imgWidth = imgRef.current.width;
        const imgHeight = imgRef.current.height;
        const ratio = getRatioValue(ratioStr);
        if (!ratio) return;

        setCrop(prev => {
            let w = prev.w;
            let h = w / ratio;
            // Check overflow & clamp
            if (prev.y + h > imgHeight) {
                h = imgHeight - prev.y;
                w = h * ratio;
            }
            if (prev.x + w > imgWidth) {
                w = imgWidth - prev.x;
                h = w / ratio;
            }
            // Fallback: if width or height is too small, reset to a centered box with maximum possible size for the ratio
            if (w < 30 || h < 30) {
                if (imgWidth / imgHeight > ratio) {
                    h = imgHeight * 0.8;
                    w = h * ratio;
                } else {
                    w = imgWidth * 0.8;
                    h = w / ratio;
                }
                const x = (imgWidth - w) / 2;
                const y = (imgHeight - h) / 2;
                return { x, y, w, h };
            }
            return { ...prev, w, h };
        });
    };

    const resetToFull = () => {
        if (imgRef.current) {
            const { width, height } = imgRef.current;
            setCrop({ x: 0, y: 0, w: width, h: height });
            setAspectRatio('free');
        }
    };

    // Box move handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        setStartCrop({ ...crop });
    };

    // Resizing corner handlers
    const handleResizeMouseDown = (e: React.MouseEvent, handle: 'nw' | 'ne' | 'se' | 'sw') => {
        e.stopPropagation();
        e.preventDefault();
        setIsResizing(true);
        setActiveHandle(handle);
        setDragStart({ x: e.clientX, y: e.clientY });
        setStartCrop({ ...crop });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!imgRef.current) return;
        const imgWidth = imgRef.current.width;
        const imgHeight = imgRef.current.height;
        const minSize = 30;

        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;

        if (isDragging) {
            let newX = startCrop.x + dx;
            let newY = startCrop.y + dy;

            newX = Math.max(0, Math.min(newX, imgWidth - crop.w));
            newY = Math.max(0, Math.min(newY, imgHeight - crop.h));

            setCrop(c => ({ ...c, x: newX, y: newY }));
        } else if (isResizing && activeHandle) {
            const ratio = getRatioValue(aspectRatio);

            if (ratio === null) {
                // Free resize
                let x = crop.x;
                let y = crop.y;
                let w = crop.w;
                let h = crop.h;

                if (activeHandle === 'se') {
                    w = Math.max(minSize, Math.min(startCrop.w + dx, imgWidth - startCrop.x));
                    h = Math.max(minSize, Math.min(startCrop.h + dy, imgHeight - startCrop.y));
                } else if (activeHandle === 'sw') {
                    const clampDx = Math.max(-startCrop.x, Math.min(startCrop.w - minSize, dx));
                    x = startCrop.x + clampDx;
                    w = startCrop.w - clampDx;
                    h = Math.max(minSize, Math.min(startCrop.h + dy, imgHeight - startCrop.y));
                } else if (activeHandle === 'ne') {
                    const clampDy = Math.max(-startCrop.y, Math.min(startCrop.h - minSize, dy));
                    y = startCrop.y + clampDy;
                    h = startCrop.h - clampDy;
                    w = Math.max(minSize, Math.min(startCrop.w + dx, imgWidth - startCrop.x));
                } else if (activeHandle === 'nw') {
                    const clampDx = Math.max(-startCrop.x, Math.min(startCrop.w - minSize, dx));
                    const clampDy = Math.max(-startCrop.y, Math.min(startCrop.h - minSize, dy));
                    x = startCrop.x + clampDx;
                    w = startCrop.w - clampDx;
                    y = startCrop.y + clampDy;
                    h = startCrop.h - clampDy;
                }
                setCrop({ x, y, w, h });
            } else {
                // Locked Ratio Resize
                let x = crop.x;
                let y = crop.y;
                let w = crop.w;
                let h = crop.h;

                if (activeHandle === 'se') {
                    w = startCrop.w + dx;
                    w = Math.max(minSize, w);
                    h = w / ratio;
                    if (startCrop.y + h > imgHeight) {
                        h = imgHeight - startCrop.y;
                        w = h * ratio;
                    }
                    if (startCrop.x + w > imgWidth) {
                        w = imgWidth - startCrop.x;
                        h = w / ratio;
                    }
                } else if (activeHandle === 'sw') {
                    w = startCrop.w - dx;
                    w = Math.max(minSize, w);
                    h = w / ratio;
                    if (startCrop.y + h > imgHeight) {
                        h = imgHeight - startCrop.y;
                        w = h * ratio;
                    }
                    if (w > startCrop.x + startCrop.w) {
                        w = startCrop.x + startCrop.w;
                        h = w / ratio;
                    }
                    x = startCrop.x + startCrop.w - w;
                } else if (activeHandle === 'ne') {
                    w = startCrop.w + dx;
                    w = Math.max(minSize, w);
                    h = w / ratio;
                    if (startCrop.x + w > imgWidth) {
                        w = imgWidth - startCrop.x;
                        h = w / ratio;
                    }
                    if (h > startCrop.y + startCrop.h) {
                        h = startCrop.y + startCrop.h;
                        w = h * ratio;
                    }
                    y = startCrop.y + startCrop.h - h;
                } else if (activeHandle === 'nw') {
                    w = startCrop.w - dx;
                    w = Math.max(minSize, w);
                    h = w / ratio;
                    if (w > startCrop.x + startCrop.w) {
                        w = startCrop.x + startCrop.w;
                        h = w / ratio;
                    }
                    if (h > startCrop.y + startCrop.h) {
                        h = startCrop.y + startCrop.h;
                        w = h * ratio;
                    }
                    x = startCrop.x + startCrop.w - w;
                    y = startCrop.y + startCrop.h - h;
                }
                setCrop({ x, y, w, h });
            }
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setIsResizing(false);
        setActiveHandle(null);
    };

    // Commit Crop
    const handleSave = () => {
        if (!imgRef.current) return;
        const canvas = document.createElement('canvas');
        const scale = imgRef.current.naturalWidth / imgRef.current.width;

        canvas.width = crop.w * scale;
        canvas.height = crop.h * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(
            imgRef.current,
            crop.x * scale, crop.y * scale, crop.w * scale, crop.h * scale,
            0, 0,
            crop.w * scale, crop.h * scale
        );

        canvas.toBlob(blob => {
            if (blob) {
                const newFile = new File([blob], image.file.name, { type: image.file.type });
                onSave(newFile);
            }
        }, image.file.type);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/40 dark:bg-black/60 flex flex-col items-center justify-center p-8 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Image Canvas Container */}
            <div 
                className="flex-1 relative flex items-center justify-center w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ease-out"
                onMouseMove={handleMouseMove} 
                onMouseUp={handleMouseUp} 
                onMouseLeave={handleMouseUp}
            >
                <div className="relative border border-zinc-700/30 rounded-lg overflow-hidden bg-zinc-900/10 shadow-lg" ref={containerRef}>
                    <img
                        ref={imgRef}
                        src={image.previewUrl}
                        className="max-h-[70vh] max-w-full select-none pointer-events-none"
                        onLoad={contentLoaded}
                        draggable={false}
                    />

                    {/* Crop Overlay Box */}
                    <div
                        className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] cursor-move"
                        style={{
                            left: crop.x, 
                            top: crop.y, 
                            width: crop.w, 
                            height: crop.h,
                        }}
                        onMouseDown={handleMouseDown}
                    >
                        {/* Pixel Info Badge */}
                        {imgRef.current && (
                            <div className="absolute -top-6 left-0 bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded font-mono select-none pointer-events-none whitespace-nowrap shadow-md border border-indigo-400/20">
                                {Math.round(crop.w * (imgRef.current.naturalWidth / imgRef.current.width))} × {Math.round(crop.h * (imgRef.current.naturalHeight / imgRef.current.height))} px
                            </div>
                        )}

                        {/* Grid Lines */}
                        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                            <div className="border-r border-b border-white/40" />
                            <div className="border-r border-b border-white/40" />
                            <div className="border-b border-white/40" />
                            <div className="border-r border-b border-white/40" />
                            <div className="border-r border-b border-white/40" />
                            <div className="border-b border-white/40" />
                            <div className="border-r border-white/40" />
                            <div className="border-r border-white/40" />
                        </div>

                        {/* White Circular Handles with Indigo Border */}
                        <div className="absolute top-0 left-0 w-3 h-3 bg-white border-2 border-indigo-600 cursor-nw-resize -translate-x-1/2 -translate-y-1/2 rounded-full shadow" onMouseDown={(e) => handleResizeMouseDown(e, 'nw')} />
                        <div className="absolute top-0 right-0 w-3 h-3 bg-white border-2 border-indigo-600 cursor-ne-resize translate-x-1/2 -translate-y-1/2 rounded-full shadow" onMouseDown={(e) => handleResizeMouseDown(e, 'ne')} />
                        <div className="absolute bottom-0 left-0 w-3 h-3 bg-white border-2 border-indigo-600 cursor-sw-resize -translate-x-1/2 translate-y-1/2 rounded-full shadow" onMouseDown={(e) => handleResizeMouseDown(e, 'sw')} />
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-white border-2 border-indigo-600 cursor-se-resize translate-x-1/2 translate-y-1/2 rounded-full shadow" onMouseDown={(e) => handleResizeMouseDown(e, 'se')} />
                    </div>
                </div>
            </div>

            {/* Bottom Control Bar */}
            <div className="h-20 w-full max-w-3xl bg-zinc-900 rounded-t-2xl border-t border-zinc-800 flex items-center justify-between px-8 shadow-2xl">
                {/* Left Side: Aspect Ratio Tabs */}
                <div className="flex items-center gap-3">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">裁剪比例:</span>
                    <div className="flex gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 shadow-inner">
                        {(['free', '1:1', '2:3', '3:4', '16:9', '9:16'] as const).map(r => (
                            <button
                                key={r}
                                onClick={() => handleAspectRatioChange(r)}
                                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${aspectRatio === r ? 'bg-indigo-600 text-white shadow shadow-indigo-500/20' : 'text-zinc-500 hover:text-zinc-350'}`}
                            >
                                {r === 'free' ? '自由' : r}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right Side: Actions */}
                <div className="flex items-center gap-3">
                    <button 
                        onClick={resetToFull} 
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold border border-zinc-750 transition-colors"
                    >
                        重设全图 (Reset)
                    </button>
                    <div className="h-4 w-px bg-zinc-800 mx-1"></div>
                    <button onClick={onClose} className="px-5 py-2 text-zinc-400 hover:text-white text-xs font-bold transition-colors">取消</button>
                    <button onClick={handleSave} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">保存裁剪</button>
                </div>
            </div>
        </div>
    );
};
