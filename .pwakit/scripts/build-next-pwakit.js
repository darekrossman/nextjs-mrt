#!/usr/bin/env node

// Clear console at the very beginning for a clean start
if (process.stdout.isTTY) {
  console.clear()
}

const fs = require('node:fs')
const path = require('node:path')
const { promisify } = require('node:util')
const { spawn } = require('node:child_process')

// Parse command line arguments
const args = process.argv.slice(2)
const logLevel = args.includes('--verbose') ? 'verbose' : 'quiet'

// Set up paths
const PWAKIT_DIR = path.resolve(__dirname, '..')

// Import utilities
const { setupTerminalLogger } = require('../utils/terminal-logger')
const { execCommand } = require('../utils/subprocess')
const { parseNpmOutput } = require('../utils/output-parser')
let logger

// Promisify file system operations
const mkdir = promisify(fs.mkdir)
const copyFile = promisify(fs.copyFile)
const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)
const rmdir = promisify(fs.rm)
const rename = promisify(fs.rename)
const _exists = promisify(fs.exists)

// Define paths
const ROOT_DIR = path.resolve(__dirname, '../..')
const _NEXT_APP_DIR = path.join(ROOT_DIR, 'next-app')
const NEXT_BUILD_DIR = path.join(ROOT_DIR, '.next')
const _NEXT_STANDALONE_DIR = path.join(NEXT_BUILD_DIR, 'standalone')
const _NEXT_STATIC_DIR = path.join(NEXT_BUILD_DIR, 'static')
const PUBLIC_DIR = path.join(ROOT_DIR, 'public')
const PWAKIT_BUILD_DIR = path.join(PWAKIT_DIR, 'build')
const PWAKIT_APP_NEXT_DIR = path.join(PWAKIT_DIR, 'app/next')
const PWAKIT_STANDALONE_DIR = path.join(PWAKIT_BUILD_DIR, 'next/standalone')

// SSR files
const ORIGINAL_SSR = path.join(PWAKIT_BUILD_DIR, 'ssr.js')
const STANDALONE_SSR = path.join(PWAKIT_STANDALONE_DIR, 'ssr.js')
const SSR_SHIM = path.join(PWAKIT_DIR, 'app/ssr-shim.js')

// Helper function to execute Next.js build with direct stdout/stderr
function execNextBuild() {
  return new Promise((resolve, reject) => {
    logger.startStep('Building Next.js app')

    const buildProcess = spawn('npm', ['run', 'build:next'], {
      cwd: ROOT_DIR,
      stdio: 'inherit', // Direct console output
      shell: true,
    })

    buildProcess.on('close', (code) => {
      if (code === 0) {
        logger.completeStep(true)
        resolve()
      } else {
        logger.completeStep(false)
        reject(new Error(`Next.js build failed with exit code ${code}`))
      }
    })

    buildProcess.on('error', (error) => {
      logger.completeStep(false)
      reject(error)
    })
  })
}

// Helper function to execute shell commands
async function exec(command, options = {}) {
  logger.verbose(`Executing: ${command}`)

  try {
    // Start status line if specified
    let statusIndex = -1
    if (options.statusMessage) {
      statusIndex = logger.startStep(options.statusMessage)
    }

    // Execute the command and capture output
    const result = await execCommand(
      command,
      {
        cwd: options.cwd || process.cwd(),
        env: { ...process.env, ...(options.env || {}) },
      },
      (_type, data) => {
        // Log verbose output if needed
        if (logLevel === 'verbose') {
          logger.verbose(data.trim())
        }
      },
    )

    // Complete the status line if it was started
    if (statusIndex >= 0) {
      logger.completeStep(true)
    }

    return result
  } catch (error) {
    // Mark status as failed if it was started
    if (options.statusMessage) {
      logger.completeStep(false)
    }

    // Log error details
    logger.error(`Command failed: ${command}`, error)

    // Rethrow if not ignoring errors
    if (!options.ignoreErrors) {
      throw error
    }
  }
}

// Helper function to copy directory recursively
async function copyDir(src, dest) {
  // Check if source exists
  if (!fs.existsSync(src)) {
    logger.warn(`Warning: Source directory ${src} does not exist.`)
    return
  }

  // Ensure destination directory exists
  await mkdir(dest, { recursive: true })

  // Get all files and directories in source
  const entries = fs.readdirSync(src, { withFileTypes: true })

  // Copy each entry
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      // Recursively copy directory
      await copyDir(srcPath, destPath)
    } else {
      // Copy file
      await copyFile(srcPath, destPath)
    }
  }
}

// Helper function to remove directory
async function removeDir(dir) {
  if (fs.existsSync(dir)) {
    await rmdir(dir, { recursive: true, force: true })
  }
}

