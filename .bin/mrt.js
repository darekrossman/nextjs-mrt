#!/usr/bin/env node

/**
 * MRT (Managed Runtime) API client for PWA Kit
 * Based on https://developer.salesforce.com/docs/commerce/pwa-kit-managed-runtime/references/mrt-admin
 */

const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const dotenv = require('dotenv')

/**
 * Gets the project ID from environment variables or returns the default
 */
function getProjectId() {
  return 'drossman-dev'
}

/**
 * Gets the target (environment) from environment variables or returns the default
 */
function getTarget() {
  return 'development'
}

/**
 * Creates or updates an environment variable for a PWA Kit project
 * @param {Object} variable - The environment variable to create or update
 * @param {string} variable.target - The target for the environment variable
 * @param {string} variable.name - The name of the environment variable
 * @param {string} variable.value - The value of the environment variable
 * @returns {Promise<Object>} Promise with the created/updated environment variable
 */
async function createEnvironmentVariable(variable) {
  const projectId = getProjectId()
  const target = variable.target || getTarget()
  const url = `https://cloud.mobify.com/api/projects/${projectId}/target/${target}/env-var/`
  const body = {
    [variable.name]: { value: variable.value },
  }

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getAuthToken()}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error('Request URL:', url)
    console.error('Request body:', JSON.stringify(body))
    console.error('API Error:', response.status, response.statusText)
    console.error('Response body:', text)
    let errorData
    try {
      errorData = JSON.parse(text)
    } catch (_e) {
      errorData = { message: text }
    }
    throw new Error(
      `Failed to create/update environment variable: ${errorData.message || response.statusText}`,
    )
  }

  const text = await response.text()
  if (text) {
    return JSON.parse(text)
  }
  return {}
}

/**
 * Retrieves all environment variables for a PWA Kit project
 * @returns {Promise<Array<Object>>} Promise with the list of environment variables
 */
async function getEnvironmentVariables(_options = {}) {
  // const projectId = getProjectId()
  // const target = options.target || getTarget()

  const url = 'https://drossman-dev-development.mobify-storefront.com/api/env-var'

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  })

  if (!response.ok) {
    const text = await response.text()
    console.error('API Error:', response.status, response.statusText)

    let errorData
    try {
      errorData = JSON.parse(text)
    } catch (_e) {
      errorData = { message: text }
    }
    throw new Error(
      `Failed to get environment variables: ${errorData.message || response.statusText}`,
    )
  }

  return response.json()
}

/**
 * Updates an existing environment variable (same as create)
 * @param {string} variableName - The name of the variable to update
 * @param {Object} variable - The environment variable data to update
 * @returns {Promise<Object>} Promise with the updated environment variable
 */
async function updateEnvironmentVariable(variableName, variable) {
  return createEnvironmentVariable({
    name: variableName,
    value: variable.value,
    target: variable.target,
  })
}

/**
 * Deletes an environment variable
 * @param {string} variableName - The name of the variable to delete
 * @returns {Promise<void>} Promise that resolves when the variable is deleted
 */
async function deleteEnvironmentVariable(variableName, options = {}) {
  const projectId = getProjectId()
  const target = options.target || getTarget()
  const url = `https://cloud.mobify.com/api/projects/${projectId}/target/${target}/env-var/`
  const body = {
    [variableName]: { value: null },
  }

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getAuthToken()}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error('Request URL:', url)
    console.error('Request body:', JSON.stringify(body))
    console.error('API Error:', response.status, response.statusText)
    console.error('Response body:', text)
    let errorData
    try {
      errorData = JSON.parse(text)
    } catch (_e) {
      errorData = { message: text }
    }
    throw new Error(
      `Failed to delete environment variable: ${errorData.message || response.statusText}`,
    )
  }

  const text = await response.text()
  if (text) {
    return JSON.parse(text)
  }
  return {}
}

/**
 * Helper function to get the authentication token
 * Reads the API token from ~/.mobify file
 * @returns {string} The authentication token
 */
