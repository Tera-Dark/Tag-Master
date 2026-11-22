import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
}

export const ResilientImage: React.FC<ResilientImageProps> = ({
  src,
  alt,
  className = '',
  eager = false,
}) => {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`w-full h-full flex flex-col items-center justify-center p-3 text-center ${className}`}
        style={{
          backgroundColor: 'var(--surface-grouped)',
          color: 'var(--label-tertiary)',
        }}
      >
        <ImageOff className="w-5 h-5 mb-1.5" strokeWidth={1.6} />
        <span className="text-[11px] truncate max-w-full">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
