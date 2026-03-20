import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  images: { unoptimized: true },
  transpilePackages: ['@homecare/shared-types', '@homecare/shared-utils', '@homecare/supabase-client'],
};
export default nextConfig;
