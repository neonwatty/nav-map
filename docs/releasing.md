# Releasing NavMap

NavMap releases are GitHub tags and release notes created manually with the GitHub CLI. There is
no automatic release job and this process does not publish either workspace package to npm.

## Before creating a release

1. Confirm the intended changes are merged into `main`.
2. Confirm the latest `main` CI run passed:

   ```bash
   gh run list \
     --repo neonwatty/nav-map \
     --workflow CI \
     --branch main \
     --limit 1
   ```

3. Verify the local release candidate if needed:

   ```bash
   pnpm install --frozen-lockfile
   pnpm validate
   pnpm test
   ```

4. Choose the next semantic version by reviewing the existing releases:

   ```bash
   gh release list --repo neonwatty/nav-map --limit 10
   ```

## Create the tag and GitHub release

Run the following with the intended version. When the tag does not already exist, GitHub creates
it at the current `main` commit selected by `--target main`.

```bash
VERSION=v1.2.0
gh release create "$VERSION" \
  --repo neonwatty/nav-map \
  --target main \
  --title "$VERSION" \
  --generate-notes
```

Verify the resulting release and target commit:

```bash
gh release view "$VERSION" \
  --repo neonwatty/nav-map \
  --json tagName,publishedAt,targetCommitish,url
```

## Correcting a release

Release tags are immutable history once consumers may rely on them. Prefer a new patch release for
content or code corrections. If a newly created release points at the wrong commit and nobody has
consumed it, delete both the release and remote tag before recreating it:

```bash
gh release delete "$VERSION" \
  --repo neonwatty/nav-map \
  --cleanup-tag \
  --yes
```

Use deletion only for an immediately detected release mistake, never to rewrite an established
release.
