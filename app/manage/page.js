import { supabase } from '@/lib/supabase'
import InventoryApp from '@/components/InventoryApp'

export const revalidate = 0

export default async function ManagePage() {
  const { data: venues } = await supabase
    .from('venues')
    .select('*')
    .order('name')

  return <InventoryApp initialVenues={venues || []} />
}
