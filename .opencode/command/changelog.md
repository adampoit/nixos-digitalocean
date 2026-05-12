model
opencode-go/kimi-k2.6

Create `UPCOMING_CHANGELOG.md` from the structured changelog input below. If `UPCOMING_CHANGELOG.md` already exists, ignore its current contents.

The input already contains the commit range and a first-pass grouping. Do not fetch GitHub releases, PRs, or build your own commit list.

Before keeping an entry, inspect the real diff with `git show --stat --format='' <hash>` or `git show --format='' <hash>` so the notes are based on behavior, not only the commit subject.

Rules:

-   Write release notes for users of the `nixos-digitalocean` base image.
-   Keep sections in this order: `## Features`, `## Improvements`, `## Bugfixes`.
-   Only include sections that have at least one notable entry.
-   Keep one bullet per commit you keep.
-   Skip changes that are entirely internal, CI-only, tests-only, formatting-only, or release mechanics.
-   Start each bullet with a capital letter.
-   Prefer user-facing outcomes over implementation details.
-   Do not copy raw commit prefixes like `fix:` or `feat:`.
-   Do not include file lists in the final output.
-   If no notable entries remain, write exactly `No notable changes.`
-   Be concise; release notes should be easy to skim.

<changelog_input>

!`node --experimental-strip-types scripts/raw-changelog.ts $ARGUMENTS`

</changelog_input>
