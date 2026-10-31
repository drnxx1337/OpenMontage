# Code review — composer upstream merge

- **Worktree:** `/home/ubuntu/Documents/factory/OpenMontage-merge`
- **Merge commit:** `9d6470d` — "merge: bring origin/main (195eab2) into the composer branch"
- **Parents:** `b8edc12` (local composer tip) + `195eab2` (origin/main)
- **Merge base:** `cd9f3c1f03368be87b140af494914b8ee4e3c7a4`
- **Diff under review:** `git diff b8edc12..9d6470d` — 169 files, +22,211 / −1,062 (96 added, 71 modified, 2 deleted)
- **Reviewed by:** fresh-context code reviewer, read-only (no source edits, no worktree mutation)
- **Date:** 2026-10-30

## Verdict

**PASS WITH FINDINGS** — the merge commit is a byte-exact replay of git's own 3-way merge, no local work was lost, and the single textual overlap (`Explainer.tsx`) resolved correctly. One MEDIUM finding, environmental and not part of the commit: an untracked, un-ignored `node_modules` symlink that a careless `git add -A` would commit as a machine-specific absolute path.

---

## 1. Merge integrity — PASS

| Check | Command | Result |
|---|---|---|
| Merge commit is HEAD | `git log --oneline -1` | `9d6470d merge: bring origin/main (195eab2)…` |
| Parent order | `git rev-parse HEAD^1 HEAD^2` | `HEAD^1 = b8edc12` (local), `HEAD^2 = 195eab2` (upstream) |
| Local tip preserved | `git merge-base --is-ancestor b8edc12 9d6470d` | exit 0 — is ancestor |
| Upstream tip preserved | `git merge-base --is-ancestor 195eab2 9d6470d` | exit 0 — is ancestor |
| Commit accounting | `git log --oneline b8edc12..9d6470d \| wc -l` | `53` = 49 upstream non-merge + 3 upstream merges (`195eab2`, `9327439`, `4f13650`) + this merge commit |
| Local commits reachable from HEAD, not from upstream | `git log --oneline 195eab2..9d6470d` | 9 commits, `4a89e1a` … `b8edc12` — full local chain intact |

The decisive check is an independent reproduction of the merge:

```
$ git merge-tree --write-tree b8edc12 195eab2
efe8bbf63df7f7e8c4baf6178c1fc66d9374cf74      # exit 0, no conflicts
$ git rev-parse 9d6470d^{tree}
efe8bbf63df7f7e8c4baf6178c1fc66d9374cf74      # identical
```

The committed tree equals the tree git itself produces from the two parents. The merge therefore contains **no hand edits, no dropped hunks, and no content added outside the 3-way merge** ("evil merge" ruled out structurally, not by sampling).

Cross-check by side: 41 paths differ between the merge base and `b8edc12`, 169 between the base and `195eab2`, and exactly **one** path (`remotion-composer/src/Explainer.tsx`) differs on both sides — matching the brief. Of those 41 locally-changed paths, **40 are byte-identical in the merge** and only `Explainer.tsx` changed by design:

```
$ for f in $(git diff --name-only cd9f3c1 b8edc12); do … done
PRESERVED  .gitignore, launch_backlot.sh, remotion-composer/{SCENE_TYPES.md,package.json,package-lock.json,tsconfig.json}
PRESERVED  remotion-composer/public/demo-props/{saturn-hexagon-full,saturn-hexagon-pilot,test_kinetic_magnetosphere}.json
PRESERVED  remotion-composer/src/{Root.tsx,declarations.d.ts}  + components/{ComparisonCard,charts/BarChart,charts/LineChart,index}
PRESERVED  remotion-composer/src/components/science/**  (6 files incl. kinetic/*)
PRESERVED  remotion-composer/src/generated/shots/**     (7 files)
PRESERVED  remotion-composer/src/shotkit/**             (8 files)
PRESERVED  scripts/backlot_simulate_run.py
CHANGED    remotion-composer/src/Explainer.tsx          ← intended font migration, see §4
```

## 2. Conflict hygiene — PASS

- `git diff --check b8edc12 9d6470d` (exit 2) reports three whitespace notices, none of them merge damage:
  - `remotion-composer/src/fonts/PlayfairDisplay-OFL.txt:21` and `SpaceGrotesk-OFL.txt:21` — trailing space inside upstream's SIL OFL licence text (verbatim upstream file, not ours to reflow);
  - `tests/tools/test_clip_cache.py:549` — "new blank line at EOF"; this file is byte-identical to upstream (`git diff 195eab2 9d6470d -- tests/tools/test_clip_cache.py` is empty), so it arrives from `cf9f03c`, not from conflict resolution.
- `git diff --check 195eab2 9d6470d` reports one more: `remotion-composer/src/components/index.ts:22` blank line at EOF — pre-existing local content (present at `b8edc12`), not introduced here.
- Conflict markers: `git grep -E '^(<{7}|={7}|>{7})( |$)'` over the merged tree returns **zero** matches (exit 1); the same pattern over the working tree (excluding `node_modules/` and `.git/`) also returns nothing.

