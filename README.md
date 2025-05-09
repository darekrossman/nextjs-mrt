# Salesforce PWAKit + Next.js

A Next.js + Salesforce [e-commerce reference application](https://github.com/vercel-partner-solutions/nextjs-salesforce-commerce-cloud) with PWAKit integration for running on Managed Runtime.

---

🚨 **THIS IS A WORK IN PROGRESS. IT IS NOT READY FOR PRODUCTION USE!** 🚨

---

## Features

- React 19 + Next.js 15
- Tailwind CSS for styling
- Biome for linting and formatting
- 💥 Custom build process to support Salesforce Managed Runtime (MRT) deployment.

## Prerequisites

- Salesforce Commerce Cloud account (for MRT deployment)

## Getting Started

### Installation

```bash
npm install
```

### Development

All development happens from root - no need to go into `.pwakit` from here. 

```bash
# Run the development server
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

### Build

```bash
# Build the PWAKit application (for MRT deployment)
npm run build
```

### Deployment to Salesforce MRT

The `push` script will use your `MRT_PROJECT_SLUG` and `MRT_TARGET_ENV` when publishing to MRT. See `.pwakit/package.json` to customize.

```bash
# Deploy to development environment on MRT
npm run push
```

To view logs from your MRT deployment:
```bash
cd .pwakit && npm run logs
```

## Salesforce Managed Runtime (MRT) Integration

This project uses Salesforce's PWA Kit and Managed Runtime (MRT) environment to deploy and host the Next.js application:

- The `.pwakit/` directory contains configuration files and build scripts specific to MRT deployment
- The build process (`npm run build`) adapts the Next.js output for MRT compatibility

When deploying to MRT:
1. The build process compiles the Next.js application
2. PWAKit tools package and prepare the application for MRT
3. The application is deployed to your Salesforce Commerce Cloud project space
4. MRT handles the serving, scaling, and infrastructure management

## Streaming Limitations with MRT

While this project leverages React Server Components for improved performance and server-side rendering capabilities, it's important to note a specific limitation when deploying to Salesforce Managed Runtime (MRT).

Features that rely on HTTP streaming, such as React's `<Suspense />` component and Next.js's `loading.tsx` file convention, will not stream in the MRT environment. Instead, these features will fall back to traditional blocking request behavior. This means that while you can still use these patterns in your code, the incremental rendering benefits of streaming will not be realized on MRT. Despite this, the use of React Server Components still provides significant advantages in terms of bundle size reduction and server-driven UI.

## Scripts

- `npm run dev` - Start development server
- `npm run build:next` - Build Next.js application
- `npm run build` - Build complete application with PWAKit for MRT deployment
- `npm run push` - Deploy to development environment on MRT
- `npm run start` - Start production server locally
- `npm run lint` - Run Biome to check and fix code
- `npm run env:push` - Push local .env.local to MRT environment
- `npm run env:pull` - Pull MRT environment variables to .env.local (must be deployed to MRT first)
