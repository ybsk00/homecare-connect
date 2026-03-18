import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@homecare/shared-types',
    '@homecare/shared-utils',
    '@homecare/supabase-client',
  ],
};

export default nextConfig;
