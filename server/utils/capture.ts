import { chromium } from 'playwright-core'

export interface CaptureResult {
  screenshot: string // data URL
  text: string
}

const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/

/**
 * True only for hostnames that are themselves internal/private - matched
 * exactly or as a full dotted-decimal IPv4 address, never as a prefix. A
 * naive prefix check (e.g. /^10\./) would also reject legitimate domains
 * like "10.example.com", which merely start with the same digits.
 */
function isBlockedHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (lower === 'localhost' || lower.endsWith('.localhost')) return true
  if (lower.endsWith('.local')) return true
  if (lower === '::1' || lower === '0:0:0:0:0:0:0:1') return true

  const ipv4 = IPV4_PATTERN.exec(lower)
  if (!ipv4) return false
  const octets = ipv4.slice(1).map(Number) as [number, number, number, number]
  if (octets.some((n) => n > 255)) return false // not actually a valid IPv4
  const [a, b] = octets
  if (a === 127) return true // loopback
  if (a === 0) return true // "this network"
  if (a === 10) return true // RFC1918 private
  if (a === 172 && b >= 16 && b <= 31) return true // RFC1918 private
  if (a === 192 && b === 168) return true // RFC1918 private
  if (a === 169 && b === 254) return true // link-local, incl. cloud metadata (169.254.169.254)
  return false
}

/** Minimal SSRF guard: this endpoint fetches arbitrary user-supplied URLs by design, so reject obvious internal targets. */
export function assertCapturableUrl(rawUrl: string): URL {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new Error('Not a valid URL.')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http:// and https:// URLs can be captured.')
  }
  if (isBlockedHostname(url.hostname)) {
    throw new Error('Refusing to capture an internal/private host.')
  }
  return url
}

export async function captureUrl(rawUrl: string): Promise<CaptureResult> {
  const url = assertCapturableUrl(rawUrl)

  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
    await page.goto(url.toString(), { waitUntil: 'networkidle', timeout: 20_000 })
    const screenshotBuffer = await page.screenshot({ type: 'png' })
    // A string body (rather than a typed arrow function) sidesteps needing
    // DOM lib types in the server tsconfig - this runs in the page context,
    // not Node, so `document` isn't actually undefined at runtime.
    const text = await page.evaluate<string>('document.body ? document.body.innerText : ""')
    return {
      screenshot: `data:image/png;base64,${screenshotBuffer.toString('base64')}`,
      text: text.slice(0, 20_000),
    }
  } finally {
    await browser.close()
  }
}
