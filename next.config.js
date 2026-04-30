/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['http://10.206.1.175:3000'],
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [390, 640, 828, 1080, 1280, 1440, 1920],
    imageSizes: [48, 96, 128, 256],
    qualities: [40, 50, 65, 75],
    minimumCacheTTL: 2592000, // 30 dana
  },
  experimental: {
    optimizePackageImports: ['lucide-react', '@supabase/supabase-js'],
  },
  async headers() {
    return [
      {
        // Originalne slike u /slike/ — immutable (mijenjaju se rijetko)
        source: '/slike/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Next.js statički bundle (JS, CSS, fontovi) — immutable po defaultu, eksplicitno postavljeno
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Next.js optimizirane slike
        source: '/_next/image(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=2592000, stale-while-revalidate=86400' },
        ],
      },
      {
        // Favicon i ikone
        source: '/(favicon.ico|icon.png|apple-touch-icon.png)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400' },
        ],
      },
    ]
  },
}

module.exports = nextConfig