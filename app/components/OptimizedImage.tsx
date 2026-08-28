'use client'

import Image from "next/image"

type OptimizedImageProps = {
  src: string
  alt: string
  sizes: string
  className?: string
  priority?: boolean
  onError?: () => void
}

export function OptimizedImage({
  src,
  alt,
  sizes,
  className,
  priority = false,
  onError,
}: OptimizedImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      loading={priority ? "eager" : "lazy"}
      unoptimized={src.startsWith("data:") || src.startsWith("/api/media/")}
      className={className}
      onError={onError}
    />
  )
}
