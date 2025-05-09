/**
 * Output parser for build process logs
 */

/**
 * Extract Next.js build progress information from output
 * @param {string} output - Build output text
 * @returns {Object} - Extracted build status information
 */
function parseNextjsBuildOutput(output) {
  const result = {
    compilationStatus: null,
    lintingStatus: null,
    pageDataStatus: null,
    staticPagesStatus: null,
    buildTracesStatus: null,
    optimizationStatus: null,
    extractedTime: null,
  }

  // Extract timestamp if available
  const timeMatch = output.match(/Extracted in \(([0-9.]+)ms\)/)
  if (timeMatch) {
    result.extractedTime = timeMatch[1]
  }

  // Check for compilation status
  if (output.includes('Compiled successfully') || output.includes('Compiled successfully in')) {
    result.compilationStatus = 'success'

    // Extract compilation time if available
    const compileTimeMatch = output.match(/Compiled successfully in ([0-9.]+)s/)
    if (compileTimeMatch) {
      result.compilationTime = compileTimeMatch[1]
    }
  } else if (output.includes('Failed to compile')) {
    result.compilationStatus = 'error'
  }

  // Check for linting status
  if (output.includes('Linting and checking validity of types')) {
    result.lintingStatus = 'running'
  } else if (output.match(/✓.*Linting and checking validity of types/)) {
    result.lintingStatus = 'success'
  }

  // Check for page data collection
  if (output.includes('Collecting page data')) {
    result.pageDataStatus = 'running'
  } else if (output.match(/✓.*Collecting page data/)) {
    result.pageDataStatus = 'success'
  }

  // Check for static page generation
  if (
    output.match(/Generating static pages/) ||
    output.match(/Generating static pages \(\d+\/\d+\)/)
  ) {
    const match = output.match(/Generating static pages \((\d+)\/(\d+)\)/)
    if (match) {
      result.staticPagesStatus = {
        status: 'running',
        current: Number.parseInt(match[1], 10),
        total: Number.parseInt(match[2], 10),
      }
    } else {
      result.staticPagesStatus = { status: 'running' }
    }
  } else if (output.match(/✓.*Generating static pages/)) {
    result.staticPagesStatus = { status: 'success' }
  }

  // Check for build traces collection
  if (output.includes('Collecting build traces')) {
    result.buildTracesStatus = 'running'
  } else if (output.match(/✓.*Collecting build traces/)) {
    result.buildTracesStatus = 'success'
  }

  // Check for optimization status
  if (output.includes('Finalizing page optimization')) {
    result.optimizationStatus = 'running'
  } else if (output.match(/✓.*Finalizing page optimization/)) {
    result.optimizationStatus = 'success'
  }

  return result
}

/**
 * Extract NPM installation progress from output
 * @param {string} output - NPM output text
 * @returns {Object} - Extracted npm status information
 */
function parseNpmOutput(output) {
  const result = {
    installStatus: null,
    addedPackages: [],
  }

  // Check for npm installation status
  if (output.includes('added') && output.includes('packages')) {
    result.installStatus = 'success'

    // Extract added packages
    const addedPackagesMatch = output.match(/added (\d+) packages/)
    if (addedPackagesMatch) {
      result.addedPackages.count = Number.parseInt(addedPackagesMatch[1], 10)
    }
  }

  return result
}

module.exports = {
  parseNextjsBuildOutput,
  parseNpmOutput,
}
