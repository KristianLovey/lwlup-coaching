import { publicPageMetadata } from '@/lib/page-metadata'

export const metadata = publicPageMetadata('Prijava i učlanjenje u klub', 'Prijavi se za individualni powerlifting program ili učlanjenje u LWL UP klub. Treniramo i natječemo se u Zagrebu i okolici.', '/survey')

export default function SurveyLayout({ children }: { children: React.ReactNode }) {
  return children
}