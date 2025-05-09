import type { NextConfig } from 'next'
import { PHASE_PRODUCTION_BUILD } from 'next/constants'

const nextConfig = (phase: string): NextConfig => {
  // Common configuration for all phases
  const commonConfig: NextConfig = {
    experimental: {
      ppr: false, // dont even try it
      inlineCss: true,
      useCache: true, // doesn't hurt, but no-go on MRT
      clientSegmentCache: true,
    },
    images: {
      formats: ['image/avif', 'image/webp'],
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'zylq-002.dx.commercecloud.salesforce.com',
        },
        {
          protocol: 'https',
          hostname: 'edge.disstg.commercecloud.salesforce.com',
        },
      ],
    },
  }

  // Only apply these settings during production build
  if (phase === PHASE_PRODUCTION_BUILD) {
    // DO NOT CHANGE THESE! This is specifically meant for MRT deployment.
    return {
      ...commonConfig,
      output: 'standalone', // Create a standalone build for MRT's serverless environment.
      compress: false, // MRT will compress the files for us.
    }
  }

  return commonConfig
}

export default nextConfig
