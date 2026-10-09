import AdminOS from '../admin/admin-os'
import { privatePageMetadata } from '@/lib/page-metadata'

export const metadata = privatePageMetadata('Trenerski panel')

export default function TrainerPage() {
  return <AdminOS role="trener" />
}
