import { UiHosts } from '@/components/ui/ui-hosts'
import { privatePageMetadata } from '@/lib/page-metadata'

export const metadata = privatePageMetadata('Trening')

export default function TrainingLayout({ children }: { children: React.ReactNode }) {
  // .lwl-panel (globals.css): brand font panela, bez utjecaja na layout
  return <div className="lwl-panel">{children}<UiHosts /></div>
}
