import React from 'react';
import { TagImage } from '../types';
import { Thumbnail } from './Thumbnail';
import { Trash2, CheckCircle, AlertCircle, Loader2, Square, CheckSquare } from './Icons';

// Interfaces
interface ImageCardProps {
  img: TagImage;
  isSelected: boolean;
  isMultiSelected: boolean;
  onPointerDown: (e: React.PointerEvent | React.KeyboardEvent) => void;
  onPointerEnter: (e: React.PointerEvent) => void;
  onRemove: (e: React.MouseEvent) => void;
  onDoubleClick?: () => void;
}

interface ListItemProps {
  img: TagImage;
  isSelected: boolean;
  isMultiSelected: boolean;
  onPointerDown: (e: React.PointerEvent | React.KeyboardEvent) => void;
  onPointerEnter: (e: React.PointerEvent) => void;
  onRemove: (e: React.MouseEvent) => void;
  onDoubleClick?: () => void;
}

// Memoized Image Card for Grid View
export const ImageCard = React.memo(
  ({
    img,
    isSelected,
    isMultiSelected,
    onPointerDown,
    onPointerEnter,
    onRemove,
    onDoubleClick,
  }: ImageCardProps) => {
    return (
      <div
        id={`card-${img.id}`}
        tabIndex={0}
        role='option'
        aria-label={img.file.name}
        aria-selected={isSelected || isMultiSelected}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onPointerDown(event);
          }
        }}
        onPointerDown={onPointerDown}
        onPointerEnter={onPointerEnter}
        onDoubleClick={onDoubleClick}
        className={`tm-image-card relative group aspect-square rounded-xl border cursor-pointer overflow-hidden transition-all duration-200 select-none ${
          isSelected
            ? 'ring-2 ring-zinc-900 dark:ring-white border-transparent z-10  shadow-none'
            : isMultiSelected
              ? 'ring-2 ring-zinc-600 dark:ring-zinc-400 bg-black/[0.02] dark:bg-white/[0.03]'
              : img.status === 'loading'
                ? 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 animate-subtle-pulse'
                : img.status === 'error'
                  ? 'border-red-300/80 dark:border-red-900/80 bg-red-500/5'
                  : 'border-tm-border hover:border-black/[0.15] dark:hover:border-white/[0.15] bg-tm-canvas'
        }`}
      >
        {/* Image Container with contain mode and clean minimalist backdrop */}
        <div className='w-full h-full flex items-center justify-center p-2.5 bg-tm-media transition-colors'>
          <Thumbnail
            file={img.file}
            url={img.previewUrl}
            className='w-full h-full object-contain pointer-events-none'
          />
        </div>

        {/* Selection Checkbox */}
        <div
          className={`absolute top-2.5 left-2.5 z-30 p-1 rounded-full transition-all cursor-pointer pointer-events-none backdrop-blur-md ${
            isMultiSelected
              ? 'bg-tm-accent text-tm-on-accent opacity-100 shadow-none'
              : 'bg-black/30 text-white/80 opacity-0 group-hover:opacity-100'
          }`}
        >
          {isMultiSelected ? (
            <CheckSquare className='w-4 h-4 fill-current' />
          ) : (
            <Square className='w-4 h-4' />
          )}
        </div>

        {/* Status Indicator */}
        <div className='absolute top-2.5 right-2.5 z-20 flex flex-col gap-1 pointer-events-none'>
          {img.status === 'success' && (
            <div className='bg-emerald-500 text-white p-1 rounded-full shadow-none'>
              <CheckCircle className='w-3.5 h-3.5' />
            </div>
          )}
          {img.status === 'loading' && (
            <div className='bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 p-1 rounded-full shadow-none'>
              <Loader2 className='w-3.5 h-3.5 animate-spin' />
            </div>
          )}
          {img.status === 'error' && (
            <div
              className='bg-red-500 text-white p-1 rounded-full shadow-none pointer-events-auto'
              title={img.errorMsg ? `错误: ${img.errorMsg}` : '打标失败'}
            >
              <AlertCircle className='w-3.5 h-3.5' />
            </div>
          )}
        </div>

        {/* Caption Overlay (Minimalist frosted card) */}
        {img.caption && (
          <div className='absolute bottom-2 left-2 right-2 bg-white/95 dark:bg-[#212121]/95 backdrop-blur-md rounded-xl p-2.5 border border-tm-border shadow-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none'>
            <p className='text-xs text-tm-secondary line-clamp-2 font-mono leading-relaxed'>
              {img.caption}
            </p>
          </div>
        )}

        {/* Remove Button */}
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onRemove}
          className='tm-button absolute bottom-2 right-2 p-1.5 bg-white/95 dark:bg-[#212121]/95 hover:bg-red-500 dark:hover:bg-red-500 text-zinc-500 hover:text-white dark:hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all border border-tm-border shadow-none  z-20'
          title='Delete image'
        >
          <Trash2 className='w-3.5 h-3.5' />
        </button>
      </div>
    );
  }
);

