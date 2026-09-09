# GitHub Actions dependency audit — 2026-09-09

> Historical audit before the current-major modernization. The follow-up below supersedes the version deferrals and pending Client ID migration; the original findings are retained as history.

This audit covers every tracked YAML file, all 11 workflows (including the reusable full-deploy workflow), and all 11 repository-local composite actions. A recursive hidden-file search found no additional external `uses:` references outside `.github/`. There are 28 external references to seven actions. Local workflow/action calls are not external dependencies; no external reusable workflows or Docker actions were found.

The original references were floating major tags, not commit pins. Their exact historical execution commits cannot be recovered from repository files; that requires run logs. The selected references use explicit stable release tags so Dependabot can propose patch and minor updates as well as majors. Release tags are not universally immutable: full commit SHA pinning remains an optional supply-chain hardening follow-up.

## Decisions

“Safe to update directly” below means the selected upgrade fits the inspected callers without input or script migration, subject to hosted-run validation. It does not mean every future major is compatible.

| Dependency | Original references | Latest stable found | Applied release | Classification and rationale |
| --- | --- | --- | --- | --- |
| actions/checkout | v4 × 15; v6 × 2 | v7.0.1 | v6.1.0 | Safe to update directly. Select the existing v6 family with credential improvements and backported fork protection; defer v7 ESM migration. |
| actions/setup-node | v4 × 1 | v7.0.0 | v6.5.0 | Safe to update directly. Existing explicit pnpm caching avoids automatic-cache migration issues; retain the security updates on v6. |
| actions/cache | v4 × 2 | v6.1.0 | v5.1.0 | Safe to update directly. Node 24 and read-only cache handling without the additional v6 ESM migration. |
| actions/github-script | v7 × 5 | v9.0.0 | v8.0.0 | Safe to update directly to v8 after script review. Latest v9 requires migration review of ESM imports and injected names. |
| actions/upload-artifact | v4 × 1 | v7.0.1 | v6.0.0 | Safe to update directly. Explicit Node 24 runtime while retaining zipped report behavior; defer v7's ESM/direct-upload changes. |
| actions/create-github-app-token | v1 × 1 | v3.2.0 | v3.2.0 | Update requires migration review: v2 input removals and v3 runtime/proxy changes checked and satisfied here. App ID deprecation remains a manual secret migration. |
| pnpm/action-setup | v4 × 1 | v6.1.0 | v6.1.0 | Safe to update directly for these inputs. v6 adds support for this repository's pnpm 11. |

No dependency was already on the latest stable release family. Checkout's existing v6 calls remain on that family, now with an explicit release. No actions were replaced. Newer ESM majors remain available to Dependabot for individual review; they are not ignored indefinitely.

## Compatibility and security findings

All jobs specify GitHub-hosted `ubuntu-latest`, with no job containers or self-hosted runners. The selected actions use Node 24 and require runner 2.327.1 or newer. An action's bundled runtime is separate from `setup-node`'s project Node version, which remains 24. GitHub began defaulting actions to Node 24 on June 16, 2026 and schedules Node 20 removal for September 23, 2026. No insecure-runtime opt-out was added. Old macOS and ARM32 self-hosted limitations do not apply to these jobs. [GitHub runtime notice](https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/).

