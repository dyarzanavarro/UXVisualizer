import { captureUrl } from '../utils/capture'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ url?: string }>(event)
  if (!body?.url) {
    throw createError({ statusCode: 400, statusMessage: 'Missing "url" in request body.' })
  }

  try {
    return await captureUrl(body.url)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Capture failed.'
    const isValidationError = /valid URL|http:\/\/ and https|internal\/private/.test(message)
    throw createError({ statusCode: isValidationError ? 400 : 502, statusMessage: message })
  }
})