## 3. Local invariants — PASS (byte-identical)

Blob OIDs compared between `b8edc12` and `9d6470d`; every path below is identical, and `git diff --stat b8edc12 9d6470d -- <paths>` is empty:

| Invariant | Blob at `b8edc12` = `9d6470d` |
|---|---|
| `remotion-composer/src/shotkit/` | `c5fb1520…` |
| `remotion-composer/src/generated/` | `f9e744a1…` |
| `remotion-composer/src/components/science/` | `3979f3d8…` |
| `remotion-composer/src/Root.tsx` | `0c38f1d0…` |
| `remotion-composer/package.json` | `2e9d9688…` |
| `remotion-composer/package-lock.json` | `e5a73596…` |
| `remotion-composer/tsconfig.json` | `5204c508…` |
| `remotion-composer/public/demo-props/` | `8878d626…` |
| `scripts/backlot_simulate_run.py` | `714188a1…` |
| `.gitignore` | `c3511a2a…` |

Dependency sanity: upstream changed `remotion-composer/package.json` **not at all** (`git diff cd9f3c1 195eab2 -- remotion-composer/package.json` empty), so keeping the local file whole cannot strip an upstream dependency. Local additions (`d3-path ^3.1.0`, `d3-scale ^4.0.2`, `d3-shape ^3.2.0` and their `@types/*`) are what the science/kinetic scenes need, and the only external modules imported by the merged composer sources are `remotion`, `react`, `@remotion/media-utils` — all declared.

## 4. `Explainer.tsx` (the only overlap) — PASS

`git diff b8edc12 9d6470d -- remotion-composer/src/Explainer.tsx` is **+2 / −5, entirely font lines**:

```diff
-import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";
+import { loadSpaceGrotesk } from "./lib/localFonts";      # merged line 12
-const { fontFamily } = loadFont("normal", {
-  weights: ["400", "700"],
-  subsets: ["latin"],
-});
+const { fontFamily } = loadSpaceGrotesk(["400", "700"]);   # merged line 41
```

That is exactly upstream's contribution to this file: `git diff b8edc12 195eab2 -- …/Explainer.tsx` is +2 / −120, where the **only two insertions are those same two font lines** and the 120 deletions are the local-only science code upstream does not have. Both upstream font hunks are present in the merge.

Every local insertion survives, at its merged line:

- `remotion-composer/src/Explainer.tsx:33` — `import { ProcessFlow, RadialGauge, GeoMapScene, ProceduralKineticScene } from "./components/science";`
- `remotion-composer/src/Explainer.tsx:34` — `import type { ProcessStep, VisualModelConfig, KineticSceneSpec } from "./components/science";`
- `remotion-composer/src/Explainer.tsx:216`, `277`–`296` — `changeDirection`, Easy-Science props, `visualModel`/`leftVisual`/`rightVisual`, habitat/geo props, `kineticSpec`
- `remotion-composer/src/Explainer.tsx:650`, `654` — `leftVisual` / `changeDirection` passed to `ComparisonCard`
- `remotion-composer/src/Explainer.tsx:766` `process_flow`, `:784` `radial_gauge`, `:809` `habitat_map`/`geo_map`, `:828` `kinetic_scene` — all four scene branches intact (4/4, `grep -c`)

File length 1,038 → 1,035 lines, consistent with +2/−5.

`@remotion/google-fonts` is **not** reintroduced into any of the five upstream-converted files. `git grep '@remotion/google-fonts'` at HEAD hits only:

- `remotion-composer/package.json:13`, `package-lock.json:13,832,834` — the dependency, still declared (unchanged local file);
- `remotion-composer/src/lib/localFonts.ts:10` — a comment;
- `remotion-composer/src/generated/shots/{cross-section.tsx:10,scale.tsx:12,timeline.tsx:11}` and `src/generated/spike.tsx:14` — **local** generated shots, byte-identical to `b8edc12` and frozen by the invariant, so they legitimately keep the runtime loader the package still provides.

`loadSpaceGrotesk(weights[])` / `loadPlayfair(style, weights[])` signatures in `remotion-composer/src/lib/localFonts.ts:52`–`54` match every call site the merge produces (`CinematicRenderer.tsx` 400/500/700, `TitledVideo.tsx` 400/700/900, `CollageBurst.tsx` normal+italic, `LyricOverlay.tsx` italic).

## 5. Full-diff scan — PASS

