# Panel Backend Feature Integration TODO

This checklist tracks frontend work in `front/apps/panel` and its reusable Nx
libraries against the current `transport-backend` Support and Inspection APIs.
Every item is pending until implemented and verified. This document does not
establish that the procedures are deployed or that database installation is valid.

## Required Reading and Architecture

- [x] PANEL-BE-01 Read `front/AGENTS.md`, `front/apps/panel/ARCHITECTURE.md`,
      `front/docs/BUSINESS_DOMAIN.md`, the panel workflow skill, and the linked
      feature checklist before implementation.
- [x] PANEL-BE-02 Keep app-specific route mounting, company/session/language
      adapters, and approved role configuration in a thin `apps/panel/src/app/<feature>`
      entry; put feature pages, forms, tables, and state in reusable Nx libraries.
- [x] PANEL-BE-03 Reuse and extend existing public transport Support data-access
      APIs for the supported contract instead of creating a second API/store. Generate
      an Inspection data-access/feature boundary only when implementing its first real
      vertical slice; register Nx tags, Sheriff mappings, and public exports together.
- [x] PANEL-BE-04 Keep browser API calls on the authenticated same-origin `/api`
      BFF and existing `TransportHttp`; do not add direct production origins, token
      storage, database calls, or app-specific dependencies to reusable libraries.
- [x] PANEL-BE-05 Add bilingual English/Persian copy, RTL/LTR support, accessible
      keyboard/focus behavior, mobile layouts, and loading/empty/error/denied states
      to every delivered Support and Inspection screen.

## Support

Backend routes use the existing versioned API prefix and Support response envelope:
`POST /support`, `POST /support/search`, `GET /support/{id}`,
`GET /support/{id}/messages`, `POST /support/messages`, and
`GET /support/violation-types/{personTypeId}`. The configured API base may already
include `/api`; confirm the exact deployment configuration before choosing paths.

- [x] PANEL-BE-06 Mount the existing Support data layer through a lazy
      `apps/panel` Support feature entry and a reusable `libs/panel/support` route
      factory/page; replace the current planned/not-implemented navigation hint only
      when the route has an approved access policy.
- [x] PANEL-BE-07 Encode staff access in route configuration and an explicit
      consumer access adapter. Admin/Manager may select a company, Operators are
      restricted to their claimed company, and requesters remain person/company-scoped
      in backend behavior. This Panel route intentionally always sends the selected
      company, not a global all-company search. Frontend guards are UX only and must
      not substitute for server authorization.
- [x] PANEL-BE-08 Build a Support request list using the existing typed read API,
      with required Support Type filter (the endpoint does not have an all-types
      default), supported `IsAnswered` filtering, approved search fields, allowlisted
      sort, bounded paging, and the backend-provided count. The current query derives
      TotalCount from a result row, so an empty/out-of-range page may report zero even
      when earlier pages contain records. Do not invent free-text, date-range, or
      arbitrary sort filters.
- [x] PANEL-BE-09 Build authorized Support detail navigation using the validated
      numeric support request ID, displaying subject, requester/list fields, request
      date, answer state, and typed nested case-file/violation data as safe text.
      Do not confuse Person ID, trip ID, violation ID, and Support ID.
- [x] PANEL-BE-10 Do not expose initial Support creation to staff: the backend
      rejects Admin/Manager/Operator ticket creation, which is reserved for verified
      driver/passenger identities. Revisit only in a customer-facing consumer with
      the backend's author-identity policy intact.
- [x] PANEL-BE-11 Implement Support Type choices with exact IDs: 1 Suggestion
      (پیشنهاد), 2 User Ticket (تیکت کاربران), 3 Passenger Violation (تخلف مسافر),
      and 4 Driver Violation (تخلف راننده). Never treat these values as `Person.Type`.
