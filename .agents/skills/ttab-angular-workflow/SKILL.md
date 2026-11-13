---
name: ttab-angular-workflow
description: >-
  Apply this project's proven architecture and regression lessons when creating,
  migrating, refactoring, or debugging Angular features in the front Nx workspace,
  apps/panel, future apps, or shared auth/theme/layout/form libraries. Use for
  Signal Forms, NgRx Signal Store, TanStack tables, Spartan/CDK overlays, SSR
  hydration, scoped authentication, theme customization, and feature validation.
---

# TTab Angular Workflow

## Start With the Contract

Read [the architecture guide](../../../apps/panel/ARCHITECTURE.md) before changing
an app or shared feature. Treat it as the feature-delivery contract for all apps,
not just panel. Read applicable Angular, Spartan, and Nx skills from `.agents`.
For app-local route entry versus library-owned page structure, also read
[the panel feature-entry skill](../../../../.agents/skills/ttab-panel-feature-entry/SKILL.md).
Read the current implementation and installed declarations; do not assume an
earlier transcript, checkout, or dependency version still describes the code.

Work from `front` using Bun-prefixed Nx commands. Discover resolved targets with
`bun nx show project PROJECT --json`. Load the Nx generation skill before
scaffolding; inspect help/source and dry-run. Keep application composition thin
and use public library entries. Do not create visible worktrees, run production
writes, pull branches, or revert concurrent changes without authorization.

## Repeat the Successful Delivery Loop

1. Define the working user flow, scope/roles, API contract, reusable boundary,
   and failure states. Add pending `[ ]` tasks before implementing.
2. Inspect existing shared APIs and actual Helm exports before creating another
   component, service, layout, helper, or store.
3. Implement the smallest reusable slice with typed configuration and adapters.
   Keep app branding, routes, endpoints, and concrete preference stores outside
   generic libraries. Add Nx tags and Sheriff source mappings together.
4. Verify store/API behavior, presentational forms, alternate app configuration,
   and consumer integration. Preserve zoneless rendering and scoped ownership.
5. Build once, restart the matching production preview, and test real interaction.
   Check development separately; unit success is not production browser evidence.
6. Convert tasks to `[X]` only after the required checks pass. Record fixture/live
   API distinctions and remaining scope. Stop temporary persistent servers after
   validation unless keeping a preview was explicitly requested.

## Apply These Proven Lessons

### Verify the Reference Before Porting

The earlier reference checkout lacked the newly added theme customizer. Reading
an old snapshot produced an incomplete port. Inspect the currently available
Press ID app and every referenced shared dependency before defining parity. If
the source appears missing or stale, surface that fact rather than inventing a
replacement or silently pulling/replacing the user's checkout.

### Preserve the Complete CDK Contract

The app's direction adapter exposed `value` and `change`, but current Spartan
dialogs call CDK's `valueSignal()`. Unit tests used the default CDK provider and
passed while production gear clicks threw inside Angular's ErrorHandler.

Inspect installed `Directionality` types. Preserve its writable signal alongside
the getter/event API; synchronize it with the actual preference source. Use a
typed adapter and test the real app provider, including native open/close/reopen
and RTL/LTR changes. Capture `console.error` as well as browser `pageerror`:
Angular can catch a runtime exception without emitting `pageerror`.

### Test the Visible Sheet, Not an Incidental Wrapper

CDK's dialog container can have zero width while its fixed-position Spartan
sheet child is fully visible. Do not "fix" a working sheet with arbitrary widths,
z-indexes, or direction hacks solely to satisfy wrapper geometry. Verify the
dialog's ARIA attributes plus visible content/title, screenshots, working controls,
focus trapping, Escape, and return focus. Diagnose geometry before changing CSS.

### Prevent Pre-Hydration Input Loss

SSR fields appeared editable before Signal Forms owned them; fast input could
be replaced by the initial model during hydration. Gate interactive form controls
with browser-render readiness, not a timer, and keep server/client initial state
consistent. Preserve the delayed-JavaScript regression that verifies disabled
initial controls followed by a correct submitted model after hydration.

### Reconcile Spartan Invalid State Across Transitions

