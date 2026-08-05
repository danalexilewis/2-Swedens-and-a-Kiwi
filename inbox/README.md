# Inbox

Drop unprocessed material here. Do not clean voice notes or transcripts before preserving them.

## Folders

| Folder | Contents |
|--------|----------|
| `transcripts/` | Conversation and dictation transcripts, preserved unchanged |
| `voice-notes/` | Audio or raw voice exports |
| `raw-notes/` | Rough written notes |
| `documents/` | PDFs and files awaiting source notes |
| `links/` | URLs and link dumps |

## Processing prompt

When a transcript is added, process it with this prompt (do not rewrite the transcript into polished prose unless explicitly asked):

```
Process this transcript for Two Swedens and a Kiwi.
Preserve the original unchanged.
Extract:
1. Personal scenes
2. Shared failures
3. New Zealand-specific mechanisms
4. Sweden-specific mechanisms
5. Common economic mechanisms
6. Factual claims requiring references
7. Personal opinions
8. Causal arguments
9. Predictions
10. Policy proposals
11. Claims involving identifiable people
12. Memorable lines
13. Open research questions
14. Material better suited to the later memoir
For every extracted item:
- Preserve the author’s original meaning and emotional force.
- Suggest a topic file.
- Suggest a possible chapter.
- Mark whether it is fact, personal experience, interpretation, causal argument, prediction, or proposal.
- Do not fact-check unless explicitly asked.
- Do not weaken strong opinions into neutral corporate prose.
- Do not treat speculation as fact.
- Do not invent transitions, details, motives, or evidence.
```

Route outputs into `topics/`, `scenes/SCENE-BANK.md`, `book/CLAIM-LEDGER.md`, `book/OPEN-QUESTIONS.md`, `memoir-vault/`, or `legal-review/` as appropriate.
Park anything that does not serve `CURRENT.md` in `PARKING-LOT.md`.
