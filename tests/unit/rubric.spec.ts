import { describe, expect, it } from 'vitest'
import { formatRubricForPrompt, getRubric } from '../../server/utils/rubric'

describe('rubric loader', () => {
  it('loads all rows from both CSVs with the expected shape', () => {
    const rubric = getRubric()

    expect(rubric.psyconversion).toHaveLength(131)
    expect(rubric.vertrauensarchitektur).toHaveLength(10)

    expect(rubric.psyconversion[0]).toMatchObject({
      id: expect.stringMatching(/^PC-\d+$/),
      name: expect.any(String),
      journey_stage: expect.any(String),
      description: expect.any(String),
    })
    expect(rubric.vertrauensarchitektur[0]).toMatchObject({
      id: expect.stringMatching(/^VA-\d+$/),
      name: expect.any(String),
      axis: expect.any(String),
    })
  })

  it('caches the parsed result across calls', () => {
    expect(getRubric()).toBe(getRubric())
  })

  it('formats both rubric sources into a single prompt-ready block, one pattern per line', () => {
    const rubric = getRubric()
    const text = formatRubricForPrompt(rubric)

    expect(text).toContain('## PsyConversion behavior patterns')
    expect(text).toContain('## VertrauensArchitektur trust mechanisms')
    expect(text).toContain('PC-001')
    expect(text).toContain('VA-01')
    expect(text.split('\n').filter((l) => l.startsWith('PC-'))).toHaveLength(131)
  })
})
