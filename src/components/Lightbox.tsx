import { DialogOverlay } from './ui/DialogOverlay';
import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { TagImage } from '../types';

interface LightboxProps {
  isOpen: boolean;
  onClose: () => void;
  image: TagImage | null;
  onNext: () => void;
  onPrev: () => void;
  hasNext: boolean;
  hasPrev: boolean;
}

export const Lightbox: React.FC<LightboxProps> = ({
  isOpen,
  onClose,
  image,
  onNext,
  onPrev,
  hasNext,
  hasPrev,
}) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [image]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowRight' && hasNext) onNext();
      if (e.key === 'ArrowLeft' && hasPrev) onPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasNext, hasPrev, onNext, onPrev, onClose]);

  if (!isOpen || !image) return null;

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setScale((s) => Math.min(Math.max(0.5, s * delta), 5));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - startPos.x,
        y: e.clientY - startPos.y,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <DialogOverlay label={image.file.name} onClose={onClose} className='tm-lightbox-dialog'>
      <div className='tm-lightbox-window relative w-full h-full'>
        {/* Controls */}
        <div className='absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10  bg-[#171717]/95 border-b border-white/10'>
          <div className='text-white font-medium truncate max-w-md'>{image.file.name}</div>
          <div className='flex items-center gap-2'>
            <button
              className='tm-button text-xs text-white/70 px-2'
              onClick={() => {
                setScale(1);
                setPosition({ x: 0, y: 0 });
              }}
              title='重置缩放'
            >
              {Math.round(scale * 100)}%
            </button>
            <button
              aria-label='放大'
              onClick={() => setScale((s) => Math.min(s + 0.5, 5))}
              className='tm-button p-2 text-white/70 hover:text-white bg-white/10 rounded-full hover:bg-white/20 transition-all'
            >
              <ZoomIn className='w-5 h-5' />
            </button>
            <button
              aria-label='缩小'
              onClick={() => setScale((s) => Math.max(0.5, s - 0.5))}
              className='tm-button p-2 text-white/70 hover:text-white bg-white/10 rounded-full hover:bg-white/20 transition-all'
            >
              <ZoomOut className='w-5 h-5' />
            </button>
            <button
              aria-label='关闭'
              onClick={onClose}
              className='tm-button p-2 text-white/70 hover:text-white bg-white/10 rounded-full hover:bg-white/20 transition-all'
            >
              <X className='w-5 h-5' />
            </button>
          </div>
        </div>

        {/* Navigation */}
        {hasPrev && (
          <button
            aria-label='上一张'
            onClick={onPrev}
            className='tm-button absolute left-4 p-3 text-white/50 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-all z-10'
          >
            <ChevronLeft className='w-8 h-8' />
          </button>
        )}
        {hasNext && (
          <button
            aria-label='下一张'
            onClick={onNext}
            className='tm-button absolute right-4 p-3 text-white/50 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-all z-10'
          >
            <ChevronRight className='w-8 h-8' />
          </button>
        )}

        {/* Image Area */}
        <div
          className='w-full h-full flex items-center justify-center overflow-hidden cursor-move'
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <img
            src={image.previewUrl}
            alt={image.file.name}
            className='max-w-[90%] max-h-[80%] object-contain transition-transform duration-75 animate-in zoom-in-95 duration-200 ease-out'
            style={{
              transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
              cursor: scale > 1 ? 'grab' : 'default',
            }}
            draggable={false}
          />
        </div>

        {/* Caption Overlay */}
        <div className='absolute bottom-0 left-0 right-0 p-6  bg-[#171717]/95 border-t border-white/10 text-white'>
          <p className='max-w-4xl mx-auto text-center text-sm opacity-90 font-medium leading-relaxed'>
            {image.caption || <span className='italic opacity-50'>No caption</span>}
          </p>
        </div>
      </div>
    </DialogOverlay>
  );
};
