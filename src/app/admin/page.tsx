import AdminOS from './admin-os'
import { privatePageMetadata } from '@/lib/page-metadata'

export const metadata = privatePageMetadata('Admin')

export default function AdminPage() {
  return <AdminOS />
}
