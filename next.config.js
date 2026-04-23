/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['http://10.206.1.175:3000'],
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [390, 640, 828, 1080, 1280, 1920],
    imageSizes: [48, 96, 128, 256],
  },
}

module.exports = nextConfig