import { sql } from '@/lib/db'
import InventoryApp from '@/components/InventoryApp'

export const revalidate = 0

export default async function ManagePage() {
  const venues = await sql`SELECT * FROM venues ORDER BY name`
  return <InventoryApp initialVenues={venues || []} />
}
