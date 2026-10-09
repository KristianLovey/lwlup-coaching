import { privatePageMetadata } from '@/lib/page-metadata'

export const metadata = privatePageMetadata('Moj profil')

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children
}