// Main build function
async function build() {
  try {
    // Clean up any previous build artifacts
    await removeDir(NEXT_BUILD_DIR)

    // Step 1: Install dependencies in .pwakit directory
    logger.startStep('Installing PWAKit dependencies')
    process.chdir(PWAKIT_DIR)
    await exec('npm install')
    logger.completeStep(true)

    // Step 2: Build Next.js app (with direct stdout)
    process.chdir(ROOT_DIR)
    await execNextBuild()

    // Step 3: Copy and rename Next.js build directory
    logger.startStep('Processing build artifacts')
    // Ensure target directory exists and is clean
    await removeDir(path.join(PWAKIT_DIR, 'app/next'))
    await mkdir(path.join(PWAKIT_DIR, 'app'), { recursive: true })

    // Copy .next directory to .pwakit/app/next
    await copyDir(NEXT_BUILD_DIR, path.join(PWAKIT_DIR, 'app/next'))

    // If the standalone/.next directory exists, rename it to standalone/next
    const standaloneNextPath = path.join(PWAKIT_DIR, 'app/next/standalone/.next')
    if (fs.existsSync(standaloneNextPath)) {
      await rename(standaloneNextPath, path.join(PWAKIT_DIR, 'app/next/standalone/next'))
    }
    logger.completeStep(true)

    // Step 4: Copy public folder to standalone directory
    logger.startStep('Copying public assets')
    await copyDir(PUBLIC_DIR, path.join(PWAKIT_APP_NEXT_DIR, 'standalone/public'))
    logger.completeStep(true)

    // Step 5: Build PWA Kit
    logger.startStep('Building PWA Kit')
    process.chdir(PWAKIT_DIR)
    await exec('npm run build:pwakit')
    logger.completeStep(true)

    // Step 6: Prepare standalone
    logger.startStep('Preparing standalone build')

    // 1. Copy standalone and static directories to build directory
    logger.verbose('  - Copying standalone and static to build directory ...')
    // Ensure the target directory exists before copying
    await mkdir(path.join(PWAKIT_BUILD_DIR, 'next'), { recursive: true })

    // Remove potential existing targets to avoid merge issues
    await removeDir(path.join(PWAKIT_BUILD_DIR, 'next/standalone'))
    await removeDir(path.join(PWAKIT_BUILD_DIR, 'next/static'))

    // Copy standalone and static directories
    await copyDir(
      path.join(PWAKIT_APP_NEXT_DIR, 'standalone'),
      path.join(PWAKIT_BUILD_DIR, 'next/standalone'),
    )

    await copyDir(
      path.join(PWAKIT_APP_NEXT_DIR, 'static'),
      path.join(PWAKIT_BUILD_DIR, 'next/static'),
    )

    // 2. Move bundled ssr.js to standalone directory
    if (fs.existsSync(ORIGINAL_SSR)) {
      logger.verbose(`  - Moving ${ORIGINAL_SSR} to ${STANDALONE_SSR} ...`)
      // Ensure the standalone directory exists
      await mkdir(PWAKIT_STANDALONE_DIR, { recursive: true })

      // Copy the file then delete the original
      await copyFile(ORIGINAL_SSR, STANDALONE_SSR)
      fs.unlinkSync(ORIGINAL_SSR)
    } else {
      logger.warn(`  - WARNING: ${ORIGINAL_SSR} not found. Skipping move.`)
    }

    // 3. Create new ssr.js shim in build directory
    logger.verbose('  - Creating shim in build/ssr.js...')
    await copyFile(SSR_SHIM, ORIGINAL_SSR)
    logger.completeStep(true)

    // Step 7: Extract Next.js config and inject it into ssr.js
    logger.startStep('Finalizing configuration')
    const CONFIG_FILE = path.join(
      PWAKIT_BUILD_DIR,
      'next/standalone/next/required-server-files.json',
    )

    if (fs.existsSync(CONFIG_FILE)) {
      logger.verbose(`  - Reading config from ${CONFIG_FILE}`)

      // Read and parse the config file
      const data = JSON.parse(await readFile(CONFIG_FILE, 'utf8'))
      const configJson = JSON.stringify(data.config)

      // Read the shim file
      let ssrShimContent = await readFile(ORIGINAL_SSR, 'utf8')

      // Replace the placeholder with the actual config
      ssrShimContent = ssrShimContent.replace(
        /\/\* -- INSERT NEXT CONFIG HERE -- \*\//,
        `const nextConfig = ${configJson};`,
      )

      // Write the modified content back to the file
      await writeFile(ORIGINAL_SSR, ssrShimContent)
    } else {
      logger.warn(`  - WARNING: ${CONFIG_FILE} not found. Cannot inject Next.js config.`)
    }
    logger.completeStep(true)

    // Return to the root directory at the end of the script
    process.chdir(ROOT_DIR)
  } catch (error) {
    logger.error('Build failed:', error)
    process.exit(1)
  }
}
// Run the build process
;(async () => {
  try {
    // Setup terminal logger first
    logger = await setupTerminalLogger(logLevel)

    // Start the build process
    await build()

    // Display success message
    logger.startStep('Build completed successfully')
    logger.completeStep(true)
  } catch (error) {
    // If logger is not defined yet, use console
    if (!logger) {
      console.error('Uncaught error:', error)
    } else {
      logger.error('Uncaught error:', error)
    }
    process.exit(1)
  }
})()
