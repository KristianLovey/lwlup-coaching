import { publicPageMetadata } from '@/lib/page-metadata'

export const metadata = publicPageMetadata('Treneri', 'Treneri LWL UP powerlifting kluba sa zagrebačkog područja, predvođeni glavnim trenerom Walterom Smajlovićem. Profili trenera uskoro.', '/treneri')

export default function CoachesLayout({ children }: { children: React.ReactNode }) {
  return children
}