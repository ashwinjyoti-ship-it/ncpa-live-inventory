/** @type {import('next').NextConfig} */
const nextConfig = {}

export default nextConfig

// Enables local access to Cloudflare bindings (like the D1 "DB" binding)
// when running `next dev`, using the same wrangler.toml config used for
// deployment.
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'
initOpenNextCloudflareForDev()
