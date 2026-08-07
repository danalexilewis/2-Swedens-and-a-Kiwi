import fs from 'node:fs'
import path from 'node:path'
import { classifyEdge } from './inferRelation'
import {
  isTypedRelationType,
  type RelationType,
  type TypedRelationType
} from './relationTypes'

export type ArchiveFile = {
  id: string
  path: string
  folder: string
  title: string
  body: string
}

export type ArchiveEdge = {
  id: string
  source: string
  target: string
  type: RelationType
}

export type ArchiveIndex = {
  generatedAt: string
  files: ArchiveFile[]
  edges: ArchiveEdge[]
}

export type LinkCandidate = {
  ref: string
  sectionHeading: string
  line: string
  explicitType: TypedRelationType | null
}

const SKIP_DIR_NAMES = new Set([
  'explorer',
  'node_modules',
  '.git',
  '.svelte-kit',
  'build',
  'dist',
  '.cursor',
  'archive'
])

/** Match repo-relative .md paths in prose. */
const PATH_REF_RE =
  /(?:`|\]\(|\s|^|[("'=])((?:book|topics|chapters|scenes|sources|inbox|legal-review|memoir-vault)\/[\w./-]+\.md|[A-Z][\w.-]*\.md)(?:`|\)|\s|$|[)"',\]])/g

/** Dataview-style typed link lines: `mechanism:: \`path.md\``. */
const TYPED_LINE_PREFIX_RE =
  /^(spine|mechanism|grounds|texture|challenges|feeds)::\s*(.+)$/i

const H2_RE = /^##\s+(.+)$/

/**
 * Resolve the book repo root (parent of explorer/).
 */
