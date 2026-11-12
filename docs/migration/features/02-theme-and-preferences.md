# Theme and Preferences TODO

[Main TODO and mandatory agent instructions](../TODO.md)

**Status:** delivered reusable runtime customization baseline. Preserve it while
migrating business features; do not create another theme owner per page.

## Library Ownership

Reuse `@org/theme`, `@org/theme-ui`, `@org/layout`, and the shared base tokens.
The app supplies the appearance adapter and a unique storage key. Generate any
future components or adapters inside appropriate Nx libraries. Cross-feature
appearance compatibility and release checks remain in [release acceptance](22-release-and-parity.md).

## Completed Baseline

[X] THEME-11 Allow users to select Persian or English from theme settings and apply the matching document language and direction.
[X] THEME-01 Port the updated Press ID theme model, palettes, typography, chrome, geometry, density, and shadows into a reusable NgRx ThemeStore.
[X] THEME-02 Port the Spartan customization sheet with accessible swatches, selectors, custom CSS editor, Save, Reset, and focus restoration.
[X] THEME-03 Persist validated preferences under an app-configured key and restore after hydration with malformed/denied-storage protection.
[X] THEME-04 Apply safe custom-property declarations only on Save and clear removed overrides before restoring derived defaults.
[X] THEME-05 Separate direction/language preferences from theme ownership and expose the installed CDK writable direction signal for overlays.
[X] THEME-06 Apply runtime settings to actual projected shell/sidebar/header/container geometry and reusable form density/radius/shadow controls.
[X] THEME-07 Deliver self-hosted Poppins/Roboto/Vazirmatn and retain the documented IRANSansX reference-CDN fallback.
[X] THEME-08 Keep heavy customization UI deferred and preserve the existing initial-bundle budget.
[X] THEME-09 Verify readable surface text and normal/hover controls under white/red and light/dark presets rather than using raw primary for all text.
[X] THEME-10 Verify desktop/mobile RTL/LTR customization, persistence, reset, custom CSS removal, and authentication compatibility in production and development.

## Evidence and Maintenance

THEME-11 verified with `bun nx run shared-theme-ui:test`, `bun nx run panel:test`,
`bun nx run shared-theme-ui:lint`, `bun nx run panel:lint`, and
`bun nx run panel:build`. The selection updates the app-owned direction/language
preference and document `lang`/`dir`; the theme library emits the selected language.
See `CORE-THEME-TASKS.md` for the preceding delivery's tests and browser evidence.
These completed tasks describe that baseline only. For a newly requested theme
capability, add a pending task here before implementation and reopen the main
theme checkbox until that work is verified. New business controls must inherit
tokens and pass the shared compatibility gates; do not redesign existing themes
merely because a new feature is being added.
