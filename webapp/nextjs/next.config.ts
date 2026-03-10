import { loadEnvConfig } from '@next/env';
import path from 'path';
import type { NextConfig } from 'next';

loadEnvConfig(path.resolve(__dirname, '..'));

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
