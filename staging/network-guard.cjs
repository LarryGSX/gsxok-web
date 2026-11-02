// Preloaded only by the local staging runner, never by production application code.
const http = require('node:http'),
  https = require('node:https'),
  net = require('node:net'),
  tls = require('node:tls')
function hostAllowed(host) {
  host = String(host || 'localhost')
    .replace(/^\[|\]$/g, '')
    .split(':')[0]
  if (['localhost', '127.0.0.1', ''].includes(host)) return
  if (
    process.env.GSX_STAGE_ALLOW_FONTS === '1' &&
    ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(host)
  )
    return
  throw Error('Fictional staging blocked external host: ' + host)
}
for (const protocol of [http, https])
  for (const name of ['request', 'get']) {
    const original = protocol[name]
    protocol[name] = function (first, ...rest) {
      const options = typeof first === 'string' || first instanceof URL ? new URL(first) : first
      hostAllowed(options.hostname || options.host)
      return original.call(this, first, ...rest)
    }
  }
for (const [module, name] of [
  [net, 'connect'],
  [net, 'createConnection'],
  [tls, 'connect'],
]) {
  const original = module[name]
  module[name] = function (...args) {
    const first = args[0]
    if (first && typeof first === 'object' && !first.path) hostAllowed(first.host || first.hostname)
    else if (typeof args[1] === 'string') hostAllowed(args[1])
    return original.apply(this, args)
  }
}
const originalFetch = globalThis.fetch
if (originalFetch)
  globalThis.fetch = function (input, init) {
    hostAllowed(
      new URL(typeof input === 'string' || input instanceof URL ? input : input.url).hostname
    )
    return originalFetch.call(this, input, init)
  }
