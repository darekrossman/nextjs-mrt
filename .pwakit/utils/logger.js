/**
 * Logger utility for PWA Kit Next.js Build Process
 */
const winston = require('winston')
const { execSync } = require('node:child_process')
const path = require('node:path')

/**
 * Creates a configured logger instance
 * @param {string} level - Log level ('verbose' or 'quiet')
 * @returns {winston.Logger} - Configured logger instance
 */
function createLogger(level = 'quiet') {
  try {
    // Create winston logger instance
    const logger = winston.createLogger({
      level: level === 'verbose' ? 'verbose' : 'info',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss',
        }),
        winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`),
      ),
      transports: [
        new winston.transports.Console({
          stderrLevels: ['error'],
        }),
      ],
    })

    // Configure custom log levels
    winston.addColors({
      error: 'red',
      warn: 'yellow',
      info: 'green',
      verbose: 'blue',
      debug: 'white',
    })

    logger.verbose(`Logger initialized with level: ${level}`)
    return logger
  } catch (error) {
    console.error('Failed to setup logger:', error)
    // Fallback to console if logger setup fails
    return {
      info: console.log,
      warn: console.warn,
      error: console.error,
      verbose: console.log,
      debug: console.log,
    }
  }
}

/**
 * Setup logger and ensure winston is installed
 * @param {string} level - Log level ('verbose' or 'quiet')
 * @returns {Promise<winston.Logger>} - Configured logger
 */
async function setupLogger(level = 'quiet') {
  // Create a temporary fallback logger
  const tempLogger = {
    info: console.log,
    warn: console.warn,
    error: console.error,
    verbose: console.log,
    debug: console.log,
  }

  try {
    // Ensure winston is installed
    try {
      require.resolve('winston')
    } catch (_e) {
      tempLogger.info('Winston not found. Installing it...')
      const PWAKIT_DIR = path.resolve(__dirname, '..')
      process.chdir(PWAKIT_DIR)
      execSync('npm install winston --save', { stdio: 'inherit' })
    }

    // Create and return the actual logger
    return createLogger(level)
  } catch (error) {
    tempLogger.error('Failed to setup logger:', error)
    return tempLogger
  }
}

module.exports = {
  setupLogger,
  createLogger,
}
