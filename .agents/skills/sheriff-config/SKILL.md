---
name: sheriff-config
description: 'Use when writing, updating, or debugging front workspace Sheriff dependency boundaries, including module mappings, app entry points, and dependency rules.'
---

# Sheriff Configuration

Maintain `front/sheriff.config.ts`, the source-path ownership and dependency policy for this Nx workspace. Load this skill whenever a change creates or moves code that affects the workspace dependency graph.

## Keep Both Boundary Systems In Sync

Sheriff and Nx enforce separate policies. Sheriff classifies source paths and checks the `depRules` in this file. Nx uses project `tags` and `depConstraints` in `eslint.config.mjs`. Register a new library in both systems and preserve the same intended scope/type edges. Sheriff permission does not imply Nx permission, or vice versa.

Nx-generated project metadata belongs in the project configuration; do not treat a Sheriff module mapping as a replacement for Nx tags. Use public package aliases rather than cross-library deep imports.

## Configuration Structure

- `entryPoints` maps each application source root to its actual runtime entry file. Keep entries accurate when apps are added, removed, or relocated.
- `enableBarrelLess: true` is enabled. Sheriff analyzes modules without requiring barrel files; do not add barrels solely to satisfy this setting.
- `modules` maps workspace-relative source path patterns to classification tags. Patterns may use placeholders such as `<app>`, `<domain>`, `<feature>`, `<component>`, and `<module>` to cover consistent directory families. Prefer the narrowest pattern that correctly owns the source.
- `depRules` defines which tags a source tag may depend on. Rules are directional: granting an edge to one source class does not grant the reverse edge.
- `sameTag` allows dependencies that share the source tag. Use it where the current policy allows same-scope/same-type dependencies; do not assume it grants any other edge.
- `root: '*'` and the existing `type:e2e: '*'` are intentional broad rules for the workspace root and end-to-end code. Do not copy broad wildcards into library rules as a shortcut.
- `noTag: ['*']` currently permits unclassified sources. Keep mappings comprehensive and do not use `noTag` as a way to weaken enforcement for a newly added library.
- Keep the exported object checked with `satisfies SheriffConfig` so schema mistakes are caught by TypeScript.

## Current Classification Vocabulary

Use the existing tags and dependency constants as the policy vocabulary; extend them deliberately when a real architectural layer requires it.

- Scopes include `scope:panel`, `scope:driver`, `scope:passenger`, `scope:shop`, `scope:api`, `scope:shared`, `scope:transport`, `scope:platform`, and `scope:ui`.
- Types include `type:app`, `type:e2e`, `type:feature`, `type:data`, `type:ui`, `type:models`, `type:util`, and `type:state`.
- `applicationScopes`, `featureDependencies`, `uiDependencies`, and `dataDependencies` centralize repeated allowed edges. Update a constant only when all consumers of that constant should receive the changed permission; otherwise add or adjust a specific rule.
- The app rules currently allow app/feature-level types through `featureDependencies`. UI, data, state, models, and util have more restricted dependency sets. Preserve the layering: in particular, do not introduce data-to-UI/feature or model/util dependency edges without an explicit architectural reason.

## Adding A New Library Or Source Family

1. Inspect the actual directory layout, Nx project name/configuration, project tags, and intended import graph. Read `apps/panel/ARCHITECTURE.md` for application/library boundaries when the change affects panel or shared libraries.
2. Add the narrowest matching source path under `modules`. Assign both the owning scope and architectural type. Check wildcard patterns for accidental overlap; the source must resolve to the intended classification.
3. Add only the necessary directional dependency permissions under `depRules`. Reuse a dependency constant only if its full set of consumers should receive that permission. Keep feature/data/UI layering explicit.
4. Add matching Nx tags and Nx `depConstraints` in the project configuration and `eslint.config.mjs`. Check the target project's actual imports rather than granting broad access preemptively.
5. If an application is new or moved, update its exact `entryPoints` mapping as well as relevant app source mapping and rules.
6. Lint the affected Nx project(s) through the workspace package manager and Nx. Confirm Sheriff and Nx boundary checks both pass; do not resolve failures by broadly allowing `'*'` or suppressing the rule.

## Debugging A Boundary Error

1. Identify the importing file and imported file/package, then determine their effective `modules` classifications and Nx project tags.
2. Check whether a wildcard source pattern classifies either path more broadly or differently than intended.
3. Decide whether the import itself violates the architecture. Prefer replacing deep imports with a public alias or moving code to its proper owning library over allowing the edge.
4. If the edge is valid, add the narrow directional Sheriff permission and the equivalent precise Nx constraint/tag policy. Do not infer one system's settings from the other's.
5. Re-run lint for the affected project(s), then inspect the dependency graph or lint output to ensure the rule is checking the expected source classification.

## How Enforcement Is Wired

`front/eslint.config.mjs` includes `sheriff.configs.all`, which consumes `front/sheriff.config.ts`, and separately configures `@nx/enforce-module-boundaries`. The Sheriff dependencies are `@softarc/eslint-plugin-sheriff` and `@softarc/sheriff-core`. Nx's Sheriff config is included in the named inputs in `front/nx.json`, so edits to it participate in Nx task caching.

Run lint using the Bun/Nx workflow required by `front/AGENTS.md`: inspect the affected project/target, then use `bun nx run <project>:lint` (or the repository's configured equivalent). Do not guess a project name or target; inspect Nx project configuration/help if uncertain. For a full boundary audit, lint all relevant projects and verify both Sheriff and Nx checks are active.

## Repository References

- `front/sheriff.config.ts`: authoritative current Sheriff mappings and rules.
- `front/eslint.config.mjs`: Sheriff and Nx ESLint rule wiring.
- `front/nx.json`: Sheriff config cache input.
- `front/apps/panel/ARCHITECTURE.md`: architectural ownership and dependency principles.
- `front/AGENTS.md`: Nx command and workspace workflow requirements.
