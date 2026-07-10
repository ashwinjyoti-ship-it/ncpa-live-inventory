import { getDB } from '@/lib/db'
import DashboardApp from '@/components/DashboardApp'

export const revalidate = 0
export const dynamic = 'force-dynamic'

export default async function Home() {
  const db = await getDB()
  const { results: venues } = await db.prepare('SELECT * FROM venues ORDER BY name').all()

  return <DashboardApp venues={venues || []} />
}
