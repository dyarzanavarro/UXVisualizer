import { describe, expect, it } from 'vitest'
import { computeNodeScore, type Call1Finding } from '../../server/utils/anthropic'

function finding(overrides: Partial<Call1Finding>): Call1Finding {
  return {
    pattern_id: 'PC-001',
    verdict: 'present',
    evidence: 'evidence',
    confidence: 'high',
    suggested_fix: null,
    ...overrides,
  }
}

describe('computeNodeScore', () => {
  it('starts at 100 when there are no findings', () => {
    expect(computeNodeScore([])).toBe(100)
  })

  it('present and not_applicable findings carry no penalty', () => {
    expect(
      computeNodeScore([finding({ verdict: 'present' }), finding({ verdict: 'not_applicable' })]),
    ).toBe(100)
  })

  it('penalizes violated findings by confidence: high=10, medium=6, low=3', () => {
    expect(computeNodeScore([finding({ verdict: 'violated', confidence: 'high' })])).toBe(90)
    expect(computeNodeScore([finding({ verdict: 'violated', confidence: 'medium' })])).toBe(94)
    expect(computeNodeScore([finding({ verdict: 'violated', confidence: 'low' })])).toBe(97)
  })

  it('penalizes absent_where_expected slightly less than violated at the same confidence', () => {
    const violated = computeNodeScore([finding({ verdict: 'violated', confidence: 'high' })])
    const absent = computeNodeScore([finding({ verdict: 'absent_where_expected', confidence: 'high' })])
    expect(absent).toBeGreaterThan(violated)
  })

  it('clamps at 0 for many severe findings', () => {
    const findings = Array.from({ length: 20 }, () => finding({ verdict: 'violated', confidence: 'high' }))
    expect(computeNodeScore(findings)).toBe(0)
  })

  it('never exceeds 100', () => {
    expect(computeNodeScore([finding({ verdict: 'present' })])).toBeLessThanOrEqual(100)
  })
})
