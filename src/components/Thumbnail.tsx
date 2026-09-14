import React, { useState, useEffect } from 'react';
import { ImageIcon } from './Icons';

// File identity avoids collisions and lets GC collect removed files and thumbnails.
const thumbnailCache = new WeakMap<File, Promise<Blob>>();

const getThumbnail = (file: File): Promise<Blob> => {
  const cached = thumbnailCache.get(file);
  if (cached) return cached;
  const pending = (async () => {
    const bitmap = await createImageBitmap(file, { resizeWidth: 300 });
    try {
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No canvas context');
      ctx.drawImage(bitmap, 0, 0);
      return await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('Empty thumbnail'))),
          'image/webp',
          0.75
        );
      });
    } finally {
      bitmap.close();
    }
  })();
  thumbnailCache.set(file, pending);
  void pending.catch(() => thumbnailCache.delete(file));
  return pending;
};

interface ThumbnailProps {
  file?: File;
  url?: string; // Fallback or original URL
  className?: string;
}

export const Thumbnail: React.FC<ThumbnailProps> = ({ file, url, className }) => {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setThumbUrl(url || null);
      return;
    }

    let isActive = true;
    let ownedUrl: string | undefined;
    setThumbUrl(null);
    void getThumbnail(file)
      .then((blob) => {
        if (!isActive) return;
        ownedUrl = URL.createObjectURL(blob);
        setThumbUrl(ownedUrl);
      })
      .catch(() => {
        if (!isActive) return;
        if (url) setThumbUrl(url);
        else {
          ownedUrl = URL.createObjectURL(file);
          setThumbUrl(ownedUrl);
        }
      });
    return () => {
      isActive = false;
      if (ownedUrl) URL.revokeObjectURL(ownedUrl);
    };
  }, [file, url]);

  if (!thumbUrl) {
    return (
      <div
        className={`flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-tm-subtle ${className}`}
      >
        <ImageIcon className='w-8 h-8' />
      </div>
    );
  }

  return (
    <img
      src={thumbUrl}
      alt={file?.name || 'thumbnail'}
      className={className}
      loading='lazy'
      decoding='async'
    />
  );
};
