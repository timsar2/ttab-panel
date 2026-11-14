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

  <!-- nx configuration start-->

# Graphiti Persistent Memory

Use the connected Graphiti MCP server for persistent
project memory.

Project group_id: ttab

## Before starting a task

- Search Graphiti using search_nodes and search_memory_facts.
- Retrieve relevant architecture decisions, requirements,
  conventions, and previously resolved problems.
- Use the same group_id for all operations.
- Verify recalled information against the current codebase.
- Never treat stored memory as more authoritative than
  current source code.

## During development

- Follow existing architectural decisions.
- Avoid repeating previously resolved mistakes.
- If a stored decision conflicts with the current code,
  investigate before changing anything.

## After completing a task

- Save confirmed architectural decisions using add_memory.
- Record important bug fixes and their root causes.
- Record new requirements and coding conventions.
- Save a concise summary, not the entire conversation.
- Avoid duplicate or trivial memory entries.
- Never store passwords, tokens, API keys, or secrets.
- Do not save unverified assumptions as facts.

## Memory isolation

- Always use group_id: commerce-api
- Do not mix information from different projects.
