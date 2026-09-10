// TODO Sentry: npm install @sentry/nextjs, pa dodaj DSN u .env.local i odkomentiraj
// const { withSentryConfig } = require('@sentry/nextjs')

// Sigurnosni headeri za sve rute (clickjacking, MIME sniffing, referrer, HSTS)
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=15552000; includeSubDomains' },
]

// `next dev` → 'development', `next build` / `next start` / Vercel → 'production'
const isProd = process.env.NODE_ENV === 'production'

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
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
        // Sigurnosni headeri — sve rute
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        // Originalne slike u /slike/ — immutable (mijenjaju se rijetko)
        source: '/slike/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Samo u produkciji. U devu Turbopack zadržava ISTO ime chunka nakon izmjene,
      // pa "immutable" tjera preglednik da godinu dana vrti stari JS → hydration
      // greške (stari tekst u pregledniku, novi sa servera). Next na to i upozorava.
      // U produkciji su imena hashirana po sadržaju, pa je immutable tamo ispravan.
      ...(isProd ? [
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
      ] : []),
      // PRIVREMENO, samo dev: dok su gornja pravila vrijedila i u devu, preglednik je
      // spremio JS kao "immutable" na godinu dana i više ga ne provjerava. Ovo mu kaže
      // da obriše HTTP keš za localhost (cookieji i localStorage ostaju). Maknuti čim
      // stare kopije nestanu — inače se keš briše pri svakom otvaranju stranice.
      ...(!isProd ? [
        {
          source: '/:path((?!_next|api).*)',
          headers: [{ key: 'Clear-Site-Data', value: '"cache"' }],
        },
      ] : []),
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

// After installing Sentry, replace the line above with:
// module.exports = withSentryConfig(nextConfig, {
//   org: 'lwlup',
//   project: 'lwlup-coaching',
//   silent: true,
//   widenClientFileUpload: true,
//   hideSourceMaps: true,
//   disableLogger: true,
// })

module.exports = nextConfig