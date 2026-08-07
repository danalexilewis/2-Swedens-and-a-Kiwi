# Relationship types

Typed and inferred edges for the archive graph. Claim types in `CLAIM-LEDGER.md` classify **claims**. These types classify **links between files**.

## Vocabulary

| Type | Why the link exists | Typical from → to |
|------|---------------------|-------------------|
| `spine` | Load-bearing on the core thesis / argument chain | topic → `ARGUMENT-MAP`, ledger → topics |
| `mechanism` | Structural causal plumbing (how X produces Y) | topic → topic; argument map → topics |
| `grounds` | Evidence or sourced fact that bears weight | topic/chapter/book → sources |
| `texture` | Anecdote, scene, lived colour — illuminates without proving | topic → scenes |
| `challenges` | Counterargument or adverse evidence | counterargument sections; explicit only for legal-review |
| `feeds` | Composition: material destined for a manuscript unit | any → chapter map / chapters |

**Residual:** `mentions` is whatever still resolves after inference. It is **off by default** in the explorer.

## How edges are classified

Priority:

1. Explicit `type::` line (always wins; also bypasses process-noise drops)
2. Line cues (`Related mechanism:` / `Related branch:`)
3. Section heading above the ref (see below)
4. Folder-pair role of source and target
5. Else `mentions`

### Dropped (no edge)

Unless an explicit `type::` line created them:

- Any path under `inbox/`
- Root session files: `CURRENT.md`, `PARKING-LOT.md`, `README.md`, and other root process files
- Folder READMEs
- Anything involving `legal-review/`

### Section heading → type

| Heading contains | Type |
|------------------|------|
| Sources / Evidence / Claims it supports | `grounds` |
| Personal Material | `texture` |
| Memorable Lines (only when target is scenes/inbox) | `texture` |
| Possible Chapter Use | `feeds` |
| Strongest Counterargument / My Response | `challenges` |
| Common Mechanism | `mechanism` |

### Folder-pair → type

| Source | Target | Type |
|--------|--------|------|
| topics / chapters / book | sources | `grounds` |
| sources | topics / chapters / book | `grounds` |
| topics / chapters / book | scenes | `texture` |
| scenes | topics / chapters | `texture` |
| any | `book/ARGUMENT-MAP.md` | `spine` |
| `book/ARGUMENT-MAP.md` | topics | `mechanism` |
| any | `book/CHAPTER-MAP.md` or `chapters/*` | `feeds` |
| topics | topics | `mechanism` |
| `book/CLAIM-LEDGER.md` | sources / scenes / chapters / topics | `grounds` / `texture` / `feeds` / `spine` |

## Authoring

Prefer inference for routine folder roles. Add an explicit line when the *why* differs from the default:

```md
mechanism:: `topics/taxing-activity-rewarding-scarcity.md`
grounds:: `sources/notes/sweden-first-hand-tenure-allmannytta.md`
texture:: `scenes/SCENE-BANK.md`
spine:: `book/ARGUMENT-MAP.md`
feeds:: `book/CHAPTER-MAP.md`
challenges:: `book/CLAIM-LEDGER.md`
```

Markdown links on the same line also work:

```md
grounds:: [tenure note](sources/notes/sweden-first-hand-tenure-allmannytta.md)
```

## Explorer

Chips filter by type. Mentions start off so the map shows argument structure, not path noise. See `explorer/README.md`.
