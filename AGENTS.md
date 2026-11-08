<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

## Project Architecture and Lessons

- Before implementing or refactoring panel, shared libraries, or a future Angular
  app, read [the architecture contract](apps/panel/ARCHITECTURE.md).
- Load the project skill at
  [.agents/skills/ttab-angular-workflow/SKILL.md](.agents/skills/ttab-angular-workflow/SKILL.md)
  for the proven workflow, past mistakes, and required regression checks.
- Use Bun, thin app composition, reusable Nx libraries, and both Nx/Sheriff
  dependency rules. Apply the same feature-delivery contract to future apps.
- Use [the linked migration TODO](docs/migration/TODO.md) as the active backlog;
  read its mandatory business/architecture instructions and update the matching
  feature checklist when implementing or verifying work.