- [x] PANEL-BE-12 Do not implement violation-report creation in the staff Panel:
      backend initial Support creation is for verified Driver/Passenger identities.
      The reusable transport API exposes violation choices by Person.Type (1 Passenger,
      2 Driver) for a future customer-facing consumer; no staff report form is shown.
- [x] PANEL-BE-13 Keep active-trip/report selection out of this staff UI rather
      than relying on frontend guesses. Any future customer-facing report must use the
      backend's person/company/active-trip verification and reject historical/unresolved
      trips; there is no trip picker or report form in this Panel.
- [x] PANEL-BE-14 Implement Support conversation read and send using the message
      endpoints. Present only fields actually returned (`Body`, `IsAnswer`); backend
      provides no message ID/time/order guarantee in the list. `IsAnswer` is assigned
      by server role, not a client-editable form field. Support messages are append-only.
- [x] PANEL-BE-15 Remove/avoid all Support deletion affordances, calls, and
      confirmation dialogs. `Pub.uspDelSupport` is deprecated and must not be called;
      no Support delete endpoint is exposed.
- [x] PANEL-BE-16 Extend the existing Support transport adapter/store with typed
      write/message/violation lookup operations and scoped mutation state only after
      confirming exact response envelopes and request DTOs. Preserve session/company
      cancellation, stale-response suppression, and invalidation without leaking data
      across users or companies.
- [x] PANEL-BE-17 Reconcile and update
      `front/docs/migration/features/19-support-requests.md`: replace legacy delete,
      applicant-type and response workflow assumptions with the current backend
      contract, while retaining unresolved product/visibility decisions as explicit
      gates.

## Inspection

The backend exposes `POST /inspections`, `POST /inspections/search`,
`GET /inspections/{id}`, `POST /inspections/defects`,
`POST /inspections/corrective-actions`, and `POST /inspections/status`.
Inspector can create visits and view only their own detail. Admin/Manager can view
the global list/detail and perform status, defect, and corrective-action writes.

- [x] PANEL-BE-18 Confirm the audiences from product scope: the standalone Inspection
      app is Inspector-only; the Panel review list/details remain Admin/Manager-only.
      Routes and server adapters preserve those distinct roles.
- [x] PANEL-BE-19 Create reusable Inspection API/model/store and lazy panel feature
      entry following the Support and existing feature-library boundaries; scope
      sensitive state to the authenticated session and prevent stale details crossing
      route IDs or session changes. Clear cached inspection state when company context
      changes, but do not claim company-scoped authorization the API does not provide.
- [x] PANEL-BE-20 Build an Inspection list and detail flow using `uspGetVisitList`
      and `uspGetById` projections. The list has paging but no total count or company,
      driver, inspector, and status filters; do not fabricate totals or claim the list
      is scoped to the selected company.
- [x] PANEL-BE-21 Treat the list's `StatusTypeId` field as a status **name string**,
      not a numeric ID. Detail does not return numeric status or rowversion; do not
      invent optimistic concurrency or display unsupported status data.
- [x] PANEL-BE-22 Build the inspection visit form with inspector identity derived
      by the backend, selected driver/vehicle, date-only inspection date, description,
      and all twelve required Boolean checks: TiresCondition, LightsCondition,
      SeatsCondition, HasSeatBelt, HeaterCondition, AirConditionerCondition,
      HasFirstAidKit, HasFireExtinguisher, HasTurnSignals, WipersCondition,
      WindowsCondition, HasSafetyVestAndWarningTriangle. Do not imply a universal
      pass/fail meaning for true/false without domain confirmation.
- [x] PANEL-BE-23 Build the required-action/defect form using DueDate (date only)
      and description, plus a distinct completed corrective-action form using
      CompletedAt (date only) and description. Do not conflate required remediation
      with work actually completed; these APIs are insert-only and are not edits.
- [x] PANEL-BE-24 Add an Admin/Manager status selector for IDs 1 pending action,
      2 pending approval, and 3 approved, with explicit confirmation. The user requested
      this workflow; the backend enforces the Admin/Manager role but does not enforce a
      transition state machine. The UI discloses that limitation and does not claim the
      endpoint updates a description.
