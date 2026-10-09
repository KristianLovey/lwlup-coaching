import { publicPageMetadata } from '@/lib/page-metadata'

export const metadata = publicPageMetadata('Tim i natjecatelji', 'Upoznajte natjecatelje LWL UP powerlifting kluba sa zagrebačkog područja: kategorije, najbolji totali i GLP bodovi naših liftera.', '/team')

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return children
}