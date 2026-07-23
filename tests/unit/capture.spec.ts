import { describe, expect, it } from 'vitest'
import { assertCapturableUrl } from '../../server/utils/capture'

describe('assertCapturableUrl', () => {
  it('accepts ordinary http(s) URLs', () => {
    expect(assertCapturableUrl('https://example.com/checkout').hostname).toBe('example.com')
    expect(assertCapturableUrl('http://example.com').protocol).toBe('http:')
  })

  it('rejects malformed URLs', () => {
    expect(() => assertCapturableUrl('not a url')).toThrow('Not a valid URL.')
  })

  it('rejects non-http(s) protocols', () => {
    expect(() => assertCapturableUrl('file:///etc/passwd')).toThrow(/http:\/\/ and https/)
    expect(() => assertCapturableUrl('ftp://example.com')).toThrow(/http:\/\/ and https/)
  })

  it('rejects loopback and private hosts (SSRF guard)', () => {
    for (const url of [
      'http://localhost/admin',
      'http://127.0.0.1:8080',
      'http://10.0.0.5',
      'http://172.16.0.1',
      'http://192.168.1.1',
      'http://169.254.169.254/latest/meta-data', // cloud metadata endpoint
      'http://printer.local',
    ]) {
      expect(() => assertCapturableUrl(url), url).toThrow('internal/private host')
    }
  })

  it('does not false-positive on public hosts that merely start with a blocked octet', () => {
    expect(() => assertCapturableUrl('https://10.example.com')).not.toThrow()
    expect(() => assertCapturableUrl('https://172.example.com')).not.toThrow()
  })
})
