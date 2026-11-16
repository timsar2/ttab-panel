# Frontend (Angular/Nx) - Agent Notes

## File encoding on Windows (PowerShell)

- **Do not write UTF-8 BOM** for source/config files (`.json`, `.ts`, `.mts`, `.mjs`, `.html`, `.css`, etc.). Nx and many parsers fail with `InvalidSymbol at 1:1` when a BOM (`EF BB BF`) is present.
- In PowerShell, `Set-Content -Encoding utf8` may emit a BOM depending on version. When creating/editing files, prefer:
  - `[System.IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding($false)))`
  - or write via tools that preserve UTF-8 without BOM.
- If you see `InvalidSymbol ... at 1:1` in JSON/TS project files, check for BOM and strip it.

## Workspace

- Nx monorepo under `front/`. Shared libs in `front/libs/shared/*`, apps in `front/apps/*`.
- Dev proxies: apps use `apps/<app>/proxy.conf.json` (API + `/notifications` with `ws: true` for SignalR).
- Real-time tracking: `@org/shared-tracking` (`libs/shared/tracking`) provides SignalR hub connection, driver location publishing, and live location streams; Neshan map lives in `@org/shared-maps`.
