# Custom Next.js PWAKit Build Process Overview

This document outlines the custom build process used to wrap a Next.js application within PWAKit, preparing it for deployment on the Managed Runtime (MRT). The process involves several key steps, focusing on integrating the Next.js standalone build output with PWAKit's structure and runtime.

## Key Components and Configuration

### 1. `next.config.ts`

The Next.js configuration is essential for preparing the application for the PWAKit environment.

- **`output: 'standalone'`**: During the production build (`PHASE_PRODUCTION_BUILD`), this option is enabled. It creates a `.next/standalone` directory containing only the necessary files to run the Next.js application, including a minimal Node.js server. This is required for creating a lean deployment package for serverless environments like MRT.
- **`compress: false`**: Compression is disabled in the Next.js build because MRT handles asset compression.
- **Experimental Features**: The configuration enables or disables certain Next.js experimental features (e.g., `ppr`, `inlineCss`, `useCache`, `clientSegmentCache`) based on compatibility or performance considerations with MRT.
- **Image Optimization**: Specifies allowed remote patterns for image optimization, ensuring images from designated Salesforce Commerce Cloud domains can be processed.

### 2. The `.pwakit` Directory

This directory is central to PWAKit integration. It contains its own `package.json`, scripts, and configuration files that orchestrate the build and define the PWAKit-specific parts of the application.

- **`.pwakit/package.json`**:
    - Defines scripts like `build: node scripts/build-next-pwakit.js`, which is the primary script for the custom build process.
    - Includes dependencies such as `@salesforce/pwa-kit-dev` and `@salesforce/pwa-kit-runtime`, which provide the tools and runtime for PWAKit.
- **`.pwakit/scripts/build-next-pwakit.js`**: This Node.js script is the engine of the custom build. Its main responsibilities are detailed in the "Build Steps" section below.
- **`.pwakit/app/`**: This directory is the staging area where Next.js build artifacts are combined with PWAKit components.
    - **`.pwakit/app/next/`**: The Next.js build output (`.next` directory) is copied here.
    - **`.pwakit/app/ssr-shim.js`**: A critical shim for server-side rendering, detailed later.
- **`.pwakit/build/`**: This directory serves as the final output location for the PWAKit build, where all assets are prepared for deployment.
    - **`.pwakit/build/next/standalone/`**: Contains the Next.js standalone application, ready to be served by the PWAKit runtime.
    - **`.pwakit/build/next/static/`**: Contains the static assets from the Next.js build.
    - **`.pwakit/build/ssr.js`**: This is PWAKit's main SSR handler after the build process has run (it's initially the `ssr-shim.js` which then points to the actual SSR logic).

### 3. `ssr-shim.js` (located in `.pwakit/app/ssr-shim.js`)

This JavaScript file acts as a bridge between the PWAKit runtime and the Next.js standalone server.

- **Dynamic Configuration Injection**: The `build-next-pwakit.js` script injects the Next.js runtime configuration (extracted from the Next.js build) into this file.
- **`distDir` Modification**: It explicitly sets `nextConfig.distDir = './build/next/standalone/next'`. This directs the Next.js server (which is part of the standalone output) to find its build artifacts within the PWAKit `build` directory structure.
- **Environment Variable**: It sets `process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(nextConfig)`. This environment variable is used by the Next.js standalone server to load its configuration.
- **Delegation**: It then `require`s and exports the actual PWAKit SSR handler, which by this point has been moved into `.pwakit/build/next/standalone/ssr.js`.

### Base ssr.js: Express and Next.js Handler Integration

The `.pwakit/app/ssr.js` file is the core server-side entry point for PWAKit SSR. It sets up an Express server, integrates the PWAKit runtime, and attaches the Next.js request handler, ensuring all incoming requests are properly routed to your Next.js application.

**How the Next.js Handler is Attached:**

1. **PWAKit Runtime Initialization**
   - The file imports and initializes the PWAKit runtime using `getRuntime()` from `@salesforce/pwa-kit-runtime/ssr/server/express`.
   - It creates a handler with `runtime.createHandler(options, (app) => { ... })`, where `app` is an Express application.

2. **Next.js App Setup**
   - Inside the handler callback, it creates a Next.js app instance with `next({ dev: false })`.
   - It prepares the Next.js app (`nextApp.prepare()`) and, once ready, retrieves the Next.js request handler (`nextApp.getRequestHandler()`).

