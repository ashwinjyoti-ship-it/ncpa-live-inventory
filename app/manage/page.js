import { getDB } from '@/lib/db'
import InventoryApp from '@/components/InventoryApp'

export const revalidate = 0
export const dynamic = 'force-dynamic'

export default async function ManagePage() {
  const db = await getDB()
  const { results: venues } = await db.prepare('SELECT * FROM venues ORDER BY name').all()

  return <InventoryApp initialVenues={venues || []} />
}
