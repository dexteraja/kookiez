"use client";

import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/Skeleton";

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  loading?: "eager" | "lazy";
  fallbackText?: string;
}

export default function LazyImage({
  src,
  alt,
  className = "",
  imageClassName = "",
  loading = "lazy",
  fallbackText = "Gambar tidak tersedia",
}: LazyImageProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const isLoaded = loadedSrc === src;
  const hasFailed = failedSrc === src;

  useEffect(() => {
    const image = imageRef.current;
    if (!image?.complete) return;
    if (image.naturalWidth > 0) setLoadedSrc(src);
    else setFailedSrc(src);
  }, [src]);

  return (
    <div className={`relative overflow-hidden ${className}`} aria-busy={!isLoaded && !hasFailed}>
      {!isLoaded && !hasFailed && (
        <Skeleton className="h-full w-full !rounded-none" />
      )}
      {!hasFailed ? (
        <img
          key={src}
          ref={imageRef}
          src={src}
          alt={alt}
          loading={loading}
          decoding="async"
          onLoad={() => setLoadedSrc(src)}
          onError={() => setFailedSrc(src)}
          className={`absolute inset-0 transition-opacity duration-200 ${
            isLoaded ? "opacity-100" : "opacity-0"
          } ${imageClassName}`}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-ink/[0.04] px-3 text-center text-xs text-muted">
          {fallbackText}
        </div>
      )}
    </div>
  );
}
