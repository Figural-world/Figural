Figural is the PM for your AI agents.

AI agents forget what you decided. Figural gives them a persistent decision log that survives context windows, catches drift, and keeps every agent on the same page.

```bash
npx figural-core init
```

## Quick start

From your repo root, run:

```bash
npx figural-core init
```

This creates:

- `.figural/log.json`
- `.specpack.json`

Then it prints:

- 3 lines to paste into `CLAUDE.md`
- MCP config JSON blocks (Cursor + Claude Code)

### What the first decision looks like

After you run `/figural-scope` once, your `.figural/log.json` will include a first entry like:

```json
{
  "id": 1,
  "timestamp": "2026-04-22T00:00:00.000Z",
  "decision": "V1 scope: ... (explicitly out of scope: ...)",
  "rationale": "Constraints: ... Success: ... Reconsider if: ...",
  "confidence": 0.7,
  "domain": "scope",
  "source": "human",
  "conflicts_with": [],
  "evidence_refs": []
}
```

## Slash commands

This package ships prompt templates in `./prompts/`:

- `/figural-scope`: ask five forcing questions and log a structured scope decision
- `/figural-decide`: log an explicit product/architecture decision at a fork
- `/figural-watch`: check recent work against the spec and warn on drift

### `./prompts/figural-scope.md`

Asks five forcing questions and logs a single structured scope decision (domain: `scope`).

Example usage (in Claude Code):

```text
/figural-scope
```

### `./prompts/figural-decide.md`

Captures a fork decision with tradeoffs, a forced choice, rationale, and confidence (domain is provided by the developer).

Example usage:

```text
/figural-decide
Decision: choose database
Domain: data model
Options: Postgres, SQLite
Constraints: must run locally, easy backups
```

### `./prompts/figural-watch.md`

Checks recent work against `out_of_scope`, `constraints`, and the core product decision. If drift is meaningful, it logs a drift event (domain: `drift`) with severity + recommended action.

Example usage:

```text
/figural-watch
```

## Passive drift watcher (optional)

You can also run a local watcher:

```bash
npx figural-core watch
```

If it can’t start on your system, use the manual `/figural-watch` prompt after significant work.

## Schemas

### `.figural/log.json`

- `schema_version` (string): currently `"1.0"`
- `decisions` (array): list of decision entries

Each decision entry:

- `id` (number): auto-incrementing integer
- `timestamp` (string): ISO-8601
- `decision` (string)
- `rationale` (string)
- `confidence` (number): 0..1
- `domain` (string): e.g. `"auth"`, `"data model"`, `"UX"`, `"infrastructure"`
- `source` (string): `"human"` | `"agent"` | `"extension"`
- `conflicts_with` (number[]): decision ids this entry contradicts
- `evidence_refs` (string[]): links or references

### `.specpack.json`

Fields:

- `schema_version` (string): e.g. `"1.0"`
- `product_name` (string)
- `decision` (string)
- `rationale` (string)
- `confidence` (number)
- `in_scope` (string[])
- `out_of_scope` (string[])
- `constraints` (string[])
- `edge_cases` (string[])
- `acceptance_tests` (string[])
- `evidence_refs` (string[])

## Contributing

- **Slack**: add your team Slack/Discord link here.

