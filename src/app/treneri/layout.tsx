import { publicPageMetadata } from '@/lib/page-metadata'

export const metadata = publicPageMetadata('Treneri', 'Individualno powerlifting trenerstvo u Zagrebu: program po mjeri, analiza tehnike i priprema za natjecanja uz trenere Waltera Smajlovića, Petra Rendulića, Kristiana Loveya i Ivana Petričeka.', '/treneri')

export default function CoachesLayout({ children }: { children: React.ReactNode }) {
  return children
}