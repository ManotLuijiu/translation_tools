# Rules

## No individual files in the app root

The root folder of `frappe-bench/apps/translation_tools/` is reserved for the
canonical files of the app. Do **not** add an individual script, a one-off
fix, a probe or a topic document to the root folder.

```
frappe-bench/apps/translation_tools/
├── AGENTS.md          # the project rules
├── CHANGELOG.md
├── CLAUDE.md
├── CLAUDE.local.md
├── GEMINI.md
├── README.md
├── RULES.md           # this file
├── harness/test/      # loose scripts, probes and topic documents
├── translation_tools/    # the app package
└── ...
```

### Where a file belongs

| Kind of file                               | Location                                                |
| ------------------------------------------ | ------------------------------------------------------- |
| App code, DocTypes, tests of the app       | `translation_tools/`                                    |
| A one-off script, a probe, a manual fix    | `harness/test/`                                         |
| A topic document, a plan, an investigation | `harness/test/`                                         |
| A harness plan, agent or report            | `harness/plans/`, `harness/reports/`, `harness/agents/` |
| The canonical project documents            | the app root                                            |

### The canonical root files

Only these files may live in the app root:

- `AGENTS.md` - the project rules for the agents.
- `CHANGELOG.md` - the release history.
- `CLAUDE.md` and `CLAUDE.local.md` - the agent instructions.
- `GEMINI.md` - the agent instructions.
- `README.md` - the app documentation.
- `RULES.md` - this file.

Everything else is a candidate for `harness/test/`.

### Why

A flat root folder with dozens of loose files hides the files that matter and
makes the app look like a script collection instead of a Frappe app. The
harness directory keeps the throwaway work together, out of the way of the
package and of the tests.

### Moving a file

Use `git mv` so that the history of the file is kept:

```bash
git mv some_script.py harness/test/some_script.py
```

A moved script must not import from a module that the app removed. Check the
current API before it is moved, and update the imports in the same change.
