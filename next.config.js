/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['http://10.206.1.175:3000'],
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [390, 640, 828, 1080, 1280, 1440, 1920],
    imageSizes: [48, 96, 128, 256],
    qualities: [40, 50, 65, 75],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', '@supabase/supabase-js'],
  },
}

module.exports = nextConfig