- [x] PANEL-BE-25 Add stable allowlisted sorting and bounded page controls for
      Inspection list, respecting the fixed fields supported by the backend. Do not
      send arbitrary sort expressions or exceed short/int paging constraints.
- [x] PANEL-BE-26 Render `Defects` and `CorrectiveActions` as typed arrays from
      Inspection detail and safely handle missing/empty arrays without parsing or
      displaying them as HTML.

## Related Panel Integration

- [x] PANEL-BE-27 Review passenger/assignment UI integration for the backend's
      single-membership delete contract. The current Panel has no passenger membership
      deletion UI or passenger transport data-access library, so no stale multi-ID
      request was found and no unrelated membership UI was introduced.
- [x] PANEL-BE-28 Verify company IDs remain within the existing SQL SMALLINT
      contract where used by Support; do not narrow person/passenger IDs to 16-bit.
- [x] PANEL-BE-29 Verify all new/changed frontend DTOs use the backend's exact
      field names, integer/date formats, versioned routes, and response envelopes;
      document any server-envelope spelling differences rather than silently guessing.
- [ ] PANEL-BE-30 Keep unresolved backend/database limits visible in a user-safe
      release note before enabling live workflows: Support violation lookup procedure
      name differs from the legacy handoff, Support SQL has a reported invalid-text
      issue, and Inspection DDL has reported installation defects. No live database
      readiness is implied by mocked frontend tests.

## Verification and Evidence

- [x] PANEL-BE-31 Add typed adapter/API/store/form tests for exact request paths,
      payloads, response envelopes, validation, cancellation, company/session changes,
      unauthorized access, and mutation failures using controlled fixtures.
- [ ] PANEL-BE-32 Complete browser acceptance for authorized staff Support
      list/detail/messages and Inspection list/detail/visit/defect/action flows using
      controlled fixtures; verify forbidden staff create/report/delete affordances are
      absent. Remaining coverage includes write-error/uncertain-response states and
      cross-browser keyboard/focus checks beyond the current Chromium smoke flows.
- [x] PANEL-BE-33 Verify affected Bun/Nx tests, lint, typechecks, production build,
      lazy chunks and Panel browser tests. Record mocked versus staging/live evidence
      separately; never mark live backend acceptance based on fixtures.
- [x] PANEL-BE-34 Update this checklist and the matching migration feature checklist
      only after required implementation and verification are complete. Keep blocked
      policy/schema/deployment decisions unchecked with owner and evidence recorded.

## Known Contract Gates

- Admin/Manager/Operator are staff in the Panel; backend explicitly forbids staff
  from creating Support tickets. Initial customer ticket creation and active-trip
  violation reports need a separate customer-facing frontend/API contract.
- Inspection visit form driver/vehicle options are loaded from the selected company,
  but the backend does not validate that the two selected entities belong together
  or that either belongs to that company. Server-side entity/company validation is
  required before claiming live data integrity; the current UI does not bypass it.

- `Support.uspGetViolationTypeList` is the requested/current backend call name,
  while the handoff documents a legacy `Support.uspGetViolationType` source name;
  confirm the deployed procedure before live acceptance.
- The handoff reports invalid Support SQL source text and conflicting/invalid
  Inspection DDL. Frontend work must not modify or work around database schema.
- Inspection has no list total count or company filter. Only globally privileged
  roles may use the backend list under the current contract.
- Support message history omits timestamps and ordering, and no author identity or
  internal-agent message type is returned.
- Inspection corrective actions are not linked to an individual defect, and the
  backend does not provide contractor identity, action-request workflow,
  confirmation evidence, or optimistic concurrency.
- No frontend feature is live-backend accepted until the deployed endpoint,
  permissions, database procedure names, and database installation are verified.