3. **Static Asset Serving**
   - The Express app is configured to serve static files from the `public` directory and Next.js static assets from `build/next/static`.

4. **Universal Route Handling**
   - The Express app uses `app.all('*', async (req, res) => { ... })` to catch all routes.
   - For every request, it parses the URL, awaits the Next.js handler to be ready, and calls the Next.js handler with the request, response, and parsed URL. This ensures all requests (except static assets) are ultimately handled by Next.js, enabling SSR and API routes.

5. **Export**
   - The handler is exported as the module's main export, making it the entry point for SSR in the PWAKit build.

**Summary:**

The base `ssr.js` sets up an Express server using the PWAKit runtime and attaches the Next.js request handler so that all incoming requests are processed by Next.js, enabling full SSR and static asset serving. This integration allows PWAKit to serve a Next.js app seamlessly, with all the benefits of both platforms. This handler is ultimately invoked by the shim in the final build process.

## Build Steps (Orchestrated by `.pwakit/scripts/build-next-pwakit.js`)

The `build-next-pwakit.js` script executes the following sequence:

1.  **Install PWAKit Dependencies**:
    - Runs `npm install` within the `.pwakit` directory to ensure all PWAKit-specific dependencies are available.

2.  **Build Next.js Application**:
    - Executes `npm run build:next` in the project's root directory.
    - This triggers the standard Next.js build process, adhering to the `next.config.ts`, and produces the `standalone` output in `.next/standalone/`.

3.  **Process Next.js Build Artifacts**:
    - The entire contents of the `ROOT_DIR/.next/` directory (output from the Next.js build) are copied to `.pwakit/app/next/`.
    - If `ROOT_DIR/.next/standalone/.next/` exists (which it does due to `output: 'standalone'`), it is renamed to `.pwakit/app/next/standalone/next/`. This aligns the Next.js internal build structure with PWAKit's expectations.

4.  **Copy Public Assets**:
    - The contents of the `ROOT_DIR/public/` directory are copied to `.pwakit/app/next/standalone/public/`. This makes static assets from the Next.js public folder available to the standalone application.

5.  **Build PWAKit**:
    - Changes directory to `.pwakit` and runs `npm run build:pwakit` (which executes `pwa-kit-dev build`).
    - This command compiles PWAKit-specific assets, such as the service worker, and generates an initial `ssr.js` in `.pwakit/build/ssr.js`.

6.  **Prepare Standalone Build for PWAKit**: This stage reorganizes files into the final `.pwakit/build/` directory:
    - The Next.js standalone application from `.pwakit/app/next/standalone/` is copied to `.pwakit/build/next/standalone/`.
    - The Next.js static assets from `.pwakit/app/next/static/` are copied to `.pwakit/build/next/static/`.
    - **SSR Handler Relocation**: The `ssr.js` generated by the PWAKit build (at `.pwakit/build/ssr.js`) is moved to `.pwakit/build/next/standalone/ssr.js`. This places PWAKit's request handler alongside the Next.js standalone server files.
    - **SSR Shim Placement**: The `ssr-shim.js` (from `.pwakit/app/ssr-shim.js`) is copied to `.pwakit/build/ssr.js`. This shim becomes the new entry point for SSR in the PWAKit build.

7.  **Finalize Configuration**:
    - The script extracts the Next.js runtime configuration.
    - This configuration is then injected into the `ssr-shim.js` (now located at `.pwakit/build/ssr.js`) at the placeholder `/* -- INSERT NEXT CONFIG HERE -- */`.

## How it All Works Together (SSR Flow)

1.  When a request hits the MRT, it is handled by the PWAKit runtime.
2.  The PWAKit runtime uses its main SSR entry point, which is now the `ssr-shim.js` located at `.pwakit/build/ssr.js`.
3.  The `ssr-shim.js`:
    - Injects and applies the Next.js runtime configuration.
    - Sets `nextConfig.distDir` to point to the correct location of the Next.js build files within the PWAKit structure (`./build/next/standalone/next`).
    - It then `require`s and delegates the request to the actual PWAKit SSR handler, which was previously moved to `.pwakit/build/next/standalone/ssr.js`.
4.  This PWAKit SSR handler, now running in the context of the Next.js standalone build and correctly configured by the shim, utilizes the Next.js rendering engine to serve pages.

This process ensures that the Next.js application, built in its standalone mode, is effectively served and managed by the PWAKit runtime environment, leveraging the strengths of both platforms for deployment on MRT. 