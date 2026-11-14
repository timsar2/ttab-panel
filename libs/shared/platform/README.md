# Shared Application Platform

`@org/platform` is the single browser-facing API consumed by Panel, Driver, and
Passenger. It composes authentication, guards/login routes, app layout/navigation,
theme and direction preferences, portal routes, and the shared design-system CSS.
App identity, domain routes, and environment values are passed as configuration.

`@org/platform/node` is the server-only entry. It composes the cookie BFF, request
session restoration, Express middleware, SSR engine, server routes, and cache/security
headers. Never import this entry from browser code.

Existing focused Nx libraries remain implementation modules behind the platform
facade. Application consumers must use `@org/platform`. The common API URL is
exported from `@org/platform/config`; server deployments may override it through
`AUTH_API_URL` without exposing that upstream URL in browser requests.

Run `bun nx run platform:test`, `platform:lint`, and `platform:typecheck` to verify
the shared platform.
