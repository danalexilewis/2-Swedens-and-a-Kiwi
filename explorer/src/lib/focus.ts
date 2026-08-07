import type { ArchiveEdge, ArchiveFile } from './loadArchive'

export type FocusKind = 'folder' | 'node'

export type FocusTarget = {
  kind: FocusKind
  id: string
} | null

export type FocusSets = {
  members: Set<string>
  linked: Set<string>
  edgeIds: Set<string>
  accentFolder: string | null
}

export function emptyFocus(): FocusSets {
  return {
    members: new Set(),
    linked: new Set(),
    edgeIds: new Set(),
    accentFolder: null
  }
}

/**
 * Resolve which nodes/edges belong to a folder or single-node focus.
 */
export function resolveFocus(
  target: FocusTarget,
  files: ArchiveFile[],
  edges: ArchiveEdge[]
): FocusSets {
  if (!target) return emptyFocus()

  if (target.kind === 'folder') {
    const members = new Set(
      files.filter((f) => f.folder === target.id).map((f) => f.id)
    )
    return connectMembers(members, edges, target.id)
  }

  const members = new Set([target.id])
  const file = files.find((f) => f.id === target.id)
  return connectMembers(members, edges, file?.folder ?? null)
}

function connectMembers(
  members: Set<string>,
  edges: ArchiveEdge[],
  accentFolder: string | null
): FocusSets {
  const linked = new Set<string>()
  const edgeIds = new Set<string>()

  for (const e of edges) {
    const fromMember = members.has(e.source)
    const toMember = members.has(e.target)
    if (fromMember || toMember) {
      edgeIds.add(e.id)
      if (fromMember) linked.add(e.target)
      if (toMember) linked.add(e.source)
    }
  }

  return { members, linked, edgeIds, accentFolder }
}

/** Toggle pin: same target clears, otherwise replaces. */
export function togglePin(current: FocusTarget, next: FocusTarget): FocusTarget {
  if (
    current &&
    next &&
    current.kind === next.kind &&
    current.id === next.id
  ) {
    return null
  }
  return next
}