function getAuthToken() {
  try {
    const mobifyPath = path.join(os.homedir(), '.mobify')

    if (!fs.existsSync(mobifyPath)) {
      throw new Error('~/.mobify file not found. Please authenticate with the MRT CLI first.')
    }

    const mobifyConfig = JSON.parse(fs.readFileSync(mobifyPath, 'utf8'))
    const token = mobifyConfig.api_key
    if (!token) {
      throw new Error(
        'API token not found in ~/.mobify file. Please authenticate with the MRT CLI first.',
      )
    }

    return token
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get auth token: ${error.message}`)
    }
    throw new Error('Failed to get auth token')
  }
}

/**
 * Pulls environment variables from MRT and saves them to a .env file
 * @param {Object} options - Options for the pull command
 * @param {string} [options.filePath='.env'] - Path to the .env file
 * @param {boolean} [options.append=false] - Append to existing file instead of overwriting
 * @returns {Promise<void>}
 */
async function pullEnvironmentVariables(options = {}) {
  const filePath = options.filePath || '.env.local'
  const append = options.append || false
  const target = options.target || getTarget()

  try {
    console.log('Fetching environment variables from MRT...')
    const variables = await getEnvironmentVariables({ target })

    const envVars = Object.entries(variables || {}).map(([name, value]) => ({
      name,
      value,
    }))

    const envContent = envVars
      .filter((v) => v.value !== undefined && v.name)
      .map((v) => `${v.name}=${v.value}`)
      .join('\n')

    if (append && fs.existsSync(filePath)) {
      fs.appendFileSync(filePath, `\n${envContent}`)
    } else {
      fs.writeFileSync(filePath, envContent)
    }

    console.log(`Successfully wrote ${envVars.length} environment variables to ${filePath}`)
  } catch (error) {
    console.error('Error pulling environment variables:', error.message)
    process.exit(1)
  }
}

/**
 * Pushes environment variables from a .env file to MRT
 * @param {Object} options - Options for the push command
 * @param {string} [options.filePath='.env'] - Path to the .env file
 * @returns {Promise<void>}
 */
async function pushEnvironmentVariables(options = {}) {
  const filePath = options.filePath || '.env'
  let envVars
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`.env file not found at path: ${filePath}`)
      process.exit(1)
    }
    const envContent = fs.readFileSync(filePath, 'utf8')
    envVars = dotenv.parse(envContent)
  } catch (err) {
    console.error('Failed to read or parse .env file:', err.message)
    process.exit(1)
  }

  const target = options.target || getTarget()
  const results = []
  for (const [name, value] of Object.entries(envVars)) {
    try {
      await createEnvironmentVariable({ name, value, target })
      console.log(`Pushed: ${name}`)
      results.push({ name, status: 'success' })
    } catch (err) {
      console.error(`Failed to push ${name}:`, err.message)
      results.push({ name, status: 'error', error: err.message })
    }
  }
  console.log(
    `\nPush complete. Success: ${results.filter((r) => r.status === 'success').length}, Failed: ${results.filter((r) => r.status === 'error').length}`,
  )
}

/**
 * Displays usage help information
 */
function showHelp() {
  console.log(`
MRT (Managed Runtime) CLI for PWA Kit

Usage:
  mrt <command> [options]

Commands:
  env pull [--file=path] [--append]    Pull environment variables from MRT to a .env file
  env push [--file=path]               Push environment variables from a .env file to MRT
  
Options:
  --file, -f     Path to the .env file (default: '.env')
  --append, -a   Append to the existing file instead of overwriting
  --help, -h     Show this help message
  `)
}

/**
 * Parse command line arguments
 * @returns {Object} Parsed arguments
 */
function parseArgs() {
  const args = process.argv.slice(2)
  const result = {
    command: null,
    subCommand: null,
    options: {},
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    // Parse commands
    if (i === 0 && !arg.startsWith('-')) {
      result.command = arg
    } else if (i === 1 && !arg.startsWith('-')) {
      result.subCommand = arg
    }
    // Parse options
    else if (arg.startsWith('--')) {
      const option = arg.slice(2)
      if (option.includes('=')) {
        const [key, value] = option.split('=')
        result.options[key] = value
      } else {
        result.options[option] = true
      }
    } else if (arg.startsWith('-')) {
      const shortOption = arg.slice(1)
      if (shortOption === 'f' && i + 1 < args.length && !args[i + 1].startsWith('-')) {
        result.options.file = args[++i]
      } else if (shortOption === 'a') {
        result.options.append = true
      } else if (shortOption === 'h') {
        result.options.help = true
      }
    }
  }

  return result
}

/**
 * Main CLI function
 */
async function main() {
  const args = parseArgs()

  if (args.options.help) {
    showHelp()
    return
  }

  if (args.command === 'env') {
    if (args.subCommand === 'pull') {
      await pullEnvironmentVariables({
        filePath: args.options.file,
        append: args.options.append,
      })
    } else if (args.subCommand === 'push') {
      await pushEnvironmentVariables({
        filePath: args.options.file,
      })
    } else {
      console.error(`Unknown env subcommand: ${args.subCommand}`)
      showHelp()
      process.exit(1)
    }
  } else if (!args.command) {
    showHelp()
  } else {
    console.error(`Unknown command: ${args.command}`)
    showHelp()
    process.exit(1)
  }
}

// If this script is run directly (not imported as a module)
if (require.main === module) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}

// Export the functions for use as a module
module.exports = {
  createEnvironmentVariable,
  getEnvironmentVariables,
  updateEnvironmentVariable,
  deleteEnvironmentVariable,
  pullEnvironmentVariables,
  pushEnvironmentVariables,
}
