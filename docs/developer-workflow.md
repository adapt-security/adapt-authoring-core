# Developer workflow

This guide covers day-to-day development workflows for the Adapt authoring tool, with a focus on managing parallel streams of work across the multi-repo architecture.

## Quick navigation

- [How the project is structured](#how-the-project-is-structured)
- [Local development environment](#local-development-environment)
- [Workflow 1: Single-module bug fix](#workflow-1-single-module-bug-fix)
- [Workflow 2: Multi-module feature](#workflow-2-multi-module-feature)
- [Workflow 3: Hotfix during feature work](#workflow-3-hotfix-during-feature-work)
- [Workflow 4: Patching an older release line](#workflow-4-patching-an-older-release-line)
- [Coordinating releases](#coordinating-releases)
- [Version pinning strategy](#version-pinning-strategy)
- [Common pitfalls](#common-pitfalls)

## How the project is structured

Understanding the release pipeline is essential to choosing the right workflow.

```
┌─────────────────────────────────────────────────────────┐
│  adapt-authoring (parent)                               │
│  ├── Depends on 43+ adapt-authoring-* modules           │
│  ├── Released manually via workflow_dispatch             │
│  └── Runs integration tests across all modules          │
│                                                         │
│  Each module (api/, core/, auth/, multilang/, etc.)      │
│  ├── Is a separate git repository                       │
│  ├── Has its own CI (linting, tests, releases)          │
│  ├── Releases automatically on merge to master          │
│  └── Published to npm or GitHub Packages                │
└─────────────────────────────────────────────────────────┘
```

**Key implication:** Merging a PR to a module's `master` branch triggers an immediate release via semantic-release. There is no staging step between merge and publish. This makes merge timing critical when coordinating multi-module changes.

## Local development environment

### Directory layout

The recommended local setup keeps all repos in a single parent directory:

```
AAT/
├── adapt-authoring/        # Parent application (npm workspaces)
├── api/                    # adapt-authoring-api (own git repo)
├── auth/                   # adapt-authoring-auth (own git repo)
├── core/                   # adapt-authoring-core (own git repo)
├── multilang/              # @cgkineo/adapt-authoring-multilang
├── server/                 # adapt-authoring-server (own git repo)
├── ...                     # 40+ more module repos
└── adapt-authoring/
    └── local_adapt_modules/  # Symlinks or clones used by workspaces
```

### How local testing works

The parent `adapt-authoring/` uses npm workspaces pointed at `local_adapt_modules/*`. When a module is present in that directory, npm resolves it locally instead of from the registry. This means you can test changes to any module without publishing first.

```bash
# Link a module for local development
cd adapt-authoring/local_adapt_modules
ln -s ../../api adapt-authoring-api

# Reinstall to pick up the local link
cd ..
npm install --legacy-peer-deps
```

### Running the application locally

```bash
cd adapt-authoring
npm start              # Production mode
npm run debug          # With --inspect flag for debugger
```

### Running tests

```bash
# Integration tests (from parent — boots app + MongoDB)
cd adapt-authoring
npm test

# Unit tests (from a specific module)
cd api
npm test               # Runs: node --test tests/**/*.spec.js

# Linting (from any module)
npx standard
```

## Workflow 1: Single-module bug fix

This is the most common workflow. A bug exists in one module and needs to be fixed and released.

### Steps

```bash
# 1. Start from a clean master
cd api
git checkout master && git pull origin master

# 2. Create a branch
git checkout -b issue/1234

# 3. Make changes, lint, and test
#    ... edit files ...
npx standard
npm test

# 4. Commit with the correct prefix
git commit -m "Fix: Prevent crash when uploading empty file (fixes #1234)"

# 5. Push and create PR
git push -u origin issue/1234
gh pr create --title "Fix: Prevent crash when uploading empty file" \
  --body "### Fixes #1234

### Fix
* Prevent crash when req.file is undefined on upload endpoint

### Testing
1. Upload an empty file via the UI
2. Verify no 500 error"
```

### What happens after merge

1. GitHub Actions runs semantic-release on the module
2. A new patch version is published (e.g. `3.3.0` → `3.3.1`)
3. The parent `adapt-authoring` repo still pins the old exact version — **the fix does not reach production until you explicitly bump it**
4. A main repo release (manual) picks up the new version when you're ready

This is by design. The parent uses [exact version pinning](#version-pinning-strategy), so no module update reaches production until a developer deliberately updates `package.json`.

### Getting the fix to production

Update the pinned version in the parent to the newly released patch:

```bash
cd adapt-authoring
git checkout master && git pull origin master

# Update the dependency to the specific patch version
npm install adapt-authoring-api@3.3.1 --save-exact --legacy-peer-deps

# Commit the dependency bump
git add package.json package-lock.json
git commit -m "Upgrade: Bump adapt-authoring-api to v3.3.1 (refs #1234)"
git push origin master

# Trigger the release workflow from GitHub Actions UI
# or via CLI:
gh workflow run release.yml
```

Because versions are pinned exactly, this bump includes *only* the bugfix — no unrelated features are pulled in.

## Workflow 2: Multi-module feature

A new feature spans multiple modules — for example, adding multilingual support to the asset pipeline might touch `multilang`, `assets`, `api`, and `ui`.

### Phase 1: Branch all affected modules

```bash
# Create feature branches in each affected module
for module in multilang assets api ui; do
  cd /path/to/AAT/$module
  git checkout master && git pull origin master
  git checkout -b feature/multilang-assets
done
```

Use a consistent branch name across all modules — this makes it obvious which branches belong together.

### Phase 2: Develop and test locally

Work across the modules as needed. The local workspace setup means all your changes are picked up without publishing:

```bash
# Run the full application with all your local changes
cd adapt-authoring
npm start

# Run integration tests against your combined changes
npm test
```

**Important:** Regularly test your feature branches against `master` of all other modules. This catches integration issues early and prevents surprises at merge time.

### Phase 3: Create PRs — but do not merge yet

Create a PR in each affected module. Use the PR description to cross-reference the related PRs:

```bash
cd multilang
git push -u origin feature/multilang-assets
gh pr create --title "New: Add multilingual asset pipeline support" \
  --body "### Fixes #42

Part of the multilingual assets feature. Related PRs:
- adapt-security/adapt-authoring-assets#15
- adapt-security/adapt-authoring-api#28
- adapt-security/adapt-authoring-ui#33

### New
* Add language metadata to asset schema

### Testing
1. Upload an asset with language metadata
2. Verify filtering works in the asset browser"
```

### Phase 4: Review and approve all PRs

Get all PRs reviewed and approved, but **do not merge them individually**. Merging one module triggers a release of that module, and the feature may not work without the other modules being updated simultaneously.

### Phase 5: Merge in dependency order

Once all PRs are approved and CI is green, merge them in dependency order — modules that others depend on should be merged first:

```
1. core (if changed)     — foundational, no module deps
2. api                   — depends on core
3. assets                — depends on api
4. multilang             — depends on assets, api
5. ui                    — depends on api
```

Wait for each module's release workflow to complete before merging the next, so that downstream modules can resolve the new version as a peer dependency.

```bash
# Check that the release completed
gh run list --repo adapt-security/adapt-authoring-api --limit 3
```

### Phase 6: Update and release the parent

Update the parent to pin the exact new versions of each changed module:

```bash
cd adapt-authoring
git checkout master && git pull origin master

# Update all changed dependencies to their exact new versions
npm install adapt-authoring-api@3.5.0 \
            adapt-authoring-assets@1.6.0 \
            @cgkineo/adapt-authoring-multilang@1.1.0 \
            adapt-authoring-ui@2.1.0 \
            --save-exact --legacy-peer-deps

# Run integration tests
npm test

# Commit and push
git add package.json package-lock.json
git commit -m "New: Add multilingual asset pipeline support (fixes #100)"
git push origin master

# Trigger release
gh workflow run release.yml
```

## Workflow 3: Hotfix during feature work

You're midway through a multi-module feature when a critical bug is reported in production. Here's how to handle it without disrupting your feature work.

### The situation

```
You are working on:
  multilang  → branch: feature/multilang-assets
  assets     → branch: feature/multilang-assets
  api        → branch: feature/multilang-assets

Bug reported in: api (unrelated to your feature)
```

### Step 1: Fix the bug on a separate branch

The multi-repo structure helps here — the bug is in one module and your feature branches are unaffected:

```bash
cd api

# Stash or commit any in-progress feature work
git stash  # or commit to the feature branch

# Create a hotfix branch from master
git checkout master && git pull origin master
git checkout -b issue/5678

# Fix the bug
#    ... edit files ...
npx standard
npm test

# Commit and PR
git commit -m "Fix: Correct pagination offset in list endpoint (fixes #5678)"
git push -u origin issue/5678
gh pr create --title "Fix: Correct pagination offset in list endpoint" \
  --body "### Fixes #5678

### Fix
* Off-by-one error in pagination calculation

### Testing
1. Request page 2 of any list endpoint
2. Verify correct items are returned"
```

### Step 2: Get the fix merged and released

Follow the normal review process. Once merged, semantic-release publishes the patch.

### Step 3: Push the fix to production

Because versions are pinned exactly, you can bump *only* the patched module — no unreleased features from other modules are pulled in:

```bash
cd adapt-authoring
git checkout master && git pull origin master
npm install adapt-authoring-api@3.3.1 --save-exact --legacy-peer-deps
git add package.json package-lock.json
git commit -m "Upgrade: Bump adapt-authoring-api to v3.3.1 (fixes #5678)"
git push origin master
gh workflow run release.yml
```

### Step 4: Rebase your feature branch

Back on your feature work, rebase to pick up the hotfix (especially important if your feature touches the same module):

```bash
cd api
git checkout feature/multilang-assets
git rebase master

# If you stashed earlier
git stash pop
```

If there are no conflicts, you're done. If there are conflicts, resolve them — the fix is now part of your feature branch's history.

### Step 5: Test the feature against the updated master

```bash
cd adapt-authoring
npm test
```

This ensures your feature still works with the hotfix in place.

## Workflow 4: Patching an older release line

A feature has been developed and released as a new minor version (`v1.1.0`), but production is still pinned to `v1.0.0`. A bug is now found that needs fixing in the `v1.0.x` line *without* including the `v1.1.0` changes. The fix also needs to be in `v1.1.x` going forward.

**This requires two releases:** a patch on the old line (`v1.0.1`) and a patch on the current line (`v1.1.1`).

### Prerequisites: maintenance branch support

Modules need semantic-release configured to support maintenance branches. This is a one-time setup per module — see [Configuring maintenance branch support](#configuring-maintenance-branch-support) below.

### Step 1: Create the maintenance branch

Branch from the tag of the version you need to patch:

```bash
cd my-module
git fetch --tags
git checkout -b 1.0.x v1.0.0
```

The branch name **must** match the pattern configured in semantic-release (e.g. `1.0.x`, `1.1.x`). This tells semantic-release to release within that version range.

### Step 2: Fix the bug on the maintenance branch

```bash
git checkout -b issue/5678 1.0.x

# Make the fix
npx standard
npm test

git commit -m "Fix: Handle null values in export (fixes #5678)"
git push -u origin issue/5678

# PR targets the 1.0.x branch, NOT master
gh pr create --base 1.0.x \
  --title "Fix: Handle null values in export" \
  --body "### Fixes #5678

### Fix
* Guard against null values during content export

### Testing
1. Export a course with empty optional fields
2. Verify export completes without error"
```

### Step 3: Merge and release v1.0.1

Once the PR is reviewed and merged into the `1.0.x` branch, semantic-release runs and publishes `v1.0.1`. This version contains only the `v1.0.0` code plus the bugfix — no `v1.1.0` feature code.

Push the maintenance branch to trigger the release:

```bash
# The 1.0.x branch needs to exist on the remote for the workflow to trigger
git push origin 1.0.x
```

### Step 4: Update production

```bash
cd adapt-authoring
git checkout master && git pull origin master
npm install adapt-authoring-mymodule@1.0.1 --save-exact --legacy-peer-deps
git add package.json package-lock.json
git commit -m "Upgrade: Bump adapt-authoring-mymodule to v1.0.1 (fixes #5678)"
git push origin master
gh workflow run release.yml
```

Production now has the bugfix without the feature.

### Step 5: Cherry-pick the fix to master

The fix also needs to be in the `v1.1.x` line. Cherry-pick it onto master:

```bash
cd my-module
git checkout master && git pull origin master
git checkout -b issue/5678-forward

# Cherry-pick the fix commit (use the actual SHA)
git cherry-pick <commit-sha>

# Resolve conflicts if any — the code may have changed between v1.0.0 and v1.1.0
npx standard
npm test

git push -u origin issue/5678-forward
gh pr create --title "Fix: Handle null values in export (fixes #5678)" \
  --body "### Fixes #5678

Cherry-pick of the fix from the 1.0.x maintenance branch.

### Fix
* Guard against null values during content export"
```

Once merged to master, semantic-release publishes `v1.1.1` with the fix included.

### Visual timeline

```
master:  v1.0.0 ──── New: feature ──── v1.1.0 ──── cherry-pick fix ──── v1.1.1
              \                                          ↑
1.0.x:         └──────────────── Fix: bug ──── v1.0.1   │
                                    │                    │
                                    └────────────────────┘
                                      (same fix, both lines)
```

### Configuring maintenance branch support

This is a one-time setup per module. Two files need updating:

**1. `package.json` — add `branches` to the release config:**

```json
"release": {
  "branches": [
    "+([0-9]).+([0-9]).x",
    "master"
  ],
  "plugins": [
    ["@semantic-release/commit-analyzer", { "preset": "eslint" }],
    ["@semantic-release/release-notes-generator", { "preset": "eslint" }],
    "@semantic-release/npm",
    "@semantic-release/github",
    "@semantic-release/git"
  ]
}
```

The `+([0-9]).+([0-9]).x` pattern matches branches like `1.0.x`, `2.3.x`, etc. The `master` entry keeps the existing behaviour for normal releases. Order matters — maintenance branches must come before the main branch.

**2. `.github/workflows/releases.yml` — trigger on maintenance branches:**

```yaml
name: Release
on:
  push:
    branches:
      - master
      - '+([0-9]).+([0-9]).x'

jobs:
  release:
    name: Release
    runs-on: ubuntu-latest
    permissions:
      contents: write
      issues: write
      pull-requests: write
      id-token: write
    steps:
      - name: Checkout
        uses: actions/checkout@v3
        with:
          fetch-depth: 0
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 'lts/*'
      - name: Update npm
        run: npm install -g npm@latest
      - name: Install dependencies
        run: npm install
      - name: Release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npx semantic-release
```

The key change is adding `'+([0-9]).+([0-9]).x'` to the `branches` trigger so pushes to maintenance branches also run the release workflow.

### When to create maintenance branches

Don't create maintenance branches preemptively. Create them only when you actually need to patch an older release line. Once a maintenance branch is no longer needed (e.g. production has moved to `v1.1.x`), it can be left as-is — it won't interfere with future releases.

### Cleaning up maintenance branches

Maintenance branches can be deleted from the remote once production has moved past that version line:

```bash
# Only after production is on v1.1.x or later
git push origin --delete 1.0.x
```

## Coordinating releases

### Module releases (automatic)

Every merge to a module's `master` (or a maintenance branch like `1.0.x`) triggers semantic-release. The commit message prefix determines the version bump:

| Merge contains | Version bump | Example |
|---|---|---|
| `Fix:` commits only | Patch (0.0.x) | 3.3.0 → 3.3.1 |
| `Update:` or `New:` | Minor (0.x.0) | 3.3.0 → 3.4.0 |
| `Breaking:` | Major (x.0.0) | 3.3.0 → 4.0.0 |
| `Docs:`, `Chore:` only | No release | — |

### Main repository releases (manual)

The parent `adapt-authoring` repo aggregates module updates and releases on its own cadence:

1. Module releases accumulate on npm/GitHub Packages
2. A developer updates `package.json` in the parent to reference new versions
3. Integration tests run to validate the combination
4. The release workflow is triggered manually via `gh workflow run release.yml`
5. `at-utils version-check` determines the appropriate version bump based on which modules changed

### When to release the parent

- **After a hotfix:** Immediately, to get the fix to production
- **After a feature:** Once all module PRs are merged, their releases complete, and integration tests pass
- **On a regular cadence:** Periodically, to batch smaller improvements

## Version pinning strategy

The parent `adapt-authoring/package.json` uses **exact version pinning** (no `^` or `~` prefix) for all module dependencies. This is the foundation that makes the hotfix-during-feature-work workflow safe.

### Why exact versions?

The problem with caret ranges (`^`):

```
Timeline:
  1. adapt-authoring-api is at 3.3.0 in production
  2. Developer ships a new feature → api 3.4.0 released to npm
  3. A bug is found in production
  4. Developer fixes the bug → api 3.4.1 released to npm
  5. Production site runs npm ci...
```

With `"adapt-authoring-api": "^3.3.0"`, step 5 installs `3.4.1` — which includes the untested feature from step 2 alongside the bugfix. The production site gets changes that haven't been through a full release cycle.

With `"adapt-authoring-api": "3.3.0"` (exact), step 5 installs exactly `3.3.0`. The developer then explicitly bumps to `3.3.1` (bugfix only) or `3.4.1` (bugfix + feature) depending on what's appropriate.

### How it works in practice

| Scenario | What to bump to | Command |
|---|---|---|
| Hotfix only | The patch version | `npm install adapt-authoring-api@3.3.1 --save-exact` |
| Feature ready for release | The minor version (includes all patches) | `npm install adapt-authoring-api@3.4.1 --save-exact` |
| Breaking change | The major version | `npm install adapt-authoring-api@4.0.0 --save-exact` |

### Rules

1. **Always use `--save-exact`** when updating dependencies in the parent repo (or set `save-exact=true` in `.npmrc`)
2. **Never use `@latest`** in the parent repo — always specify the exact version you intend to deploy
3. **One concern per bump** — if you're shipping a hotfix, only bump the module that was patched; don't bundle in other module updates
4. **Batch feature updates** into planned releases — update multiple modules together only when you're ready to test and release the full set

### What about peer dependencies in modules?

Module-to-module peer dependencies (e.g. `"adapt-authoring-core": "^2.0.0"` in `adapt-authoring-api/package.json`) should continue using caret ranges. These express compatibility ranges, not deployment targets. The parent's exact pins determine what actually runs together in production.

## Common pitfalls

### Shipping unreleased features with a hotfix

**Problem:** A module has a new feature (minor release) and a subsequent bugfix (patch release). You bump the parent to get the bugfix, but the new feature comes along for the ride because both are on `master`.

**Solution:** This is exactly why the parent uses exact version pinning. When bumping for a hotfix, specify the patch version explicitly (`3.3.1`), not `@latest`. If the bugfix was released *after* a feature (i.e. `master` already has `v3.4.0` and you need to patch `v3.3.0`), use a [maintenance branch](#workflow-4-patching-an-older-release-line) to release `v3.3.1` from the old line. In most cases, plan your merge order so that hotfixes land before features on the module's master branch.

### Merging a multi-module feature one PR at a time

**Problem:** You merge the API changes but not the UI changes. The API release publishes a new version that the UI hasn't been updated to work with. Users who update get a broken combination.

**Solution:** Merge in dependency order, wait for each release, and don't leave partial features merged overnight.

### Forgetting to rebase after a hotfix

**Problem:** Your feature branch diverges from master after a hotfix lands. When you eventually merge, you may introduce conflicts or accidentally revert the hotfix.

**Solution:** Rebase feature branches promptly after any hotfix to the same module.

### Committing with the wrong prefix

**Problem:** A `Fix:` commit triggers a patch release, but your change is actually a breaking change. Consumers don't expect a major API shift in a patch version.

**Solution:** Double-check your commit prefix. Use `Breaking:` for anything that changes existing behaviour in a non-backwards-compatible way. See [commit message guidelines](contributing-code#commit-messages) for details.

### Testing only the module, not the integration

**Problem:** Module-level tests pass, but the feature breaks when modules interact.

**Solution:** Always run `npm test` from the parent `adapt-authoring/` directory before marking your work as ready for review. This runs integration tests that boot the full application.

### Publishing a dependency bump without testing

**Problem:** You update `adapt-authoring/package.json` to reference new module versions and release without running integration tests. A subtle incompatibility ships.

**Solution:** Always run integration tests locally (or let CI run them) before triggering the parent release workflow.