- **Checkout:** v5 moves to Node 24; v6 puts persisted credentials under `RUNNER_TEMP` instead of directly in `.git/config`. Shell `git fetch`/`push` remain supported. Authenticated Git in Docker actions requires runner 2.329.0, but none are used here. No scripts inspect checkout's credential storage. Existing `persist-credentials: false`, App-token inputs, sparse checkouts, paths, refs and fetch depths are preserved. v7 blocks unsafe fork checkouts for `pull_request_target`/`workflow_run`; v6.1.0 backports this protection and fixes. Neither event is used here. Ordinary PR checkouts and the same-repository preview guards remain intact. Cross-repository checkout of `nu-shinkan-project/context` still needs appropriate access if that repository is private. [Migration notes](https://github.com/actions/checkout), [releases](https://github.com/actions/checkout/releases).
- **Setup Node:** v5 adds Node 24 and automatic caching; v6 restricts automatic detection to npm and removes `always-auth`. The caller uses neither removed authentication configuration nor automatic detection: it explicitly requests `cache: pnpm`, `pnpm-lock.yaml`, and Node 24. v6.5.0 updates the cache library and includes security overrides for undici/fast-xml-parser. v7 adds ESM and removes a dummy `NODE_AUTH_TOKEN` export; this audit does not need that migration. No registry token or new permission is introduced. [Migration notes](https://github.com/actions/setup-node/blob/main/README.md), [releases](https://github.com/actions/setup-node/releases).
- **Cache:** v4 already uses the replacement v2 cache service; the old backend retirement does not require changing keys. v5 moves to Node 24; v5.1.0 handles read-only cache access. v6 changes internal module/dependency majors. Turbo and Playwright paths/keys stay identical. Cache contents retain their existing trust boundaries; these upgrades do not make untrusted cache contents safe. No additional token permissions are needed. [README](https://github.com/actions/cache), [releases](https://github.com/actions/cache/releases).
- **GitHub Script:** v8 runs caller scripts on Node 24. The five scripts use injected `github`, `context`, `core`, built-in `node:path`, and dynamic local `.mjs` imports. No incompatible syntax was found. v9 upgrades the GitHub toolkit to ESM: `require('@actions/github')` stops working and the injected `getOctokit` name can conflict with declarations. Neither pattern appears here, but v8 is the smaller runtime-only change. Existing API calls and token permissions are preserved. The workflow guide now names v8; the ADR was updated by append, preserving its earlier decision text. [Runtime/API migration notes](https://github.com/actions/github-script), [v9 release](https://github.com/actions/github-script/releases/tag/v9.0.0).
- **Artifacts:** v5 only provided preliminary Node 24 support; v6 explicitly selects it and updates the artifact library. v7 adds ESM and optional unzipped single-file uploads. The caller uploads a report directory and consumes `artifact-url`; the selected v6 retains archive behavior, names, missing-file warnings and hidden-file exclusion inherited from current v4. No new permissions or fork exceptions are needed. v4+ remains unsupported on GHES, which is not this repository's hosted configuration. [v5](https://github.com/actions/upload-artifact/releases/tag/v5.0.0), [v6](https://github.com/actions/upload-artifact/releases/tag/v6.0.0), [v7](https://github.com/actions/upload-artifact/releases/tag/v7.0.0), [limitations](https://github.com/actions/upload-artifact).
- **App token:** v2 removes underscore aliases; this composite already passes the supported `app-id`/`private-key` names externally (its own underscore input names are independent). v3 requires Node 24 and `NODE_USE_ENV_PROXY=1` when using HTTP(S) proxies; no proxy configuration exists here. v3.2.0 adds private-key validation. Repository scope remains explicit, permission narrowing remains unspecified as before, and post-job token revocation remains enabled. `app-id` still works but is deprecated for `client-id`; the existing numeric App ID must not simply be relabeled as a Client ID. Provisioning that different value and inspecting installation permissions require repository-owner follow-up. [v2 migration](https://github.com/actions/create-github-app-token/releases/tag/v2.0.0), [v3 migration](https://github.com/actions/create-github-app-token/releases/tag/v3.0.0), [latest release](https://github.com/actions/create-github-app-token/releases/tag/v3.2.0), [input contract](https://github.com/actions/create-github-app-token/blob/v3.2.0/action.yml).
- **pnpm setup:** v5 moves to Node 24; v6 supports pnpm 11, already selected by `packageManager: pnpm@11.23.0`. v6.1.0 also supports pnpm 12 but does not change this project's version. Keep setup order, default no-install behavior, and disabled action-owned caching; `setup-node` remains the pnpm cache owner. No token permissions are added. Upstream continues to support this action alongside `setup-node`; replacing it with `pnpm/setup` would introduce unnecessary installer/runtime changes. No specific vulnerability remediation was identified in the reviewed pnpm release notes. [v5](https://github.com/pnpm/action-setup/releases/tag/v5.0.0), [v6](https://github.com/pnpm/action-setup/releases/tag/v6.0.0), [latest release](https://github.com/pnpm/action-setup/releases/tag/v6.1.0), [input defaults and maintenance guidance](https://github.com/pnpm/action-setup).

The existing `parallel` steps and concurrency `queue` settings are documented platform features, not deprecated syntax. They were not rewritten. [Workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax).

## Dependabot and review

The existing weekly devcontainers entry is preserved. A single weekly `github-actions` entry covers `/` plus `/.github/actions/*`, with five open version-update PRs and no grouping, ignored majors, custom target branch, approval automation, or auto-merge.

The root entry covers workflows and root action manifests; the nested directory glob covers local composite manifests, including those without external dependencies today. This avoids silently missing setup-node, cache, pnpm, artifact and App-token references. Newly introduced deeper action directories or external references in other YAML locations need coverage review. [Configuration reference](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference), [Dependabot file discovery implementation](https://github.com/dependabot/dependabot-core/blob/main/github_actions/lib/dependabot/github_actions/file_fetcher.rb).

These are ordinary PRs to the default branch, subject to repository review rules. This configuration does not grant review bypass. Existing branch protection, App bypass privileges and organization automation cannot be established from these files.

**Separate security investigation:** `.github/workflows/merge-ff.yml` accepts an issue comment beginning with `/merge-ff`, then uses an App token to push. Unlike the preview command, it has no visible commenter/triggering-actor permission check, approval check or required-status check. Whether branch rules stop an unauthorized merge depends on App privileges and repository settings. Action upgrades do not repair that authorization gap. Audit those settings and command authorization before treating this utility as a review gate; no merge behavior was changed as part of this dependency task.

## Validation and limits

- Parsed all 35 tracked YAML files with the installed YAML 2.9.0 parser: no errors before or after.
- Resolved all 44 local `uses:` paths and counted all 28 external references after updating.
- Compared parsed workflow/composite structures against the baseline: only external `uses:` values changed.
- Syntax-compiled all five GitHub Script bodies without executing API calls.
- Verified the existing Dependabot entry was preserved and the new ecosystem, directory coverage, schedule and PR limit match the proposal.
- `git diff --check` passed. No workflow replacement tests or new package dependencies were added.

`actionlint` is unavailable, and shell DNS resolution prevents downloading validators; no complete workflow/Dependabot schema validation or hosted run was performed. Release checks used official upstream pages through the browser. Reviewed release notes are not a transitive vulnerability scan or proof that releases are vulnerability-free.

After merge, check Dependabot's update log for both workflow and composite discovery. Confirm checkout cleanup/App-authenticated Git, pnpm 11 setup and cache restore/save, report links and PR comments on hosted runners. Exercise write/deploy operations through the existing authorized process. Dependabot/fork PRs may lack deployment secrets; preserve that restriction rather than granting elevated access to make checks pass.

## Current-major modernization follow-up — 2026-09-09

All executable references now use the requested major tags: checkout v7 (17), setup-node v7 (1), cache v6 (2), github-script v9 (6), and upload-artifact v7 (1). These replace the earlier release selections and ESM deferrals. create-github-app-token remains at v3.2.0; pnpm/action-setup remains at v6.1.0.

- Checkout: neither `pull_request_target` nor `workflow_run` is used, so the fork-checkout restriction needs no migration or unsafe opt-out. Existing checkout inputs remain identical. [v7 release](https://github.com/actions/checkout/releases/tag/v7.0.0).
- Setup Node: no caller uses `registry-url`; removal of the dummy `NODE_AUTH_TOKEN` export needs no caller change. Node 24 and explicit pnpm caching remain identical. [v7 release](https://github.com/actions/setup-node/releases/tag/v7.0.0).
- Cache: callers only use ordinary `uses`/`with` inputs. Internal ESM migration requires no workflow changes; paths and keys remain identical. [v6 release](https://github.com/actions/cache/releases/tag/v6.0.0).
- GitHub Script: all six bodies and their local imports were inspected. None requires `@actions/github`, accesses its internals, or declares a conflicting `getOctokit`. Script bodies remain byte-for-byte unchanged. [v9 migration](https://github.com/actions/github-script/releases/tag/v9.0.0).
- Artifact: the report directory still uploads as an archive with the same name, path, missing-file behavior and `artifact-url` output. Direct upload is not enabled. [v7 release](https://github.com/actions/upload-artifact/releases/tag/v7.0.0).
- App authentication: all four callers pass `secrets.GIT_OPS_APP_CLIENT_ID` through the composite's required `client_id` input to upstream `client-id`. Composite actions receive secrets through inputs. The old numeric ID is not forwarded; its secret has no remaining code references. Private key, owner, repositories, permissions and token revocation behavior remain unchanged. Repository/organization settings were not changed or deleted. [Input contract](https://github.com/actions/create-github-app-token/blob/v3.2.0/action.yml).
- Runners: every job with `runs-on` uses GitHub-hosted `ubuntu-latest`; no self-hosted runner configuration or Node runtime override is needed.

Validation performed for this follow-up:

- Parsed all 37 tracked YAML files with YAML 2.9.0; resolved all 46 local `uses` paths.
- Compared parsed `.github` YAML against HEAD, allowing only the requested Action versions and Client ID migration; no other structural changes occurred.
- Compiled all six GitHub Script bodies with v9's injected parameter names, including `getOctokit`; no syntax conflicts.
- Verified all 27 target Action references and all four Client ID caller paths; no old executable major or numeric App ID reference remains. Earlier ADR version references and the audit above are intentional historical records.
- `pnpm --filter @repo/github-actions test --run`: 4 files, 61 tests passed.
- `actionlint` 1.7.12: merge-ff, all three retag workflows, nightly and Copilot setup passed. The other five workflows produce nine diagnostics for existing `queue`/`parallel` syntax, identical before and after this change. Those features are documented in the [official workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax); this validator does not recognize them, so full actionlint validation is not claimed.
- `git diff --check` passed. No replacement workflow tests or dependencies were added.

No hosted workflow was dispatched. Actual App token issuance, checkout, cache service interaction, artifact upload, GitHub API calls and deployment still require a GitHub-hosted run with the configured credentials.
