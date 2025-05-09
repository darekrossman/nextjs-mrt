/**
 * Terminal Logger utility for PWA Kit Next.js Build Process
 * Provides dynamic terminal output with updatable status lines
 */
const winston = require('winston')
const readline = require('node:readline')
const chalk = require('chalk')
const fs = require('node:fs')
const path = require('node:path')

// Store the current status lines - these need to be reset with each new logger instance
let statusLines = []
let currentStep = 0

/**
 * Reset the terminal logger state
 */
function resetState() {
  statusLines = []
  currentStep = 0
}

/**
 * Creates a terminal logger that can update lines dynamically
 * @param {string} level - Log level ('verbose' or 'quiet')
 * @returns {Object} - Terminal logger instance
 */
function createTerminalLogger(level = 'quiet') {
  // Reset state to avoid leaking state between runs
  resetState()

  // Ensure logs directory exists
  const logsDir = path.resolve(__dirname, '../../.pwakit/.logs')
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true })
  }

  // Create winston logger for file logging
  const logger = winston.createLogger({
    level: level === 'verbose' ? 'verbose' : 'info',
    format: winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss',
      }),
      winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`),
    ),
    transports: [
      new winston.transports.File({
        filename: path.join(logsDir, 'build.log'),
        options: { flags: 'w' }, // Overwrite the file on each run
      }),
    ],
  })

  // Clear the terminal and initialize status lines
  if (process.stdout.isTTY) {
    console.clear()
  }

  // Utility to update the terminal display
  const updateTerminal = () => {
    if (!process.stdout.isTTY) return

    // Clear the terminal area where status lines are displayed
    statusLines.forEach(() => {
      readline.moveCursor(process.stdout, 0, -1)
      readline.clearLine(process.stdout, 0)
    })

    // Redraw all status lines
    statusLines.forEach((line, _index) => {
      let prefix = ' '
      if (line.status === 'running') {
        prefix = chalk.yellow('⟳')
      } else if (line.status === 'success') {
        prefix = chalk.green('✓')
      } else if (line.status === 'error') {
        prefix = chalk.red('✗')
      }

      console.log(`${prefix} ${line.message}`)
    })
  }

  // Add a new status line
  const addStatusLine = (message) => {
    statusLines.push({ message, status: 'pending' })
    console.log(`  ${message}`)
    return statusLines.length - 1
  }

  // Update a status line
  const updateStatusLine = (index, status, message) => {
    if (index >= 0 && index < statusLines.length) {
      statusLines[index].status = status
      if (message) {
        statusLines[index].message = message
      }
      updateTerminal()
    }
  }

  // Start a new step
  const startStep = (message) => {
    if (currentStep < statusLines.length) {
      updateStatusLine(currentStep, 'success')
    }
    currentStep = addStatusLine(message)
    updateStatusLine(currentStep, 'running')

    // Log to file
    logger.info(`Started: ${message}`)

    return currentStep
  }

  // Complete the current step
  const completeStep = (success, message) => {
    updateStatusLine(currentStep, success ? 'success' : 'error', message)

    // Log to file
    if (success) {
      logger.info(`Completed: ${statusLines[currentStep].message}`)
    } else {
      logger.error(`Failed: ${statusLines[currentStep].message}`)
    }
  }

  // Create the terminal logger instance
  const terminalLogger = {
    startStep,
    completeStep,
    addStatusLine,
    updateStatusLine,
    resetState,

    // Standard logging methods that also log to file
    info: (message) => {
      logger.info(message)
      if (level === 'verbose') {
        console.log(chalk.green(`info: ${message}`))
      }
    },

    warn: (message) => {
      logger.warn(message)
      console.log(chalk.yellow(`warn: ${message}`))
    },

    error: (message, error) => {
      logger.error(message)
      if (error) logger.error(error.stack || error.toString())
      console.log(chalk.red(`error: ${message}`))
      if (error && level === 'verbose') {
        console.log(chalk.red(error.stack || error.toString()))
      }
    },

    verbose: (message) => {
      logger.verbose(message)
      if (level === 'verbose') {
        console.log(chalk.blue(`verbose: ${message}`))
      }
    },
  }

  // Display title
  console.log(chalk.bold.white('\nCreating an optimized production build ...\n'))

  return terminalLogger
}

/**
 * Setup terminal logger and ensure required dependencies are installed
 * @param {string} level - Log level ('verbose' or 'quiet')
 * @returns {Promise<Object>} - Terminal logger instance
 */
async function setupTerminalLogger(level = 'quiet') {
  try {
    // Ensure dependencies are installed
    try {
      require.resolve('winston')
      require.resolve('chalk')
    } catch (_e) {
      console.log('Installing required dependencies...')
      const { execSync } = require('node:child_process')
      execSync('npm install winston chalk --save-dev', { stdio: 'inherit' })
    }

    return createTerminalLogger(level)
  } catch (error) {
    console.error('Failed to setup terminal logger:', error)
    // Return fallback logger
    return {
      startStep: console.log,
      completeStep: () => {},
      info: console.log,
      warn: console.warn,
      error: console.error,
      verbose: console.log,
      resetState: () => {},
    }
  }
}

module.exports = {
  setupTerminalLogger,
  createTerminalLogger,
  resetState,
}
