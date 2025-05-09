const path = require('node:path')

/* -- INSERT NEXT CONFIG HERE -- */

nextConfig.distDir = './build/next/standalone/next'
process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(nextConfig)

const targetPath = path.join(__dirname, 'next/standalone/ssr.js')

try {
  module.exports = require(targetPath)
} catch (error) {
  console.error('Failed to require target module:', error)
  process.exit(1)
}
