'use client';

import { useState } from 'react';
import Image, { ImageProps } from 'next/image';

interface SafeImageProps extends ImageProps {
  fallbackText?: string;
}

export default function SafeImage({ src, alt, fallbackText, ...props }: SafeImageProps) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div 
        className={`flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 font-medium ${props.className}`}
        style={{ width: '100%', height: '100%' }}
      >
        {fallbackText || 'Image Unavailable'}
      </div>
    );
  }

  return (
    <Image
      {...props}
      src={src}
      alt={alt}
      onError={() => setError(true)}
    />
  );
}