// Memoized List Item for List View
export const ListItem = React.memo(
  ({
    img,
    isSelected,
    isMultiSelected,
    onPointerDown,
    onPointerEnter,
    onRemove,
    onDoubleClick,
  }: ListItemProps) => {
    return (
      <div
        id={`card-${img.id}`}
        tabIndex={0}
        role='option'
        aria-label={img.file.name}
        aria-selected={isSelected || isMultiSelected}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onPointerDown(event);
          }
        }}
        onPointerDown={onPointerDown}
        onPointerEnter={onPointerEnter}
        onDoubleClick={onDoubleClick}
        className={`tm-image-card group flex items-center gap-4 p-3.5 rounded-xl border cursor-pointer select-none transition-all h-[96px] ${
          isSelected
            ? 'ring-2 ring-zinc-900 dark:ring-white bg-black/[0.02] dark:bg-white/[0.03] border-transparent z-10'
            : isMultiSelected
              ? 'ring-1.5 ring-zinc-600 dark:ring-zinc-400 bg-black/[0.015] dark:bg-white/[0.02]'
              : img.status === 'loading'
                ? 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 animate-subtle-pulse'
                : img.status === 'error'
                  ? 'border-red-300/80 dark:border-red-900/80 bg-red-50/10'
                  : 'border-tm-border bg-tm-canvas hover:border-black/[0.12] dark:hover:border-white/[0.15]'
        }`}
      >
        {/* Checkbox */}
        <div className='flex-shrink-0 pl-0.5 pointer-events-none'>
          {isMultiSelected ? (
            <CheckSquare className='w-4 h-4 text-tm-text' />
          ) : (
            <Square className='w-4 h-4 text-zinc-300 dark:text-zinc-600' />
          )}
        </div>

        {/* Thumbnail with contain mode */}
        <div className='h-16 w-16 flex-shrink-0 bg-tm-media rounded-xl overflow-hidden border border-black/[0.04] dark:border-white/[0.06] p-1 flex items-center justify-center pointer-events-none'>
          <Thumbnail
            file={img.file}
            url={img.previewUrl}
            className='w-full h-full object-contain'
          />
        </div>

        {/* Info */}
        <div className='flex-1 min-w-0 flex flex-col justify-center gap-1 pointer-events-none'>
          <div className='flex items-center gap-2'>
            <span className='font-semibold text-sm truncate text-tm-text max-w-[320px]'>
              {img.file.name}
            </span>
            {/* Status Badge */}
            {img.status === 'success' && <CheckCircle className='w-4 h-4 text-emerald-500' />}
            {img.status === 'loading' && (
              <Loader2 className='w-4 h-4 text-zinc-600 dark:text-zinc-300 animate-spin' />
            )}
            {img.status === 'error' && <AlertCircle className='w-4 h-4 text-red-500' />}
          </div>
          <div className='text-xs text-tm-subtle line-clamp-2 leading-relaxed h-8 w-full font-mono'>
            {img.caption || <span className='italic opacity-40'>No caption yet...</span>}
          </div>
          {img.errorMsg && (
            <span className='text-xs text-red-500 truncate font-medium'>{img.errorMsg}</span>
          )}
        </div>

        {/* Actions */}
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onRemove}
          className='tm-button p-2.5 text-tm-subtle hover:text-red-600 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all '
          title='Delete item'
        >
          <Trash2 className='w-4 h-4' />
        </button>
      </div>
    );
  }
);
