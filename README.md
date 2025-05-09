# Salesforce PWAKit + Next.js

A Next.js application with Salesforce PWAKit integration for running on Managed Runtime, using React 19, TypeScript, and PandaCSS for styling. 

---

🚨 **THIS IS A WORK IN PROGRESS. IT IS NOT READY FOR PRODUCTION USE!** 🚨

---

## Features

- React 19 + Next.js 15
- 💥 Custom build process to support Salesforce Managed Runtime (MRT) deployment.

## Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- Salesforce Commerce Cloud account (for MRT deployment)

## Getting Started

### Contentstack ENV

⚠️ You wont have a contentstack .env to work with, so recommend commenting out the `<MegaMenu>` from the homepage. This area is WIP.

### Installation

```bash
npm install
```

### Development

All development happens from root - no need to go into `.pwakit` from here. 

```bash
# Run the development server (from root)
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

### Build

```bash
# Build the PWAKit application (for MRT deployment)
npm run build
```

### Deployment to Salesforce MRT

This needs manual configuration. You can update the `push` script in `.pwakit/package.json` to point to your own project and environment. 

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

## Scripts

- `npm run dev` - Start development server
- `npm run build:next` - Build Next.js application
- `npm run build` - Build complete application with PWAKit for MRT deployment
- `npm run push` - Deploy to development environment on MRT
- `npm run start` - Start production server locally
- `npm run lint` - Run ESLint
- `npm run prepare` - Generate PandaCSS code 
