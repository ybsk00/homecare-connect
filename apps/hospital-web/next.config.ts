import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@homecare/shared-types',
    '@homecare/shared-utils',
    '@homecare/supabase-client',
  ],
  outputFileTracingRoot: process.env.VERCEL ? '/vercel/path0' : undefined,
};

export default nextConfig;
