import type { RelationType, TypedRelationType } from './relationTypes'

export type ArchivePathParts = {
  path: string
  folder: string
}

const PROCESS_ROOT_FILES = new Set([
  'CURRENT.md',
  'PARKING-LOT.md',
  'README.md',
  'VOICE.md',
  'EVIDENCE-STANDARD.md',
  'BOOK.md'
])

/**
 * True when either endpoint is process plumbing that should not become a graph edge
 * unless an explicit type:: line created it.
 */
export function isProcessNoise(
  source: ArchivePathParts,
  target: ArchivePathParts
): boolean {
  if (isProcessPath(source.path) || isProcessPath(target.path)) return true
  if (source.folder === 'legal-review' || target.folder === 'legal-review') {
    return true
  }
  return false
}

function isProcessPath(filePath: string): boolean {
  if (filePath.startsWith('inbox/') || filePath === 'inbox') return true
  if (filePath.endsWith('/README.md') || filePath === 'README.md') return true
  if (!filePath.includes('/') && PROCESS_ROOT_FILES.has(filePath)) return true
  return false
}

/**
 * Infer a relation type from the ## section heading above a path ref.
 * Returns null when the heading does not imply a type.
 */
export function typeFromSection(
  sectionHeading: string,
  target: ArchivePathParts
): RelationType | null {
  const h = sectionHeading.trim().toLowerCase()
  if (!h) return null

  if (
    h.includes('sources') ||
    h.includes('evidence') ||
    h.includes('claims it supports')
  ) {
    return 'grounds'
  }

  if (h.includes('possible chapter use')) {
    return 'feeds'
  }

  if (
    h.includes('strongest counterargument') ||
    h.includes('my response')
  ) {
    return 'challenges'
  }

  if (h.includes('common mechanism')) {
    return 'mechanism'
  }

  if (h.includes('personal material')) {
    return 'texture'
  }

  if (h.includes('memorable lines')) {
    if (target.folder === 'scenes' || target.folder === 'inbox') {
      return 'texture'
    }
  }

  return null
}

/**
 * Infer from a prose line cue such as "Related mechanism:" / "Related branch:".
 */
export function typeFromLineCue(line: string): RelationType | null {
  const lower = line.toLowerCase()
  if (lower.includes('related mechanism') || lower.includes('related branch')) {
    return 'mechanism'
  }
  return null
}

/**
 * Infer from source/target folder roles when section context did not classify.
 */
export function typeFromFolderPair(
  source: ArchivePathParts,
  target: ArchivePathParts
): RelationType | null {
  const sf = source.folder
  const tf = target.folder
  const sp = source.path
  const tp = target.path

  if (tp === 'book/ARGUMENT-MAP.md') return 'spine'
  if (sp === 'book/ARGUMENT-MAP.md' && tf === 'topics') return 'mechanism'

  if (tp === 'book/CHAPTER-MAP.md' || tf === 'chapters') return 'feeds'

  if (sp === 'book/CLAIM-LEDGER.md') {
    if (tf === 'sources') return 'grounds'
    if (tf === 'scenes') return 'texture'
    if (tf === 'chapters') return 'feeds'
    if (tf === 'topics') return 'spine'
  }

  if (
    (sf === 'topics' || sf === 'chapters' || sf === 'book') &&
    tf === 'sources'
  ) {
    return 'grounds'
  }
  if (
    sf === 'sources' &&
    (tf === 'topics' || tf === 'chapters' || tf === 'book')
  ) {
    return 'grounds'
  }

  if (
    (sf === 'topics' || sf === 'chapters' || sf === 'book') &&
    tf === 'scenes'
  ) {
    return 'texture'
  }
  if (sf === 'scenes' && (tf === 'topics' || tf === 'chapters')) {
    return 'texture'
  }

  if (sf === 'topics' && tf === 'topics') return 'mechanism'

  return null
}

/**
 * Classify a path ref into a relation type, or null to drop the edge.
 * Explicit type:: always wins and bypasses process-noise drops.
 */
export function classifyEdge(args: {
  source: ArchivePathParts
  target: ArchivePathParts
  sectionHeading: string
  line: string
  explicitType?: TypedRelationType | null
}): RelationType | null {
  if (args.explicitType) return args.explicitType

  if (isProcessNoise(args.source, args.target)) return null

  const fromLine = typeFromLineCue(args.line)
  if (fromLine) return fromLine

  const fromSection = typeFromSection(args.sectionHeading, args.target)
  if (fromSection) return fromSection

  const fromFolder = typeFromFolderPair(args.source, args.target)
  if (fromFolder) return fromFolder

  return 'mentions'
}
