import { publicPageMetadata } from '@/lib/page-metadata'

export const metadata = publicPageMetadata('Državni rekordi powerliftinga', 'Državni rekordi u powerliftingu po težinskim i dobnim kategorijama: čučanj, bench press, mrtvo dizanje i total, za muškarce i žene.', '/records')

export default function RecordsLayout({ children }: { children: React.ReactNode }) {
  return children
}