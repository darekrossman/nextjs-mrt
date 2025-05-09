const config = require('@salesforce/pwa-kit-dev/configs/webpack/config')

const ssrConfig = config.find((config) => config.name === 'ssr')

if (ssrConfig) {
  // Prevent 'next' from being included in the SSR bundle.
  if (!ssrConfig.externals) {
    ssrConfig.externals = { next: 'commonjs next' }
  }
} else {
  console.warn('Could not find SSR webpack configuration to modify.')
}

// Return the SSR config only, since its the only bundle we need.
module.exports = [ssrConfig]
