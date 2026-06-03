import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,       // 10% performance traces u produkciji
  replaysSessionSampleRate: 0, // bez session replay po defaultu
  replaysOnErrorSampleRate: 1, // replay samo kad dođe do greške
  integrations: [
    Sentry.replayIntegration(),
  ],
  beforeSend(event) {
    // Ne šalji greške u dev modu
    if (process.env.NODE_ENV === 'development') return null
    return event
  },
})
