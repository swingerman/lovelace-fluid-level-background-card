---
name: cut-release
description: Prepare a draft GitHub release for the fluid-level-background-card with user-focused release notes. Use when asked to "cut a release", "do a release", "prepare a release", "draft a release", "write release notes", "ship a version", or "publish a release". Bumps the version + HACS HA floor when needed, then drafts notes written from the user's point of view — features as capabilities with optional video placeholders, and dependabot collapsed into a one-line maintenance summary.
---

# Cut a release

Produce a **draft** GitHub release whose notes read like a changelog *for users*, then
hand off so the maintainer can drop in demo videos and publish. Publishing fires
`.github/workflows/release.yml`, which builds and attaches `fluid-level-background-card.js`
(the asset HACS serves). HACS versions by the **git tag**, so a draft doesn't tag until
published.

## Voice — write for the user, not the committer

This is the point of the skill. Describe what the release **lets the user do**, never what
we did to the code.

- ❌ "Added wave_height and wave_speed sliders"
- ❌ "We implemented live wave updates"
- ✅ "**Customize the wave motion** — new Wave Height and Wave Speed sliders in the
  editor's Appearance tab let you dial the surface from flat-calm to choppy. Set either to
  0 for still water."

Rules:

- Second person, active, present tense: "You can now…", "Choose…", "The card now shows…".
- Lead with the capability/benefit, then one line of how (where the control lives).
- Group by **capability, not by PR**. One feature may span several PRs — describe it once.
- Only describe **newly delivered, user-facing** features. Refactors, tests, deps, and
  tooling are not features and never get their own entry.

## Structure

```
> ⚠️ **Requires Home Assistant <X.Y>+** — <one line why, ONLY if the floor changed>

### 💛 Support this card
<PayPal + Buy-me-a-coffee badges — copy verbatim from the latest published release>

## What's new

### <Capability title>
<1–3 sentences, user POV: what it enables + where the control is.>

<!-- 📹 Drag a demo clip here before publishing -->

### <Next capability…>
…

### Maintenance
🔧 <N> dependency updates and <M> CI/tooling changes. <Optionally 1–2 notable
human-authored fixes, phrased user-POV.>

**Full Changelog**: https://github.com/swingerman/lovelace-fluid-level-background-card/compare/<prev-tag>...<new-tag>
```

- **Keep the Support block, and keep it prominent — near the top, never buried at the end.**
  Copy the PayPal + Buy-me-a-coffee badges verbatim from the latest published release so the
  links stay current. Place it right under the requirement note (or first, if there's no
  requirement line), above **What's new**.
- **Never list dependabot PRs individually** — collapse them to the count in Maintenance.
- Keep Maintenance to a few lines. Surface a human fix only if a user would notice it, then
  say it user-POV: "Decimal `full_value` below 1.0 now renders correctly."
- Keep `<!-- 📹 -->` markers only where a clip actually helps (visual/animation features);
  drop them otherwise.

## Steps

1. **Version + HA floor.** Confirm the version number and whether the minimum HA version
   changed (a new HA-only API/component shipped). If it changed, set `hacs.json`
   `"homeassistant": "<X.Y.0>"` and write the requirement line; otherwise omit it.
2. **Bump `package.json` `version`** (the card's console banner reads it). Land the bump +
   any hacs floor via a small PR and merge before tagging.
3. **Enumerate PRs** since the last tag — to *count and curate*, not to paste:
   ```
   gh api repos/swingerman/lovelace-fluid-level-background-card/releases/generate-notes \
     -f tag_name=<new-tag> -f previous_tag_name=<prev-tag> -f target_commitish=master --jq '.body'
   ```
4. **Curate:**
   - Features = `feat:` / `enhancement`-labelled PRs → rewrite each in user POV (see Voice).
     Label feature PRs `enhancement` so they're easy to spot next time.
   - `@dependabot[bot]` lines → the dependency-update count. Remaining human
     `ci:`/`chore:`/`build:` PRs → the tooling count. → one Maintenance line.
5. **Create the draft** (videos go in before publish):
   ```
   gh release create <new-tag> --target master --draft \
     --title "<new-tag> — <headline capability>" --notes-file <body.md>
   ```
6. **Hand off:** ask the maintainer to drop demo videos at the markers (MP4/MOV ≤100 MB,
   dragged into the web editor — only user-attachment uploads render an inline player; release
   assets and plain URLs do not) and hit **Publish**.

## Gotchas

- The pre-commit husky hook is currently broken (a `src/tsconfig.json` resolution bug).
  JSON-only commits (hacs.json/package.json) pass; `.ts` commits may need `--no-verify`
  *after* confirming `npm run lint` (0 errors), `tsc --noEmit`, tests, and build pass.
- `.github/release.yml` tries to exclude author `dependabot`, but the login is
  `dependabot[bot]`, so the auto-notes still include every bot PR — which is exactly why
  this skill curates by hand instead of using `--generate-notes` output as-is.
