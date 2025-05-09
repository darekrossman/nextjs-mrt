const path = require('node:path')
const express = require('express')
const { getRuntime } = require('@salesforce/pwa-kit-runtime/ssr/server/express')
const next = require('next')
const { parse } = require('node:url')
const mobify = require('../config/default.js')

const options = {
  buildDir: path.resolve(process.cwd(), 'build'),
  defaultCacheTimeSeconds: 600,
  enableLegacyRemoteProxying: false,
  protocol: 'http',
  mobify,
}

const runtime = getRuntime()

const handler = runtime.createHandler(options, (app) => {
  try {
    const nextApp = next({ dev: false })
    const nextReady = nextApp.prepare().then(() => nextApp.getRequestHandler())

    app.use(express.static(path.resolve(__dirname, 'public')))
    app.use('/_next/static', express.static(path.resolve(process.cwd(), 'build/next/static')))

    app.all('*', async (req, res) => {
      console.log('Serving Next.js page:', req.url)
      const parsedUrl = parse(req.url, true)
      const handler = await nextReady
      handler(req, res, parsedUrl)
      return
    })
  } catch (error) {
    console.error('Error creating handler:', error)
  }
})

handler.get = handler.handler
module.exports = handler
