# Two Swedens and a Kiwi

An opinionated comparative economics book, supported by lived experience, plain-language explanation, and enough evidence to make the argument credible.

**Title:** Two Swedens and a Kiwi  
**Theme:** Shared Failure  
**Thesis:** Sweden and New Zealand are becoming capital-class societies.

## What this repository is

A writing archive that helps move from:

**raw thought → shared pattern → supported argument → chapter**

It is not a database, a citation manager, investigative-journalism platform, or publishing product. A local read-only explorer for navigating the archive is allowed.

## Where things go

| Path | Purpose |
|------|---------|
| `BOOK.md` | Stable identity of the book (changes slowly) |
| `CURRENT.md` | What you are working on right now |
| `PARKING-LOT.md` | Good ideas that must not hijack the current task |
| `VOICE.md` | Tone, grammar, and writing rules |
| `EVIDENCE-STANDARD.md` | What needs references and what does not |
| `inbox/` | Unprocessed transcripts, notes, documents, links |
| `book/` | Core thesis, argument map, claim ledger, chapter map, [relationship types](book/RELATION-TYPES.md) |
| `topics/` | Comparative topic files (Sweden ↔ New Zealand) |
| `scenes/` | Lived scenes for chapter openings |
| `chapters/` | Draft chapters |
| `sources/` | Short source notes and an index (not every PDF) |
| `memoir-vault/` | Material better suited to a later memoir |
| `legal-review/` | Claims about identifiable people needing care |
| `archive/` | Material no longer in active use (preserve, don't delete) |
| `explorer/` | Local canvas UI to browse the markdown archive |

## Local explorer

```bash
cd explorer && pnpm install && pnpm dev
```

See [`explorer/README.md`](explorer/README.md).

## How to start a session

1. Read `CURRENT.md`.
2. Do only that task.
3. Park everything else in `PARKING-LOT.md`.
4. When a transcript arrives, process it using the prompt in `inbox/README.md`.

## Guardrails

- Do not build publishing software, a public site, or a second content home. A local read-only explorer is allowed.
- Do not create one file for every minor thought.
- Do not neutralize the author's anger.
- Do not invent facts or citations.
- Do not treat Sweden and New Zealand as identical mechanisms.
- Do not rename the book.
