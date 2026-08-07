import fs from 'node:fs'
import path from 'node:path'

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
}

export type ArchiveIndex = {
  generatedAt: string
  files: ArchiveFile[]
  edges: ArchiveEdge[]
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
 * Walk the book repo and build a file index with reference edges.
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
  const edges: ArchiveEdge[] = []

  function addEdge(source: string, target: string) {
    if (source === target) return
    if (!byPath.has(source) || !byPath.has(target)) return
    const key = `${source}→${target}`
    if (edgeKeys.has(key)) return
    edgeKeys.add(key)
    edges.push({ id: key, source, target })
  }

  for (const file of files) {
    const refs = extractPathRefs(file.body)
    for (const ref of refs) {
      const target = resolveRef(ref, file.path, byPath)
      if (target) addEdge(file.id, target)
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    files,
    edges
  }
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
