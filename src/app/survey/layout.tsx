import { publicPageMetadata } from '@/lib/page-metadata'

export const metadata = publicPageMetadata('Prijava za coaching', 'Prijavite se za individualni powerlifting coaching i trening u LWL UP klubu.', '/survey')

export default function SurveyLayout({ children }: { children: React.ReactNode }) {
  return children
}