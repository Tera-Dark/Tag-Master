import React from 'react';
import { TagImage } from '../types';
import { Thumbnail } from './Thumbnail';
import {
    Trash2,
    CheckCircle,
    AlertCircle,
    Loader2,
    Square,
    CheckSquare,
    ImageIcon
} from './Icons';

// Interfaces
interface ImageCardProps {
    img: TagImage;
    isSelected: boolean;
    isMultiSelected: boolean;
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerEnter: (e: React.PointerEvent) => void;
    onRemove: (e: React.MouseEvent) => void;
    onDoubleClick?: () => void;
}

interface ListItemProps {
    img: TagImage;
    isSelected: boolean;
    isMultiSelected: boolean;
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerEnter: (e: React.PointerEvent) => void;
    onRemove: (e: React.MouseEvent) => void;
    onDoubleClick?: () => void;
}

// Memoized Image Card for Grid View
export const ImageCard = React.memo(({
    img,
    isSelected,
    isMultiSelected,
    onPointerDown,
    onPointerEnter,
    onRemove,
    onDoubleClick
}: ImageCardProps) => {
    return (
        <div
            id={`card-${img.id}`}
            onPointerDown={onPointerDown}
            onPointerEnter={onPointerEnter}
            onDoubleClick={onDoubleClick}
            className={`relative group aspect-square rounded-xl border cursor-pointer overflow-hidden transition-all duration-200 select-none ${isSelected
                ? 'border-indigo-500 ring-2 ring-indigo-500/50 shadow-lg shadow-indigo-500/20 z-10 scale-[1.02]'
                : isMultiSelected
                    ? 'border-indigo-400/50 bg-indigo-50/10 ring-1 ring-indigo-400/30'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900'
                }`}
        >
            {/* Image */}
            <Thumbnail
                file={img.file}
                url={img.previewUrl}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 pointer-events-none"
            />

            {/* Selection Checkbox */}
            <div
                className={`absolute top-2 left-2 z-30 p-1 rounded-md transition-all cursor-pointer pointer-events-none ${isMultiSelected ? 'bg-indigo-600 text-white opacity-100' : 'bg-black/20 text-white/50 opacity-0 group-hover:opacity-100 hover:bg-black/40'}`}
            >
                {isMultiSelected ? <CheckSquare className="w-4 h-4 fill-current" /> : <Square className="w-4 h-4" />}
            </div>

            {/* Status Indicator */}
            <div className="absolute top-2 right-2 z-20 flex flex-col gap-1 pointer-events-none">
                {img.status === 'success' && <div className="bg-emerald-500 text-white p-1 rounded-full shadow-lg animate-in zoom-in"><CheckCircle className="w-3.5 h-3.5" /></div>}
                {img.status === 'loading' && <div className="bg-indigo-600 text-white p-1 rounded-full shadow-lg"><Loader2 className="w-3.5 h-3.5 animate-spin" /></div>}
                {img.status === 'error' && <div className="bg-red-500 text-white p-1 rounded-full shadow-lg animate-pulse"><AlertCircle className="w-3.5 h-3.5" /></div>}
            </div>

            {/* Caption Overlay */}
            {img.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white/90 via-white/90 dark:from-black dark:via-black/90 to-transparent p-3 pt-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    <p className="text-[10px] text-zinc-700 dark:text-zinc-300 line-clamp-3 font-mono leading-tight">{img.caption}</p>
                </div>
            )}

            {/* Remove Button */}
            <button
                onPointerDown={(e) => e.stopPropagation()} // Prevent selection trigger
                onClick={onRemove}
                className="absolute bottom-2 right-2 p-1.5 bg-white/80 dark:bg-black/60 hover:bg-red-500 dark:hover:bg-red-500 text-zinc-600 dark:text-white hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm z-20 scale-90 group-hover:scale-100 shadow-sm"
            >
                <Trash2 className="w-3 h-3" />
            </button>
        </div>
    );
});

// Memoized List Item for List View
export const ListItem = React.memo(({
    img,
    isSelected,
    isMultiSelected,
    onPointerDown,
    onPointerEnter,
    onRemove,
    onDoubleClick // Added onDoubleClick
}: ListItemProps) => {
    return (
        <div
            id={`card-${img.id}`}
            onPointerDown={onPointerDown}
            onPointerEnter={onPointerEnter}
            onDoubleClick={onDoubleClick} // Added onDoubleClick
            className={`group flex items-center gap-4 p-3 rounded-lg border cursor-pointer select-none transition-all h-24 ${isSelected
                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 ring-1 ring-indigo-500/30 z-10'
                : isMultiSelected
                    ? 'border-indigo-300 bg-indigo-50/30 dark:border-indigo-800 dark:bg-indigo-900/10'
                    : 'border-transparent bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800/50 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
        >
            {/* Checkbox */}
            <div className="flex-shrink-0 pl-1 pointer-events-none">
                {isMultiSelected ? <CheckSquare className="w-5 h-5 text-indigo-600" /> : <Square className="w-5 h-5 text-zinc-300 dark:text-zinc-600" />}
            </div>

            {/* Thumbnail */}
            <div className="h-16 w-16 flex-shrink-0 bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 pointer-events-none">
                <Thumbnail
                    file={img.file}
                    url={img.previewUrl}
                    className="w-full h-full object-cover"
                />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-1 pointer-events-none">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-sm truncate text-zinc-800 dark:text-zinc-200 max-w-[300px]">{img.file.name}</span>
                    {/* Status Badge */}
                    {img.status === 'success' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                    {img.status === 'loading' && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />}
                    {img.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed h-8 w-full">
                    {img.caption || <span className="italic opacity-30">No caption...</span>}
                </div>
                {img.errorMsg && <span className="text-[10px] text-red-500 truncate">{img.errorMsg}</span>}
            </div>

            {/* Actions */}
            <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={onRemove}
                className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    );
});