export function findRepoRoot(from = process.cwd()): string {
  let dir = from
  for (let i = 0; i < 6; i++) {
    const explorerPkg = path.join(dir, 'package.json')
    const parentBook = path.join(dir, '..', 'BOOK.md')
    if (
      fs.existsSync(explorerPkg) &&
      fs.existsSync(parentBook) &&
      path.basename(dir) === 'explorer'
    ) {
      return path.resolve(dir, '..')
    }
    if (fs.existsSync(path.join(dir, 'BOOK.md')) && fs.existsSync(path.join(dir, 'explorer'))) {
      return dir
    }
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return path.resolve(from, '..')
}

/**
 * Walk the book repo and build a file index with classified reference edges.
 */
export function loadArchive(repoRoot = findRepoRoot()): ArchiveIndex {
  const files: ArchiveFile[] = []
  const byPath = new Map<string, ArchiveFile>()

  function walk(absDir: string, relDir: string) {
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(absDir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (SKIP_DIR_NAMES.has(entry.name) || entry.name === '.git') continue
        if (entry.name.startsWith('.') && entry.name !== '.') continue
        const nextRel = relDir ? `${relDir}/${entry.name}` : entry.name
        walk(path.join(absDir, entry.name), nextRel)
        continue
      }
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue

      const relPath = relDir ? `${relDir}/${entry.name}` : entry.name
      const absPath = path.join(absDir, entry.name)
      const body = fs.readFileSync(absPath, 'utf8')
      const folder = relPath.includes('/') ? relPath.split('/')[0]! : 'root'
      const title = entry.name.replace(/\.md$/, '')
      const file: ArchiveFile = {
        id: relPath,
        path: relPath,
        folder,
        title,
        body
      }
      files.push(file)
      byPath.set(relPath, file)
      if (!relPath.includes('/')) {
        byPath.set(entry.name, file)
      }
    }
  }

  walk(repoRoot, '')
  files.sort((a, b) => a.path.localeCompare(b.path))

  const edgeKeys = new Set<string>()
  /** Best type seen for a source→target pair (explicit / inferred beat mentions). */
  const pairType = new Map<string, RelationType>()
  const edges: ArchiveEdge[] = []

  function preferType(a: RelationType, b: RelationType): RelationType {
    if (a === b) return a
    if (a === 'mentions') return b
    if (b === 'mentions') return a
    // Keep first non-mention when both typed (explicit processed first).
    return a
  }

  function addEdge(source: string, target: string, type: RelationType) {
    if (source === target) return
    if (!byPath.has(source) || !byPath.has(target)) return
    const pair = `${source}→${target}`
    const existing = pairType.get(pair)
    if (existing) {
      const kept = preferType(existing, type)
      if (kept === existing) return
      // Upgrade mentions → typed: replace edge.
      const oldId = `${pair}:${existing}`
      const idx = edges.findIndex((e) => e.id === oldId)
      if (idx !== -1) edges.splice(idx, 1)
      edgeKeys.delete(oldId)
      pairType.set(pair, kept)
      const key = `${pair}:${kept}`
      edgeKeys.add(key)
      edges.push({ id: key, source, target, type: kept })
      return
    }
    const key = `${pair}:${type}`
    if (edgeKeys.has(key)) return
    edgeKeys.add(key)
    pairType.set(pair, type)
    edges.push({ id: key, source, target, type })
  }

  for (const file of files) {
    const linkBody = stripFencedCode(file.body)
    const candidates = extractLinkCandidates(linkBody)
    const sourceParts = { path: file.path, folder: file.folder }

    function ingest(c: (typeof candidates)[number]) {
      const targetId = resolveRef(c.ref, file.path, byPath)
      if (!targetId) return
      const targetFile = byPath.get(targetId)
      if (!targetFile) return
      const targetParts = {
        path: targetFile.path,
        folder: targetFile.folder
      }

      const type = classifyEdge({
        source: sourceParts,
        target: targetParts,
        sectionHeading: c.sectionHeading,
        line: c.line,
        explicitType: c.explicitType
      })
      if (!type) return
      addEdge(file.id, targetId, type)
    }

    // Explicit type:: wins: ingest those first so preferType keeps them.
    for (const c of candidates) {
      if (c.explicitType) ingest(c)
    }
    for (const c of candidates) {
      if (!c.explicitType) ingest(c)
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    files,
    edges
  }
}

/**
 * Remove fenced code blocks so documentation examples are not graph edges.
 */
export function stripFencedCode(body: string): string {
  return body.replace(/```[\s\S]*?```/g, '')
}

/**
 * Walk markdown lines; collect path refs with section heading and optional explicit type.
 */
export function extractLinkCandidates(body: string): LinkCandidate[] {
  const found: LinkCandidate[] = []
  const seen = new Set<string>()
  let sectionHeading = ''

  for (const rawLine of body.split('\n')) {
    const h2 = H2_RE.exec(rawLine)
    if (h2) {
      sectionHeading = h2[1]!.trim()
      continue
    }

    let explicitType: TypedRelationType | null = null
    let scan = rawLine
    const typed = TYPED_LINE_PREFIX_RE.exec(rawLine)
    if (typed && isTypedRelationType(typed[1]!.toLowerCase())) {
      explicitType = typed[1]!.toLowerCase() as TypedRelationType
      scan = typed[2]!
    }

    for (const ref of extractPathRefs(scan)) {
      const key = `${explicitType ?? ''}|${sectionHeading}|${ref}|${rawLine}`
      if (seen.has(key)) continue
      seen.add(key)
      found.push({
        ref,
        sectionHeading,
        line: rawLine,
        explicitType
      })
    }
  }

  return found
}

/**
 * Pull typed relation targets from `type:: path` lines.
 */
export function extractTypedRefs(
  body: string
): { type: TypedRelationType; ref: string }[] {
  return extractLinkCandidates(body)
    .filter((c) => c.explicitType)
    .map((c) => ({ type: c.explicitType!, ref: c.ref }))
}

/**
 * Pull candidate .md path strings from markdown body.
 */
export function extractPathRefs(body: string): string[] {
  const found = new Set<string>()

  const backtick = /`([^`\n]+\.md)`/g
  let m: RegExpExecArray | null
  while ((m = backtick.exec(body)) !== null) {
    found.add(cleanRef(m[1]!))
  }

  const mdLink = /\]\(([^)]+\.md)(?:#[^)]*)?\)/g
  while ((m = mdLink.exec(body)) !== null) {
    found.add(cleanRef(m[1]!))
  }

  PATH_REF_RE.lastIndex = 0
  while ((m = PATH_REF_RE.exec(body)) !== null) {
    found.add(cleanRef(m[1]!))
  }

  return [...found].filter(Boolean)
}

function cleanRef(raw: string): string {
  return raw.trim().replace(/^\.\//, '').replace(/^\/+/, '')
}

function resolveRef(
  ref: string,
  fromPath: string,
  byPath: Map<string, ArchiveFile>
): string | null {
  const cleaned = cleanRef(ref)
  if (byPath.has(cleaned)) return byPath.get(cleaned)!.id

  const fromDir = path.posix.dirname(fromPath)
  const joined = path.posix.normalize(
    path.posix.join(fromDir === '.' ? '' : fromDir, cleaned)
  )
  const normalized = joined.replace(/^\.\//, '')
  if (byPath.has(normalized)) return byPath.get(normalized)!.id

  const base = path.posix.basename(cleaned)
  const matches = [...byPath.values()].filter(
    (f) => f.path.endsWith('/' + base) || f.path === base
  )
  if (matches.length === 1) return matches[0]!.id

  return null
}
