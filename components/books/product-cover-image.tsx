'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ImageIcon } from 'lucide-react';

interface ProductCoverImageProps {
  src?: string | null;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function ProductCoverImage({
  src,
  alt,
  fill,
  width,
  height,
  sizes,
  priority,
  className,
  style,
}: ProductCoverImageProps) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (src) {
      const timer = setTimeout(() => setLoaded(true), 150);
      return () => clearTimeout(timer);
    }
  }, [src]);

  const hasImage = Boolean(src && src !== 'null' && !error);

  if (!hasImage) {
    return (
      <div 
        className={className} 
        style={{ 
          ...style,
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          backgroundColor: 'var(--cream)',
          color: 'var(--muted)',
          border: '1px solid var(--line)'
        }}
      >
        <ImageIcon size={32} opacity={0.3} />
      </div>
    );
  }

  return (
    <Image
      src={src!}
      alt={alt}
      fill={fill}
      width={width}
      height={height}
      sizes={sizes}
      priority={priority}
      className={`${className || ''} product-cover-fade`}
      style={{
        ...style,
        opacity: loaded ? 1 : 0,
        transition: 'opacity 0.4s ease-out',
      }}
      onLoad={() => setLoaded(true)}
      onLoadingComplete={() => setLoaded(true)} // For older Next versions compatibility
      onError={() => setError(true)}
    />
  );
}
