import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { parse } from 'csv-parse/sync'

const here = dirname(fileURLToPath(import.meta.url))
const rubricDir = resolve(here, '../../data/rubric')

export interface PsyConversionPattern {
  id: string
  name: string
  journey_stage: string
  journey_subcategory: string
  description: string
  detection_hint: string
  example_fix: string
}

export interface VertrauensarchitekturMechanism {
  id: string
  name: string
  axis: string
  description: string
  detection_hint: string
  example_fix: string
}

export interface Rubric {
  psyconversion: PsyConversionPattern[]
  vertrauensarchitektur: VertrauensarchitekturMechanism[]
}

let cached: Rubric | null = null

function loadCsv<T>(fileName: string): T[] {
  const raw = readFileSync(resolve(rubricDir, fileName), 'utf-8')
  return parse(raw, { columns: true, skip_empty_lines: true }) as T[]
}

export function getRubric(): Rubric {
  if (!cached) {
    cached = {
      psyconversion: loadCsv<PsyConversionPattern>('psyconversion_patterns.csv'),
      vertrauensarchitektur: loadCsv<VertrauensarchitekturMechanism>('vertrauensarchitektur_mechanisms.csv'),
    }
  }
  return cached
}

/**
 * v0 simplification: the CSVs tag each row with a journey_stage/axis, but
 * canvas nodes don't yet carry an explicit journey-phase field to filter
 * against (see HANDOFF.md - that's canvas/product design, not scoring). So
 * Call 1 gets the full rubric and relies on its own system prompt
 * instruction to mark anything inapplicable as "not_applicable" rather than
 * forcing a finding. Revisit once nodes carry a phase field.
 */
export function formatRubricForPrompt(rubric: Rubric): string {
  const psy = rubric.psyconversion
    .map((p) => `${p.id} | ${p.name} (${p.journey_stage}/${p.journey_subcategory}): ${p.description} Detection: ${p.detection_hint}`)
    .join('\n')
  const trust = rubric.vertrauensarchitektur
    .map((v) => `${v.id} | ${v.name} (${v.axis}): ${v.description} Detection: ${v.detection_hint}`)
    .join('\n')
  return `## PsyConversion behavior patterns\n${psy}\n\n## VertrauensArchitektur trust mechanisms\n${trust}`
}
