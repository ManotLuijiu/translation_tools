# Plan — AI Mode Auto Mode (whole-file unattended translation)

**Date:** 2026-07-08  
**App:** `translation_tools`

**Goal:** Redefine **Auto Mode** in AI Mode as a **whole-file unattended workflow**, not just “save after translate”.
When enabled, one user action should process **all remaining untranslated entries for the selected file** in safe internal chunks, save progress after each chunk, optionally do **one final GitHub push**, and support smarter runtime behavior:

- adaptive chunk fallback: `20 → 10 → 5 → 1`
- pause / resume
- background server job
- failure skip list and continue mode

---

## 1. Product decision

### Chosen behavior

Use **Option B**.

**Auto Mode means:**

> Translate the **entire remaining untranslated set** for the selected file automatically, internally chunked for safety, with progress tracking, checkpoint saves, optional final GitHub push, and resumable execution.

This is intentionally **smarter than UI batch clicking**.
It should not depend on the current visible 10+10 rows as the workflow boundary.
The `10 + 10 = 20` rule remains useful only as a **safe chunk size limit**, not as the product scope.

---

## 2. Example: expected behavior for a file with 2071 untranslated entries

If a selected file has `2071` untranslated entries:

1. Auto Mode starts from the file-level untranslated count.
2. System calculates internal work rounds using a max chunk size of `20`.
3. It processes all remaining untranslated entries without requiring the user to manually:
   - select rows
   - page forward
   - click **AI Translate Batch** again
   - click **Save Translations** again
4. It saves progress after each successful chunk.
5. If **Push to Github** is enabled, it performs **one final push** when the full run is complete.
6. If a chunk fails, the system retries more intelligently instead of aborting immediately.

So the user intent is:

- “translate this file to completion”

Not:

- “help me press the same 3 buttons 104 times”

---

## 3. Current architecture and limits

### UI ownership today

- `thai_translation_dashboard/src/components/Dashboard.tsx`
  - Owns top-level `translationMode` (`manual` / `ai`)
- `thai_translation_dashboard/src/components/TranslationEditor.tsx`
  - Renders manual editor vs AI view
- `thai_translation_dashboard/src/components/BatchTranslationView.tsx`
  - Owns current AI batch UI
  - Currently assumes local/manual selection + explicit save

### Current AI flow today

1. User manually selects visible entries
2. Click **AI Translate Batch**
3. Returned translations are staged in React state
4. User clicks **Save Translations**
5. Optional GitHub push happens during save

### Why current flow is insufficient

It is optimized for **small manual batch work**, not unattended whole-file translation.

Problems for large files like `2071` untranslated entries:

- requires repeated manual interaction
- depends on visible page only
- no true job orchestration
- no progress model for whole-file completion
- no pause/resume
- no adaptive fallback on failing chunks
- no skip-list continuation behavior

---

## 4. Desired Auto Mode UX

### UI placement

In:

- `thai_translation_dashboard/src/components/BatchTranslationView.tsx`
- near the existing **Push to Github** toggle

Add:

- **Auto Mode** toggle

### When Auto Mode = OFF

Keep current behavior:

- manual row selection
- click **AI Translate Batch**
- review staged translations
- click **Save Translations**
- optional push

### When Auto Mode = ON

Clicking **AI Translate Batch** should mean:

1. Start an unattended whole-file Auto Mode job for the selected file
2. Determine total remaining untranslated entries server-side
3. Process all remaining untranslated entries in internal safe chunks
4. Save each successful chunk automatically
5. Optionally do one final GitHub push at the end
6. Show live progress
7. Support pause / resume / stop
8. Continue through recoverable failures using adaptive fallback + skip list

### Important clarification

Auto Mode should **not** require manual checkbox selection.
Checkbox selection remains relevant only for manual/review mode.

---

## 5. Smarter runtime model (target V2 now)

This task should target the smarter version directly.

### 5.1 Internal chunking

Default internal chunk size:

- `20`

This preserves the current safety intent:

- avoid long fragile AI requests
- keep save checkpoints frequent
- minimize loss on interruption

### 5.2 Adaptive fallback

If a chunk fails at size `20`:

- retry once at `20`
- if still failing, split into `10`
- if still failing, split into `5`
- if still failing, isolate `1`

This makes the system robust against:

- one problematic string
- intermittent AI/provider failures
- oversized or malformed input edge cases

### 5.3 Pause / resume

User should be able to:

- pause the job
- resume later

Expected behavior:

