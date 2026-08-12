import { sql } from '@/lib/db'
import DashboardApp from '@/components/DashboardApp'

export const revalidate = 0

export default async function Home() {
  const venues = await sql`SELECT * FROM venues ORDER BY name`
  return <DashboardApp venues={venues || []} />
}
