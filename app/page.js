import { supabase } from '@/lib/supabase'
import DashboardApp from '@/components/DashboardApp'

export const revalidate = 0

export default async function Home() {
  const { data: venues } = await supabase
    .from('venues')
    .select('*')
    .order('name')

  return <DashboardApp venues={venues || []} />
}