- completed chunks remain saved
- remaining untranslated work continues from checkpoint
- no restart from zero unless the user explicitly restarts

### 5.4 Background server job

Auto Mode should run as a **backend-managed background job**, not as a fragile long frontend loop.

Why:

- browser tab may refresh/lose focus
- large files can take a long time
- whole-file progress belongs on the server
- pause/resume is easier with centralized job state

### 5.5 Failure skip list and continue mode

If a single-entry chunk still fails at size `1`:

- record it into a skip/failure list
- continue processing the rest of the file

End-of-run result should report:

- completed count
- skipped count
- skipped entry IDs / msgids summary
- whether run completed fully or completed-with-skips

---

## 6. Recommended architecture

## Phase A — frontend Auto Mode control surface

### Files

- `thai_translation_dashboard/src/components/TranslationEditor.tsx`
- `thai_translation_dashboard/src/components/BatchTranslationView.tsx`

### Changes

1. Add `autoMode` state for AI workflow (prefer `TranslationEditor.tsx` so it survives AI/manual switching in the same editor session)
2. Pass into `BatchTranslationView`:
   - `autoMode`
   - `onAutoModeChange`
3. Add UI controls near **Push to Github**:
   - `Auto Mode` toggle
4. Keep current manual controls for Auto Mode OFF

### Acceptance

- AI view shows both:
  - `Push to Github`
  - `Auto Mode`
- Manual mode remains unchanged

---

## Phase B — backend Auto Mode job orchestration

### Files

- `translation_tools/api/ai_translation.py`
- optionally a new helper module if Minimax wants to split orchestration concerns

### Recommended API surface

Add orchestration endpoints like:

- `start_auto_mode_job(...)`
- `get_auto_mode_job_status(job_id)`
- `pause_auto_mode_job(job_id)`
- `resume_auto_mode_job(job_id)`
- `cancel_auto_mode_job(job_id)`

### Start job input

Should include:

- `file_path`
- `push_to_github`
- `github_branch`
- `model_provider`
- `model`
- optional strategy flags:
  - `continue_on_error=True`
  - `max_chunk_size=20`

### Start job output

Should return at least:

- `success`
- `job_id`
- `total_untranslated`
- `planned_initial_chunk_size`

### Job loop behavior

For each run:

1. resolve the current remaining untranslated set from the file itself
2. choose next chunk
3. translate chunk
4. save chunk immediately
5. update progress checkpoint
6. continue until done / paused / cancelled / unrecoverable failure
7. final optional GitHub push once at the end

### Acceptance

- Whole-file work is managed server-side
- Frontend only starts/polls/controls job state

---

## Phase C — persistent job state model

### Goal

Pause/resume and whole-file progress require durable state.

### Recommended storage approach

Prefer **non-migration** storage for V1/V2 implementation speed:

- Frappe cache / Redis for live state
- plus lightweight checkpoint JSON in site-private storage for resume durability if needed

If Minimax finds an existing project pattern for persistent job state, it may reuse that instead.

### Minimum tracked fields

Each Auto Mode job should track:

- `job_id`
- `file_path`
- `status` (`queued`, `running`, `paused`, `completed`, `completed_with_skips`, `failed`, `cancelled`)
- `total_untranslated_at_start`
- `translated_count`
- `saved_count`
- `skipped_count`
- `current_chunk_size`
- `current_chunk_entry_ids`
- `failed_entry_ids`
- `push_to_github`
- `github_branch`
- `final_push_result`
- timestamps
- provider/model used

### Acceptance

- Refreshing UI does not lose job visibility
- Resume knows where to continue

---

## Phase D — refactor low-level batch helpers for orchestration reuse

### Files

- `translation_tools/api/ai_translation.py`

### Problem today

Current helpers are optimized for one-shot batch UI actions:

- `translate_batch(...)`
- `save_batch_translations_with_single_github_push(...)`
- `push_batch_to_github(...)`

For Auto Mode, orchestration should not be implemented as repeated frontend calls.

### Recommended refactor

Extract reusable internals such as:

- translate a specific chunk of entry IDs
- save a provided translations payload immediately
- final push helper that accepts `github_branch`

### Important branch requirement

The Auto Mode job must propagate:

- `github_branch`

through:

- job start
- save/final push helpers
- final GitHub push

### Push strategy

For whole-file Auto Mode:

- **save after every successful chunk locally**
- **push once at the end** by default

This avoids noisy repeated GitHub commits/pushes for large files.

### Acceptance

- Auto Mode does not push on every 20-entry chunk
- final push uses the correct branch

---

