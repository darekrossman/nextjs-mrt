/**
 * Subprocess execution utilities with output capture
 */
const { spawn } = require('node:child_process')

/**
 * Execute a command and capture its output
 * @param {string} command - Command to execute
 * @param {Object} options - Execution options
 * @param {Function} onData - Callback for data events
 * @returns {Promise<Object>} - Command result with stdout, stderr, and exit code
 */
function execCommand(command, options = {}, onData = null) {
  return new Promise((resolve, reject) => {
    // Environment setup
    const env = { ...process.env, ...(options.env || {}) }

    // Spawn the process with shell: true to handle complex commands better
    const proc = spawn(command, [], {
      cwd: options.cwd || process.cwd(),
      env,
      shell: true,
    })

    let stdout = ''
    let stderr = ''

    // Capture stdout
    proc.stdout.on('data', (data) => {
      const output = data.toString()
      stdout += output

      if (onData) {
        onData('stdout', output)
      }
    })

    // Capture stderr
    proc.stderr.on('data', (data) => {
      const output = data.toString()
      stderr += output

      if (onData) {
        onData('stderr', output)
      }
    })

    // Handle process completion
    proc.on('close', (code) => {
      if (code === 0 || options.ignoreExitCode) {
        resolve({ stdout, stderr, code })
      } else {
        const error = new Error(`Command failed with exit code ${code}`)
        error.stdout = stdout
        error.stderr = stderr
        error.code = code
        reject(error)
      }
    })

    // Handle process errors
    proc.on('error', (error) => {
      error.stdout = stdout
      error.stderr = stderr
      reject(error)
    })
  })
}

module.exports = {
  execCommand,
}
