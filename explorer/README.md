# Book explorer

Local read-only canvas for browsing the Two Swedens markdown archive.

Inspired by Mapbook: one full-bleed `@xyflow/svelte` graph of files; click a node to read the markdown as HTML.

## Run

```bash
cd explorer
pnpm install
pnpm dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## What it does

- Scans the parent repo for `*.md` files (skips `explorer/`, `node_modules/`, `.git/`, `archive/`)
- **Radial view:** files on a circle, coloured outer ring by folder; hover/click a zone or node to highlight its edges (click pins until you click again or the background)
- **Hierarchy view:** chapters on the top band, other folders in rows below
- Filter input dims non-matching nodes
- **Relationship chips:** toggle `spine` / `mechanism` / `grounds` / `texture` / `challenges` / `feeds` / `mentions` — types are **inferred** from folder roles and section headings, with optional explicit `type:: \`path.md\`` overrides (see [`book/RELATION-TYPES.md`](../book/RELATION-TYPES.md)). Mentions start **off**.
- Click a node → pins its links and opens a dialog with formatted content

## Notes

- Source of truth stays the git markdown files. Refresh after edits outside `explorer/`.
- Process noise (inbox, session root files, legal-review, READMEs) does not create edges unless explicitly typed.
- No editing, auth, or deploy — local writing cockpit only.