Brain's host bindings can report an untouched required field as invalid. A simple
outer `null` binding is insufficient when disable/re-enable changes an inner
binding but the outer value stays unchanged. Reuse `@org/ui-forms` with its
Signal Forms directive. Test pristine, touched, corrected, disabled, and re-enabled
states. Preserve explicit false for pristine-invalid state, true for visible
invalid state, and removal when valid/disabled. Avoid raw `name` attributes on
`FormField` controls with the installed Angular API.

### Scope Auth Configuration and HTTP Together

An isolated child SessionStore did not isolate an inherited HttpClient; protected
requests could use the parent's bearer token/tenant. `provideAuth` now owns the
scoped client and interceptor with its config/store. Do not register the auth
interceptor twice or delegate the isolated client's requests through a parent's
auth chain. Register HTTP testing after auth providers. Test parent/child feature
requests with different tokens, tenants, and API prefixes, not just login calls.

Keep unrelated HTTP usable when auth is unconfigured; login/refresh fail locally
without requests. Restrict injected credentials to the configured origin and
path boundary. Preserve single-flight refresh, retry bounds, epoch protection,
and local-first logout even when remote logout fails.

### Deny Roles Without Redirect Loops

Redirecting a denied user to `afterLoginUrl` loops if that destination or a parent
uses the same role guard. Return `false` for authorization denial; let the app
compose a separate forbidden destination. Preserve safe local return URLs and
backend authorization. Test actual route hierarchy edge cases when adding guards.

### Keep UI Entries Truly Lazy

Exporting runtime login components from the provider/route barrel pulled them
into initial startup. Import embedded UI from `@org/auth-feature/ui`, and keep the
main entry light. Eagerly mounting the customization sheet exceeded the existing
bundle warning budget; deferring the sheet restored it without raising budgets.
Inspect actual chunk output. Configure newly generated Analog/Vitest libraries
with their explicit spec tsconfig instead of accepting missing-config warnings.

### Treat Saved Theme State and CSS as Untrusted

Use one theme owner per application/document, unique app storage keys, normalized
defaults, and guarded storage access. Restore browser preferences after hydration;
do not duplicate partial theme logic in an unrelated head script. Keep direction
and theme ownership separate.

Allow only validated custom-property declarations with safe values, never resource
URLs, imports, expressions, escapes, or injected stylesheet rules. Keep CSS edits
as drafts until Save. Remove prior overrides before applying derived tokens and
current overrides. Test empty Save, reset, malformed/denied storage, and removal
of overrides for tokens also generated by the store.

### Separate Accent Fills From Readable Surface Text

Raw primary text disappeared under white/color 1; default orange was also too
low-contrast for small text. Use readable heading/muted tokens for surface text,
and contrast-aware foregrounds for colored fills and opaque hover/active colors.
Verify actual computed foreground/background values, not hex source alone. Check
white/red presets in both modes, mobile/desktop, and normal/hover states. Do not
treat external font unavailability as a code defect; verify fallback and document
the network dependency separately.

### Validate Both Architecture Systems

New libraries had correct Nx tags but Sheriff classified their paths as `noTag`.
Register both systems explicitly; never silence their rules with a blanket allow.
When consuming local Helm components, validate their tags and peer dependencies
against actual imports and installed versions. Register consumed source directories
with Tailwind rather than scanning unrelated apps or generating missing utilities
by accident.

## Completion Evidence

Run affected Bun/Nx test, lint, and typecheck targets plus the consuming app's
production build. Serialize output-directory builds. Run browser checks against
matching production assets and the default development workflow. Allow a clearly
identified production-only policy test to skip development; do not silently skip
feature behavior.

Use semantic assertions and retrying expectations for transitions, not sleeps.
For overlay and appearance work, inspect RTL/LTR, keyboard focus, mobile overflow,
touch targets, readable text, and Save/Reset behavior. Do not count jsdom's lack
of layout or a passing stub as proof of real browser geometry or provider wiring.
Update the architecture guide when ownership/public APIs change, and the task
checklists when verified scope changes. Do not keep stale test counts in this
skill; record dated delivery evidence in the relevant checklist instead.
