import { privatePageMetadata } from '@/lib/page-metadata'

export const metadata = privatePageMetadata('Prijava')

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children
}
