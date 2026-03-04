'use client';

import { useState } from 'react';
import Image, { ImageProps } from 'next/image';

interface SafeImageProps extends ImageProps {
  fallbackSrc?: ImageProps['src'];
  fallbackText?: string;
}

function getSourceKey(source: ImageProps['src']) {
  if (typeof source === 'string') return source;

  const candidate = source as { src?: string; default?: { src?: string } | string };
  if (typeof candidate.src === 'string') return candidate.src;
  if (typeof candidate.default === 'string') return candidate.default;
  if (candidate.default && typeof candidate.default === 'object' && typeof candidate.default.src === 'string') {
    return candidate.default.src;
  }

  return JSON.stringify(source);
}

export default function SafeImage({ src, alt, fallbackSrc, fallbackText, ...props }: SafeImageProps) {
  const sourceKey = getSourceKey(src);
  const [failedPrimaryBySource, setFailedPrimaryBySource] = useState<Record<string, boolean>>({});
  const [failedFallbackBySource, setFailedFallbackBySource] = useState<Record<string, boolean>>({});

  const primaryFailed = Boolean(failedPrimaryBySource[sourceKey]);
  const fallbackFailed = Boolean(failedFallbackBySource[sourceKey]);
  const hasFallback = Boolean(fallbackSrc);
  const shouldUseFallback = hasFallback && primaryFailed && !fallbackFailed;
  const hasError = primaryFailed && (!hasFallback || fallbackFailed);
  const displaySrc = shouldUseFallback && fallbackSrc ? fallbackSrc : src;

  const handleError = () => {
    if (!primaryFailed) {
      setFailedPrimaryBySource(current => ({ ...current, [sourceKey]: true }));
      return;
    }

    if (hasFallback && !fallbackFailed) {
      setFailedFallbackBySource(current => ({ ...current, [sourceKey]: true }));
    }
  };

  if (hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 font-medium ${props.className}`}
        style={{ width: '100%', height: '100%' }}
      >
        {fallbackText || 'EvoFutura'}
      </div>
    );
  }

  return (
    <Image
      {...props}
      src={displaySrc}
      alt={alt}
      onError={handleError}
    />
  );
}
