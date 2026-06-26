'use client'
import { useEffect } from 'react'

export function CapacitorDetect() {
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform()) {
      document.documentElement.classList.add('is-native')
    }
  }, [])
  return null
}
