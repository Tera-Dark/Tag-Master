import React, { useState, useEffect } from 'react';
import { ImageIcon } from './Icons';

const thumbnailCache = new Map<string, string>();

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

        // Check cache first (using file name + size + lastModified as key)
        const key = `${file.name}-${file.size}-${file.lastModified}`;
        if (thumbnailCache.has(key)) {
            setThumbUrl(thumbnailCache.get(key)!);
            return;
        }

        let isActive = true;

        const generateThumbnail = async () => {
            try {
                // Create a bitmap, resizing it to 300px width (good balance for grid/list)
                // Note: resizeWidth is supported in modern browsers (Chrome/Edge/Firefox)
                const bitmap = await createImageBitmap(file, { resizeWidth: 300 });

                if (!isActive) {
                    bitmap.close();
                    return;
                }

                const canvas = document.createElement('canvas');
                canvas.width = bitmap.width;
                canvas.height = bitmap.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) throw new Error('No context');

                ctx.drawImage(bitmap, 0, 0);
                bitmap.close();

                canvas.toBlob((blob) => {
                    if (!blob || !isActive) return;
                    const objectUrl = URL.createObjectURL(blob);
                    thumbnailCache.set(key, objectUrl);
                    setThumbUrl(objectUrl);
                }, 'image/jpeg', 0.7);

            } catch (e) {
                console.warn("Thumbnail generation failed, falling back to full URL", e);
                // If generation fails (e.g. file type not supported for bitmap), fallback to original URL
                setThumbUrl(url || URL.createObjectURL(file));
            }
        };

        generateThumbnail();

        return () => {
            isActive = false;
        };
    }, [file, url]);

    if (!thumbUrl) {
        return (
            <div className={`flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-400 ${className}`}>
                <ImageIcon className="w-8 h-8" />
            </div>
        );
    }

    return (
        <img
            src={thumbUrl}
            alt={file?.name || 'thumbnail'}
            className={className}
            loading="lazy"
            decoding="async"
        />
    );
};
