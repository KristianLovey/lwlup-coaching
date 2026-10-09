import { publicPageMetadata } from '@/lib/page-metadata'

export const metadata = publicPageMetadata('Kalendar natjecanja', 'Kalendar powerlifting natjecanja LWL UP kluba sa zagrebačkog područja: nadolazeći nastupi, završena natjecanja i rezultati naših liftera.', '/competitions')

export default function CompetitionsLayout({ children }: { children: React.ReactNode }) {
  return children
}