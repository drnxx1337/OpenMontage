# Composer upstream merge — conflict policy, gates, rollback

- Date: 2026-10-30
- Repo: `/home/ubuntu/Documents/factory/OpenMontage` (composer). STUDIO is out of scope.
- Merge base: `cd9f3c1`
- Local `main`: `b8edc12` (9 commits ahead of base)
- `origin/main`: `195eab2` (52 commits ahead of base)
- Roles used for this plan: code-explorer (execution paths, dependency map) + architect (trade-offs, gates, rollback).
- Status of this document: **plan only**. No ref, worktree, or source file was modified while writing it.

## 1. Verdict

**MERGE NOW — in a dedicated worktree, behind five fast gates, with no push until a fresh-session reviewer signs the diff.**

Why (all measured, not inferred):

| Check | Result |
|---|---|
| `git merge-tree --write-tree main origin/main` | exit 0, tree `efe8bbf` — no textual conflict |
| Overlapping files (both sides) | exactly one: `remotion-composer/src/Explainer.tsx` |
| Explainer hunks | disjoint: upstream changed line 12 (import) and 38 (call) on `origin/main`; local added at 33, 213, 648, 769, 830 — verified present together in merged blob `efe8bbf` (lines 12, 33, 41, 213, 648, 769, 830; the call shifts 38→41 from local import lines) |
| `remotion-composer/package.json`, `package-lock.json`, `tsconfig.json`, `src/Root.tsx`, `SCENE_TYPES.md` | **untouched by upstream** (`git diff --stat cd9f3c1 origin/main -- <those>` is empty) → local wins by default, no lock resolution needed |
| `tsc --noEmit` on current main | exit 0, 4.1 s, zero errors — a clean, cheap type gate exists |
| `remotion compositions src/index.tsx` | exit 0 in ~3 s, 13 compositions listed (headless shell already cached in `node_modules/.remotion`) |
| `pytest tests/contracts/test_phase0_contracts.py tests/backlot/test_server.py` | 46 passed, 8.41 s |
| `websockets` (upstream's only new requirement) | already installed (16.1.1) → no `pip install` before gates |

The 52 upstream commits are mostly Python providers, provider contracts, tests, and security fixes; the composer-side surface is small and additive (bundled fonts, caption direction, frame-width fix). The 9 local commits are additive composer work (science scenes, shotkit, generated shots) plus three small policy edits (`package.json`, `tsconfig.json`, `Root.tsx`). Nothing on either side rewrites the other's contract.

Merge is *not* blocked by the semantic risks in §7 — those are additive-path gaps that a clean merge silently preserves, not regressions introduced by the merge. They are tracked as post-merge follow-ups with their own gates.

## 2. Divergence map (what actually differs)

Upstream, composer subtree (6 modified files, 1 new directory, 2 new files):

| Path | Change |
|---|---|
| `src/Explainer.tsx` | `@remotion/google-fonts/SpaceGrotesk` → `./lib/localFonts` (`loadSpaceGrotesk`) |
| `src/CinematicRenderer.tsx` | same font swap + `SignalTexture` uses `useVideoConfig().width` instead of hardcoded `1920` |
| `src/CollageBurst.tsx`, `src/LyricOverlay.tsx`, `src/TitledVideo.tsx` | same font swap (Playfair) |
| `src/components/CaptionOverlay.tsx` | `direction: "ltr" \| "rtl" \| "auto"` with per-word script detection; words and separators split into `Fragment` siblings |
| `src/lib/localFonts.ts` (new) | `loadSpaceGrotesk(weights)`, `loadPlayfair(style, weights)`; `FontFace` + `delayRender`/`continueRender` deferred to a microtask |
| `src/fonts/*.woff2`, `src/fonts/fonts.d.ts`, `src/fonts/*-OFL.txt` (new) | bundled latin woff2 + ambient `declare module "*.woff2"` |

Upstream, everything else: 20+ new provider tools (`tools/audio/*`, `tools/graphics/*`, `tools/video/*`), provider contracts/pricing/routing, `lib/asset_cache.py`, `backlot/server.py` TrustedHost hardening, `lib/checkpoint.py` ordering + `pipeline_type` strictness, `lib/scoring.py` formatting, caption RTL fixes in `tools/video/remotion_caption_burn.py` + `video_compose.py`, ~25 new test files, `requirements.txt` (`websockets>=14.0`), `.env.example`, skills/docs.

Local, composer subtree (38 files, +8,109/−26):
`src/components/science/**` (ProcessFlow, RadialGauge, GeoMapScene, CelestialModel, CognitiveVisualWidget, kinetic engine), `src/shotkit/**` (camera/compose/data/draw/motion/tokens/type), `src/generated/shots/**` (Shot169/Shot916 and peers), `src/declarations.d.ts`, `package.json` (+d3-path/scale/shape +types), `tsconfig.json` (`resolveJsonModule`), `Root.tsx` (drop the +1 s fade pad), `Explainer.tsx` (+115: new cut types and props), `SCENE_TYPES.md`, `.gitignore`, `public/demo-props/*.json`.
Local, outside composer: `scripts/backlot_simulate_run.py` (+10: proposal stage).

## 3. Merge strategy

- Dedicated worktree at `/home/ubuntu/Documents/factory/OpenMontage-merge` on a new branch `merge/upstream-20261030` from local `main`.
- `git merge --no-ff origin/main` — a merge commit is wanted: it keeps the 9 local commits and the 52 upstream commits individually bisectable, and makes a whole-merge revert one command.
- No rebase, no squash, no `-X ours/theirs` (there is nothing to resolve textually; using a strategy option would hide future conflicts).
- `main` stays at `b8edc12` until gates pass, then fast-forwards to the merge commit. Nothing is pushed.
- Composer `node_modules` is symlinked into the worktree (upstream did not touch `package.json`/`package-lock.json`, so the dependency set is identical). `npm ci` is the fallback only if a gate reports a resolution error.

Merge commit message:

```
merge: bring origin/main (195eab2) into the composer branch

52 upstream commits since cd9f3c1. Composer-relevant changes:
bundled local fonts (src/lib/localFonts.ts + src/fonts) replacing
@remotion/google-fonts, RTL-aware CaptionOverlay direction, per-frame
width in CinematicRenderer.SignalTexture. Rest is provider refresh,
caption/ffmpeg security fixes, checkpoint ordering and pytest coverage.

Local work preserved: science scenes (ProcessFlow, RadialGauge,
GeoMapScene, ProceduralKineticScene), shotkit + generated shots
(Shot169/Shot916), Root duration without the +1s fade pad, d3 deps.

Explainer.tsx merged automatically: upstream hunk at the font import
(line 12/38-41), local hunks for science imports, Cut props and scene
branches. Merged blob verified in tree efe8bbf.
```

## 4. File-by-file conflict policy

| Path | Upstream | Local | Policy | Rule |
|---|---|---|---|---|
| `remotion-composer/src/Explainer.tsx` | font import/call | science imports, `Cut` props, 4 scene branches, ComparisonCard props | **Combine** | Keep upstream's two font lines verbatim (line 12 import, line 41 call in the merged blob), keep every local insertion. Never drop `import { ProcessFlow, RadialGauge, GeoMapScene, ProceduralKineticScene }` (33), `maybeWrapWithBg` usage, or the `kinetic_scene` branch. Acceptance: both symbol sets present in the merged file, `tsc` clean. |
| `src/CinematicRenderer.tsx`, `src/CollageBurst.tsx`, `src/LyricOverlay.tsx`, `src/TitledVideo.tsx`, `src/components/CaptionOverlay.tsx` | modified | untouched | **Upstream wins** | Take theirs byte-for-byte; do not re-add `@remotion/google-fonts` here. |
| `src/lib/localFonts.ts`, `src/fonts/**` | new | absent | **Upstream wins** | Must arrive intact: `loadSpaceGrotesk`, `loadPlayfair`, `fonts.d.ts` (`*.woff2`), 5 font/licence files. |
| `remotion-composer/package.json` | unchanged | +d3-path, d3-scale, d3-shape, @types/* | **Local wins** | Do not delete the d3 entries and do not run `npm install` to "refresh" the lock. |
| `remotion-composer/package-lock.json` | unchanged | +131 lines (d3) | **Local wins** | Lock stays as ours; it is consistent with our `package.json`. |
| `remotion-composer/tsconfig.json` | unchanged | `resolveJsonModule: true` | **Local wins** | Do not add upstream's declarations here — they live in `src/fonts/fonts.d.ts`. |
| `remotion-composer/src/declarations.d.ts` | absent | `d3-geo`, `topojson-client`, `*.json` | **Local wins** | Keep as-is; it coexists with `fonts.d.ts`. Low-severity note: `declare module "*.json"` plus `resolveJsonModule` can mask JSON typing — `tsc` is the arbiter. |
| `remotion-composer/src/Root.tsx` | unchanged | `calculateMetadata` drops the +1 s pad | **Local wins** | Composition IDs are an invariant: 13 ids, `Explainer` default 1800 frames. |
| `src/shotkit/**`, `src/generated/**`, `src/components/science/**`, `src/components/index.ts`, `SCENE_TYPES.md`, `public/demo-props/**`, `.gitignore` | untouched | added/changed | **Local wins** | Must be byte-identical to `b8edc12` after the merge. |
| `backlot/server.py`, `lib/checkpoint.py`, `lib/scoring.py`, `tools/**`, `schemas/**`, `tests/**`, `requirements.txt`, `pipeline_defs/**`, `.agents/skills/**`, `docs/**`, `.env.example` | modified/added | untouched | **Upstream wins** | Take theirs; the security and caption fixes must not be reverted. |
| `scripts/backlot_simulate_run.py` | untouched | +proposal stage | **Local wins** | Keep the local stage sequence; upstream's checkpoint changes are compatible (see risk R5). |

Anything not listed above follows the default: upstream-wins where local never touched the file, local-wins where upstream never touched it.

## 5. Ordered execution steps

Step 0 — preflight (read-only, record the rollback anchor):

```bash
cd /home/ubuntu/Documents/factory/OpenMontage
git status --porcelain            # must be empty
git rev-parse main                # expect b8edc12…
git rev-parse origin/main         # expect 195eab2…
git fetch origin --prune          # only if origin/main may have moved
git log --oneline main ^origin/main | wc -l    # expect 9
git log --oneline origin/main ^main | wc -l    # expect 52
```

Step 1 — worktree and branch:

```bash
git worktree add -b merge/upstream-20261030 \
  /home/ubuntu/Documents/factory/OpenMontage-merge main
cd /home/ubuntu/Documents/factory/OpenMontage-merge
ln -s /home/ubuntu/Documents/factory/OpenMontage/remotion-composer/node_modules \
      remotion-composer/node_modules
./remotion-composer/node_modules/.bin/tsc --version   # symlink resolves
```

Step 2 — merge:

```bash
cd /home/ubuntu/Documents/factory/OpenMontage-merge
git merge --no-ff origin/main -F /tmp/om-merge-msg.txt   # body from §3
git status --porcelain            # must be empty: no conflict, nothing staged
git log --oneline -1              # merge commit on top of both parents
```

If `git merge` reports a conflict in `Explainer.tsx` (it should not — merge base analysis says clean), resolve by keeping the merged body: upstream's two font lines plus all local insertions, then `git add` and continue. Any other conflicted file means the premise changed: stop, `git merge --abort`, and re-run `git merge-tree --write-tree main origin/main` before proceeding.

Step 3 — gates G1–G5 (§6). All must pass before touching `main`.

Step 4 — audit that local-owned files are unchanged by the merge:

```bash
cd /home/ubuntu/Documents/factory/OpenMontage-merge
git diff --stat b8edc12 HEAD -- \
  remotion-composer/src/shotkit remotion-composer/src/generated \
  remotion-composer/src/components/science remotion-composer/src/components/index.ts \
  remotion-composer/src/Root.tsx remotion-composer/src/declarations.d.ts \
  remotion-composer/tsconfig.json remotion-composer/package.json \
  remotion-composer/package-lock.json remotion-composer/SCENE_TYPES.md \
  remotion-composer/public/demo-props scripts/backlot_simulate_run.py .gitignore
# expect: no output
```

Step 5 — review gate (fresh session, no build history; AGENTS.md gate 3, see `docs/PR_REVIEW_GUIDE.md`): reviewer reads `git diff b8edc12..HEAD -- remotion-composer/` and confirms (a) upstream font/caption changes intact, (b) all local scene branches and shotkit files intact, (c) no stray `@remotion/google-fonts` reintroduced into the five upstream-converted files, (d) no change to `package.json`/lock/tsconfig/`Root.tsx`. Reviewer writes a markdown report with `file:line` citations.

Step 6 — land on local `main` only after the review report exists:

```bash
cd /home/ubuntu/Documents/factory/OpenMontage
git merge --ff-only merge/upstream-20261030
git log --oneline -1
```

Step 7 — cleanup:

```bash
cd /home/ubuntu/Documents/factory/OpenMontage
git worktree remove /home/ubuntu/Documents/factory/OpenMontage-merge
git branch -d merge/upstream-20261030
```

Step 8 — push is a separate, explicit decision: `git push origin main` only after the review report is attached to the merge commit notes. Nothing in this plan pushes.

## 6. Gates and pass criteria

Run all from the merge worktree. Measured baselines are from current `main` (`b8edc12`), so any delta is attributable to the merge.

G1 — type gate (strongest signal, 4 s):

```bash
cd /home/ubuntu/Documents/factory/OpenMontage-merge/remotion-composer
./node_modules/.bin/tsc --noEmit -p tsconfig.json
```
Pass: exit 0, no diagnostics. Baseline: 0 errors in 4.1 s.

G2 — composition smoke (bundle + evaluate the real entrypoint; catches a missing `localFonts.ts`, a broken font import, or a duplicated `registerRoot`):

```bash
./node_modules/.bin/remotion compositions src/index.tsx
```
Pass: exit 0 and exactly these 13 ids with unchanged frame counts:
`Explainer 1800`, `CinematicRenderer 900`, `SignalFromTomorrowWithMusic 900`, `TalkingHead 9000`, `TitledVideo 1800`, `HeroTitle 510`, `ProductReveal 240`, `ProductRevealVertical 240`, `CaptionOverlayOnly 9000`, `CollageBurst 900`, `LyricOverlay 840`, `EndTag 165`, `EndTagOverlay 246`.

G3 — generated-shot smoke (protects Shot169/Shot916, which are separate bundles from `Root`):

```bash
./node_modules/.bin/remotion compositions src/generated/shots/scale.tsx
```
Pass: exit 0, `Shot169` and `Shot916` listed (`120` frames each). Baseline verified.

G4 — contract/test subset (offline; `tests/conftest.py` blocks sockets):

```bash
cd /home/ubuntu/Documents/factory/OpenMontage-merge
../OpenMontage/.venv/bin/python -m pytest -q \
  tests/contracts/test_phase0_contracts.py \
  tests/backlot/test_server.py \
  tests/tools/test_remotion_caption_burn.py \
  tests/contracts/test_caption_rtl_direction_contract.py
```
Pass: 0 failed, 0 errors. Baseline on main: the first two files give `46 passed in 8.41s`; the last two are new upstream files and will add to the count.

G5 — Python import smoke for the one local script the merge touches indirectly:

```bash
cd /home/ubuntu/Documents/factory/OpenMontage-merge
../OpenMontage/.venv/bin/python - <<'PY'
import importlib.util, pathlib
p = pathlib.Path("scripts/backlot_simulate_run.py")
spec = importlib.util.spec_from_file_location("sim_under_test", p)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
assert callable(m.main)
print("sim import ok")
PY
```
Pass: prints `sim import ok`, exit 0. (Module-level imports cover `lib.checkpoint`, `lib.events` — the two modules upstream changed.)

Optional G6 (only if a visual question remains): one Explainer still render through the existing visual-eval harness, `scripts/backlot_visual_eval.py`, on a fixture with a caption cut and a `comparison` cut.

Failure triage:
- G1 fails in local files → merge took upstream's version of a file we own; re-check §4 policy (expected offender: `declarations.d.ts` vs `fonts.d.ts`); fix by restoring the local file, not by editing upstream's.
- G2/G3 fail at bundle time → missing `src/fonts/**` or `src/lib/localFonts.ts` (incomplete merge of the new directory); re-run `git checkout origin/main -- remotion-composer/src/fonts remotion-composer/src/lib/localFonts.ts`.
- G4 fails only in new upstream tests → find whether the failure is pre-existing on `origin/main` by checking out `origin/main` into a scratch worktree; do not "fix" upstream tests inside a merge commit.
- G4 fails in `tests/backlot/test_server.py` with 400/host errors → that is the TrustedHost change (R5); the test should pass on loopback, so a failure means an env/hostname issue, not a merge defect.

## 7. Top 5 semantic risks a clean textual merge hides

R1 — **Two font-loading regimes survive the merge.** Upstream deleted every `@remotion/google-fonts` import from the composer (`git grep '@remotion/google-fonts' origin/main -- remotion-composer/src` returns only a comment in `localFonts.ts`), but the four local generated shots still import it: `src/generated/shots/scale.tsx:12`, `src/generated/shots/spike.tsx:14`, `src/generated/shots/cross-section.tsx:10`, `src/generated/shots/timeline.tsx:11`. The merge cannot flag this — the files are local-only. Consequence: Shot169/Shot916 renders still fetch `fonts.gstatic.com` at render time, which is exactly the failure mode upstream's bundled-font commit exists to remove. Mitigation (follow-up F1): swap those four imports to `loadSpaceGrotesk` from `src/lib/localFonts`; G3 proves the bundle still evaluates.

R2 — **Asset-staging whitelist does not know the new ComparisonCard image props.** Upstream widened the staging walker to `media_keys = {"source", "src", "backgroundSrc", "backgroundImage", "backgroundVideo", "images"}` (`tools/video/video_compose.py:899` on `origin/main`), but local `Cut` carries `leftImage`/`rightImage` (`remotion-composer/src/Explainer.tsx:213–214`, passed at `648–649`) and `ComparisonCard` uses them (`src/components/ComparisonCard.tsx:21–22, 45–46`). Those keys are not staged and not rewritten, so a relative path reaches `resolveAsset` → `staticFile()` → a `public/` URL for a file that was never copied there (404, blank panel). Absolute paths still work (they become `file://`). Mitigation (F2): add `leftImage`, `rightImage` to `media_keys` in a separate local commit after the merge, plus a contract test.

R3 — **`Root.calculateMetadata` is a silent local override of a duration contract.** Upstream did not touch `src/Root.tsx`; the merge therefore keeps our `Math.max(1, Math.ceil(lastEnd * 30))` (no `+1 s` fade pad) at `src/Root.tsx:131` while upstream's new renderers and caption paths assume their own timing. No conflict will ever surface here. That is why G2 pins `Explainer 1800` and the other 12 frame counts: if any future upstream change adjusts padding expectations, the composition table changes and the gate fails instead of the render running short.

R4 — **CaptionOverlay's contract changed under our Explainer.** Upstream rewrote the word rendering: `direction` prop with script detection (`src/components/CaptionOverlay.tsx:38` prop, `:44` `detectDirection`) and separators moved out of the word `span` into sibling text nodes (`:138` `Fragment`). Our `Explainer.tsx:992` still calls `CaptionOverlay` without `direction` (safe default `"auto"`), but any local caller that baked spaces into `word` text now double-spaces, and any caller that relied on the old single-node layout will measure differently. Textual merge says nothing about this. Mitigation: G4 (`test_caption_rtl_direction_contract.py`) plus one visual check of a caption cut (G6/F3) before trusting caption output.

R5 — **Backlot and checkpoint hardening tightens two contracts our demo path touches.** `backlot/server.py:310` now installs `TrustedHostMiddleware(allowed_hosts=["127.0.0.1", "localhost"])`: any access to the board through a LAN or Tailscale hostname returns 400, which matters on this VM (`scripts/backlot_watch_captures.py:27` already defaults to `http://127.0.0.1:4750`, so in-repo tooling is fine, but a browser opened by IP will break). Separately, `lib/checkpoint.py` now validates before merging the decision log (`:546` validate, `:550` merge) and `get_completed_stages` requires the checkpoint's `pipeline_type` to match (`:621`); `scripts/backlot_simulate_run.py` passes `pipeline_type="cinematic"` (`:86`), so it stays compatible, but it also imports its fixture from a test module (`scripts/backlot_simulate_run.py:92` → `tests/contracts/test_phase0_contracts.sample_artifact`), and upstream edited that very test file (+24 lines). A future fixture refactor breaks the demo script with no merge warning. Mitigation: G4 + G5.

Lower-severity, tracked but not gated: `declarations.d.ts`'s `declare module "*.json"` plus `resolveJsonModule` can shadow JSON typing (tsc decides); `@remotion/google-fonts` stays in `package.json` as a now-mostly-unused dependency (only the four generated shots use it) — do not remove it in this merge.

## 8. Rollback

Anchors: `main` before merge = `b8edc12`; merge commit = first line of `git log --oneline -1` in the worktree.

Before `main` moves (any gate fails, or review rejects):

```bash
cd /home/ubuntu/Documents/factory/OpenMontage
git worktree remove --force /home/ubuntu/Documents/factory/OpenMontage-merge
git branch -D merge/upstream-20261030
git rev-parse main        # still b8edc12
```
Nothing is lost: the upstream commits were never on a local ref other than `origin/main`, which is untouched.

After `main` fast-forwards but before any push:

```bash
git reset --hard b8edc12
git branch -D merge/upstream-20261030   # if it still exists
git clean -nd                            # inspect, then -fd only for stray untracked build output
```
`git reset --hard` is safe here *because* `main` is not pushed; this is the only destructive step in the plan and it is local-only.

After a push (out of scope for this plan): `git revert -m 1 <merge-sha>` and push the revert; never force-push `origin/main`, never rebase published history.

## 9. Post-merge follow-ups (not blockers, each its own commit)

- F1: migrate `src/generated/shots/{scale,spike,cross-section,timeline}.tsx` to `loadSpaceGrotesk` from `src/lib/localFonts`; then `@remotion/google-fonts` has zero composer importers and can be dropped from `package.json` in a dependency-only commit. Gate: G1 + G3.
- F2: add `leftImage`/`rightImage` (and any `kineticSpec` media keys) to `video_compose.media_keys`, with a contract test that a relative ComparisonCard image is staged. Gate: new test + G4.
- F3: pass `direction` explicitly from local caption callers where the script is known; verify with the RTL contract test.
- F4: run the visual-eval harness once over an Explainer fixture containing a caption cut and a `comparison` cut; attach the capture to the merge report.

## Appendix A — measured baselines (current `main`, `b8edc12`)

```
$ ./node_modules/.bin/tsc --noEmit -p tsconfig.json      → exit 0, real 0m4.1s
$ ./node_modules/.bin/remotion compositions src/index.tsx → exit 0, 13 compositions
Explainer 30 1920x1080 1800 | CinematicRenderer 900 | SignalFromTomorrowWithMusic 900
TalkingHead 9000 | TitledVideo 1800 | HeroTitle 510 | ProductReveal 240
ProductRevealVertical 240 | CaptionOverlayOnly 9000 | CollageBurst 900
LyricOverlay 840 | EndTag 165 | EndTagOverlay 246
$ ./node_modules/.bin/remotion compositions src/generated/shots/scale.tsx → Shot169 120, Shot916 120
$ .venv/bin/python -m pytest tests/contracts/test_phase0_contracts.py tests/backlot/test_server.py -q
  → 46 passed in 8.41s
```

## Appendix B — command to re-verify the merge premise at any time

```bash
cd /home/ubuntu/Documents/factory/OpenMontage
git merge-tree --write-tree main origin/main   # expect exit 0 + a tree hash, no conflict block
git diff --name-only cd9f3c1 main -- remotion-composer | sort > /tmp/local.txt
git diff --name-only cd9f3c1 origin/main -- remotion-composer | sort > /tmp/upstream.txt
comm -12 /tmp/local.txt /tmp/upstream.txt      # expect exactly src/Explainer.tsx
```
