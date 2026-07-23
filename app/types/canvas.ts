export type AssetType = 'url' | 'image' | 'email'

export type FindingVerdict = 'present' | 'violated' | 'absent_where_expected' | 'not_applicable'

export interface NodeFinding {
  id: string
  verdict: FindingVerdict
  text: string
}

export interface FunnelNodeData {
  id: string
  type: AssetType
  label: string
  sub: string
  score: number | null
  imageSrc: string | null
  emailText: string | null
  findings: NodeFinding[]
}

export type SeamStatus = 'ok' | 'break' | 'unanalyzed'

export type SeamIssueType =
  | 'price_mismatch'
  | 'trust_dropoff'
  | 'tone_break'
  | 'promise_unfulfilled'
  | 'visual_inconsistency'
  | 'confirmed'
  | 'not_yet_analyzed'
  | 'other'

export type SeamSeverity = 'high' | 'medium' | 'low' | 'none'

export interface SeamFinding {
  type: SeamIssueType
  severity: SeamSeverity
  text: string
}

export interface FunnelEdgeData {
  id: string
  from: string
  to: string
  status: SeamStatus
  findings: SeamFinding[]
}
