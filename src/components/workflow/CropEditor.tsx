import React, { useState, useRef } from 'react';
import { TagImage } from '../../types';

interface CropEditorProps {
    image?: TagImage;
    onClose: () => void;
    onSave: (f: File) => void;
}

export const CropEditor: React.FC<CropEditorProps> = ({ image, onClose, onSave }) => {
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
                        alt="Crop target"
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
                            <div className="absolute -top-7 left-0 bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded font-mono select-none pointer-events-none whitespace-nowrap shadow-md border border-indigo-400/20">
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
                            <div className="border-r border-b border-white/40" />
                            <div className="border-r border-b border-white/40" />
                        </div>

                        {/* White Circular Handles with Indigo Border */}
                        <div className="absolute top-0 left-0 w-3.5 h-3.5 bg-white border-2 border-indigo-600 cursor-nw-resize -translate-x-1/2 -translate-y-1/2 rounded-full shadow" onMouseDown={(e) => handleResizeMouseDown(e, 'nw')} />
                        <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-white border-2 border-indigo-600 cursor-ne-resize translate-x-1/2 -translate-y-1/2 rounded-full shadow" onMouseDown={(e) => handleResizeMouseDown(e, 'ne')} />
                        <div className="absolute bottom-0 left-0 w-3.5 h-3.5 bg-white border-2 border-indigo-600 cursor-sw-resize -translate-x-1/2 translate-y-1/2 rounded-full shadow" onMouseDown={(e) => handleResizeMouseDown(e, 'sw')} />
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-white border-2 border-indigo-600 cursor-se-resize translate-x-1/2 translate-y-1/2 rounded-full shadow" onMouseDown={(e) => handleResizeMouseDown(e, 'se')} />
                    </div>
                </div>
            </div>

            {/* Bottom Control Bar */}
            <div className="h-20 w-full max-w-3xl bg-zinc-900 rounded-t-2xl border-t border-zinc-800 flex items-center justify-between px-8 shadow-2xl">
                {/* Left Side: Aspect Ratio Tabs */}
                <div className="flex items-center gap-3">
                    <span className="text-xs uppercase font-semibold text-zinc-400 tracking-wider">裁剪比例:</span>
                    <div className="flex gap-1 bg-zinc-950 p-1.5 rounded-lg border border-zinc-800 shadow-inner">
                        {(['free', '1:1', '2:3', '3:4', '16:9', '9:16'] as const).map(r => (
                            <button
                                key={r}
                                onClick={() => handleAspectRatioChange(r)}
                                className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${aspectRatio === r ? 'bg-indigo-600 text-white shadow shadow-indigo-500/20' : 'text-zinc-400 hover:text-zinc-200'}`}
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
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold border border-zinc-750 transition-colors cursor-pointer"
                    >
                        重设全图 (Reset)
                    </button>
                    <div className="h-4 w-px bg-zinc-800 mx-1"></div>
                    <button onClick={onClose} className="px-5 py-2 text-zinc-400 hover:text-white text-xs font-bold transition-colors cursor-pointer">取消</button>
                    <button onClick={handleSave} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer">保存裁剪</button>
                </div>
            </div>
        </div>
    );
};
