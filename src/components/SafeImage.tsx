'use client'
import { useState } from 'react'
import Image, { type ImageProps } from 'next/image'

interface SafeImageProps extends Omit<ImageProps, 'onError'> {
  fallbackSrc?: string
  fallbackText?: string
}

export function SafeImage({ fallbackSrc, fallbackText = '?', alt, ...props }: SafeImageProps) {
  const [errored, setErrored] = useState(false)

  if (errored) {
    if (fallbackSrc) {
      return <Image {...props} alt={alt} src={fallbackSrc} onError={() => {}} />
    }
    // Generic placeholder — same size as original image
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.2)',
        fontSize: '1.2rem', fontFamily: 'var(--fm)',
        width: props.width ? `${props.width}px` : '100%',
        height: props.height ? `${props.height}px` : '100%',
        borderRadius: '8px',
      }}>
        {fallbackText}
      </div>
    )
  }

  return <Image {...props} alt={alt} onError={() => setErrored(true)} />
}

// For plain <img> tags
export function SafeImg({ src, alt = '', fallbackText = '?', style, className }: {
  src: string; alt?: string; fallbackText?: string
  style?: React.CSSProperties; className?: string
}) {
  const [errored, setErrored] = useState(false)

  if (errored) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.2)', fontSize: '0.8rem', borderRadius: '6px', ...style }} className={className}>
        {fallbackText}
      </div>
    )
  }

  return <img src={src} alt={alt} style={style} className={className} onError={() => setErrored(true)} />
}