- **Deletions** — the only two are `assets/sponsors/atlas-cloud.png` and `assets/sponsors/bloome.png`, from upstream `f11bf79 "Remove Bloome and Atlas Cloud sponsor listings"`. The merge base held both, and `git log cd9f3c1..b8edc12 -- assets/sponsors/` is empty, so no local work referenced or lost them. All other deletions are upstream rewrites inside files that survive.
- **Unrelated changes** — the merged diff is exactly upstream's 169-file change set plus the two `Explainer.tsx` font lines; nothing outside the merge's purpose.
- **Debug leftovers** — zero hits in added Python/TS/TSX lines for `console.log`, `debugger;`, `pdb.set_trace`, `breakpoint()`, and zero `TODO`/`FIXME` in the entire added set.
- **Secrets** — pattern scan (`api_key|secret|password|bearer|sk-…|AKIA…|BEGIN PRIVATE KEY|xox?-|ghp_|AIza…`) over every added line returns only environment-variable *names* in docs/`.env.example` (empty values, e.g. `LTX_API_KEY=`) and test fixtures using `"test"` / `"fake-key"` / `"test-key"`. No literal credential.
- **Injection sinks** — no `shell=True`, `os.system(`, `eval(`, `exec(`, `pickle.load`, `yaml.load(`, `verify=False`, or bare `except: pass` in added Python; no `dangerouslySetInnerHTML`, `innerHTML =`, or `eval(` in added TS/TSX.
- **Execution evidence**
  - `node_modules/.bin/tsc --noEmit -p .` in `remotion-composer/` → **exit 0** (TypeScript 5.9.3, node v24.22.1). The merged composer, including the overlap file and the local science scenes, typechecks.
  - `pytest -q tests/contracts` → **1270 passed, 7 skipped** (27.1 s).
  - `pytest -q tests/tools/test_corpus_builder_path_traversal.py tests/tools/test_showcase_card_security.py` → **49 passed** (2.2 s).
  - `ast.parse` over all 126 changed `.py` files → no syntax errors.
- **Not verified:** no Remotion bundle/render was run (would need a full `npx remotion` build), and the wider `tests/tools`, `tests/lib` suites were not run — they are outside the merge's composer surface and upstream's own state.

---

## Findings

### [MEDIUM] Untracked, un-ignored `node_modules` symlink would be committed by `git add -A`

**File:** `remotion-composer/node_modules` (working-tree symlink; not in the commit)
**Evidence:**

```
$ ls -ld remotion-composer/node_modules
lrwxrwxrwx … remotion-composer/node_modules -> /home/ubuntu/Documents/factory/OpenMontage/remotion-composer/node_modules
$ git status --porcelain=v1
?? remotion-composer/node_modules
$ git add -n -A .
add 'remotion-composer/node_modules'
```

**Failure mode:** `.gitignore:80` is `node_modules/`, whose trailing slash matches **directories only**; a symlink is a file to git, so the rule does not apply (`git check-ignore` exits 1). Any commit made with `git add -A` / `git add .` from this worktree stages a single symlink blob whose content is the absolute path `/home/ubuntu/Documents/factory/OpenMontage/remotion-composer/node_modules`. After push, every other checkout gets a dangling symlink pointing into one developer's filesystem, and the repo carries a machine-specific path.
**Why existing guards don't catch it:** `git commit -a` only stages tracked modifications, so this is limited to explicit `-A`/`.` staging; and the invariant freezes `.gitignore` byte-for-byte, so the pattern cannot be widened here.
**Impact on this merge:** none — `9d6470d` is already created and does not contain the symlink. The risk is the next commit made from this worktree.
**Fix (no source change required):** add `remotion-composer/node_modules` to `.git/info/exclude` in this worktree, or stage with `git add -u` / explicit paths.
**Confidence:** high (proven by the dry-run staging output).

### Observations (not defects — no action requested)

- **INFO** `remotion-composer/src/generated/shots/{cross-section,scale,timeline}.tsx`, `src/generated/spike.tsx` still load Space Grotesk over the network via `@remotion/google-fonts`, so the offline-render benefit of `src/lib/localFonts.ts` does not extend to those four local shots. They are frozen by the `generated/` invariant and the dependency is retained, so nothing is broken; migrating them is separate work.
- **INFO** Upstream's `SignalTexture` change (`remotion-composer/src/CinematicRenderer.tsx:119`–`130`) now derives the right-edge offset from `useVideoConfig().width` instead of a hardcoded `1920`. It merged cleanly alongside the font hunks and typechecks; noting it because that file changed on the upstream side too, so it is the second place a reviewer should look after `Explainer.tsx`.

---

## Review summary

| Severity | Count | Status |
|---|---|---|
| CRITICAL | 0 | pass |
| HIGH | 0 | pass |
| MEDIUM | 1 | info (environmental, outside the commit) |
| LOW | 0 | pass |

**Verdict: PASS WITH FINDINGS.** The merge is mechanically faithful — the committed tree equals `git merge-tree b8edc12 195eab2` exactly — no local commit or hunk was lost, no conflict marker survives, all frozen local invariants are byte-identical, and the single overlap file carries both upstream font lines and all local science code. The one MEDIUM finding concerns worktree staging hygiene, not the merge commit; safe to push `9d6470d`.