## Phase E — adaptive fallback implementation

### File

- `translation_tools/api/ai_translation.py`

### Behavior

For a failing chunk:

1. retry same chunk once
2. then split `20 → 10`
3. then `10 → 5`
4. then `5 → 1`
5. if `1` still fails, add to skip list and continue

### Reporting

Job status should expose:

- active chunk size
- retry count
- skip count
- last error summary

### Acceptance

- A single bad entry does not kill the full-file run
- completed-with-skips is a valid successful end state

---

## Phase F — frontend progress and controls

### Files

- `thai_translation_dashboard/src/components/BatchTranslationView.tsx`

### Add UI for running jobs

When Auto Mode is ON and a job is active, show:

- total untranslated at start
- translated/saved progress
- skipped count
- current chunk size
- status label
- optional last error line

### Controls

Add buttons for:

- `Pause`
- `Resume`
- `Stop`

### Optional wording

Helpful summary text such as:

- `Processing all remaining untranslated entries in safe batches of up to 20.`
- `Failures are retried with smaller chunks automatically.`

### Acceptance

- User can see that the job is whole-file, not single-page
- User can pause/resume without losing completed work

---

## Phase G — completion and refresh behavior

### Files

- `thai_translation_dashboard/src/components/BatchTranslationView.tsx`
- `thai_translation_dashboard/src/components/TranslationEditor.tsx`

### Behavior after completion

On job completion or completed-with-skips:

1. refresh the file entries
2. refresh FileExplorer stats/progress bars
3. show final summary toast / panel
4. if GitHub push ran, include branch/result summary

### Final summary should include

- total processed
- total saved
- total skipped
- final status
- push result if enabled

### Acceptance

- UI accurately reflects the reduced untranslated count after completion
- user sees what finished vs what was skipped

---

## 7. Recommended UX wording

### Auto Mode label

Keep simple:

- `Auto Mode`

### Helper text

Use wording closer to the real behavior:

- `Translate all remaining untranslated entries in this file automatically.`
- `Runs in safe internal batches, saves progress after each batch, and can push once to GitHub at the end.`

### Button behavior

You may keep the button text as:

- `AI Translate Batch`

But when Auto Mode is ON, its actual meaning becomes:

- `Start Auto Mode for this file`

Optional improvement:

- dynamically rename to `Start Auto Translation`

---

## 8. Out of scope for this task

Do **not** include unless explicitly approved later:

- bench commands, builds, migrations, commits, pushes
- compiled asset edits under `translation_tools/public/thai_translation_dashboard/assets/*`
- redesigning the whole dashboard information architecture
- changing Manual Mode behavior beyond what is necessary to coexist with Auto Mode

---

## 9. Files Minimax will likely touch

### Frontend

- `thai_translation_dashboard/src/components/TranslationEditor.tsx`
- `thai_translation_dashboard/src/components/BatchTranslationView.tsx`

### Backend

- `translation_tools/api/ai_translation.py`
- optionally a new helper/state module if orchestration is split out

### Optional supporting files

- tests under `translation_tools/tests/` if backend orchestration coverage is added

---

## 10. Static verification checklist

Minimax should stop after source edits and static checks only:

1. Confirm Auto Mode no longer depends on visible checkbox selection.
2. Confirm Auto Mode operates on the whole remaining untranslated set for the current file.
3. Confirm chunk size is capped at `20` initially.
4. Confirm adaptive fallback path exists: `20 → 10 → 5 → 1`.
5. Confirm pause/resume endpoints and UI controls are wired.
6. Confirm skip-list continuation exists.
7. Confirm final GitHub push happens once at the end, not every chunk.
8. Confirm `github_branch` is passed through the final push path.
9. Confirm Manual Mode behavior still works.

Do **not** run bench operations automatically.

---

## 11. Definition of done

This task is done when all of the following are true:

- AI Mode shows an **Auto Mode** toggle near **Push to Github**.
- With Auto Mode OFF, workflow remains translate → review → save.
- With Auto Mode ON, one user action starts a **whole-file unattended translation job** for the selected file.
- Auto Mode processes **all remaining untranslated entries**, not just the currently visible page.
- Internal processing uses safe chunking with initial max size `20`.
- Adaptive fallback exists: `20 → 10 → 5 → 1`.
- Progress is saved incrementally after each successful chunk.
- User can pause/resume.
- Single-entry hard failures go to a skip list and the job continues.
- If **Push to Github** is enabled, one final GitHub push runs at the end on the intended branch.
- Existing refresh/stat update behavior still works after completion.
