/** Closed vocabulary of typed archive edges + residual mentions. */

export const RELATION_TYPES = [
  'spine',
  'mechanism',
  'grounds',
  'texture',
  'challenges',
  'feeds',
  'mentions'
] as const

export type RelationType = (typeof RELATION_TYPES)[number]

/** Typed edges only (excludes residual mentions). */
export const TYPED_RELATION_TYPES = [
  'spine',
  'mechanism',
  'grounds',
  'texture',
  'challenges',
  'feeds'
] as const

export type TypedRelationType = (typeof TYPED_RELATION_TYPES)[number]

const TYPED_SET = new Set<string>(TYPED_RELATION_TYPES)

/**
 * True when the string is a configured typed relation (not mentions).
 */
export function isTypedRelationType(value: string): value is TypedRelationType {
  return TYPED_SET.has(value)
}

/** Stroke colours for graph edges by relation type. */
export const RELATION_COLORS: Record<RelationType, string> = {
  spine: '#f472b6',
  mechanism: '#34d399',
  grounds: '#a78bfa',
  texture: '#fbbf24',
  challenges: '#f87171',
  feeds: '#60a5fa',
  mentions: 'rgba(255,255,255,0.28)'
}

export const RELATION_LABELS: Record<RelationType, string> = {
  spine: 'spine',
  mechanism: 'mechanism',
  grounds: 'grounds',
  texture: 'texture',
  challenges: 'challenges',
  feeds: 'feeds',
  mentions: 'mentions'
}
