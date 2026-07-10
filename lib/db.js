import { getCloudflareContext } from '@opennextjs/cloudflare'

// Returns the D1 database binding ("DB") declared in wrangler.toml.
// Works both when deployed to Cloudflare Workers and during `next dev`
// (via initOpenNextCloudflareForDev() wired up in next.config.js).
export async function getDB() {
  const { env } = await getCloudflareContext({ async: true })
  const db = env.DB
  if (!db) throw new Error('Missing D1 binding "DB" — check wrangler.toml')
  return db
}
