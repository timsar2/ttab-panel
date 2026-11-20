# Inspection Management System Workflow and UI/UX Specification

**Status:** Proposed target-state specification. This document describes requested behavior and design; it does not claim that the full workflow is implemented or that the current database contract supports it.

## 1. Purpose and Scope

Provide a role-aware, auditable workflow for reporting vehicle inspection defects, recording administrative corrective actions, and having the inspector verify or reopen the request. The request status is authoritative in the backend and is reflected consistently in the Admin Application Panel, the Inspector Inspection Application, request lists, and request details.

This workflow is distinct from registering an inspection visit. A visit records the inspection and its checks; a correction request is a lifecycle record linked to that visit and to a specific defect/check. Do not treat a defect row or a completed-action row as the request itself.

## 2. Current System Boundary

The current frontend has separate Inspector and Admin/Manager list/detail areas under `libs/inspection/feature/*` and `libs/panel/inspection`. Inspection details contain twelve Boolean checks, a description, `Defects`, `CorrectiveActions`, and a status label. The current backend integrates `Inspection.uspSetVisit`, `uspSetDefect`, `uspSetCorrectiveAction`, `uspSetStatus`, `uspGetById`, and `uspGetVisitList`.

The existing contract is not sufficient to implement this request workflow without extension:

- Existing status values describe `Pending action`, `Pending approval`, and `Approved`; they do not distinguish inspector verification, a reopened cycle, or final closure.
- `uspSetStatus` is an explicit staff write. There is no demonstrated atomic rule that derives status from a correction request event.
- Defects and completed corrective actions are separate append-only rows, and a corrective action is linked to the visit rather than a particular defect/request.
- The list procedure returns a status display name, but the handoff states the detail procedure does not return status. A working-tree DTO mapping change alone does not establish that the SQL projection supplies the status.
- A Boolean's meaning depends on its field: a condition flag and a presence flag are not interchangeable. Current rendering uses generic True/False labels and the DB contract does not specify how each input radio value maps to domain meaning.

The target workflow therefore requires a persisted correction-request/cycle model and server-side transition handling in the established stored-procedure/API architecture. UI-only status changes, frontend-derived status, and independent list/detail status sources are not acceptable substitutes.

## 3. Actors and Permissions

| Actor                        | Allowed actions                                                                                                                                                               | Must not be able to                                                                                          |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Inspector                    | Create a correction request for an inspection they own; read its history and status; submit a reopen observation after Admin response; close after satisfactory verification. | Edit Admin response, alter another inspector's requests, directly set a status, or delete lifecycle history. |
| Admin/Manager                | View and filter requests in the Application Panel; record a corrective-action result and detailed description; return the request to the inspector for verification.          | Close on behalf of the inspector unless a separately approved delegated-closure policy exists.               |
| Read-only staff (if enabled) | View requests within authorized scope.                                                                                                                                        | Submit transitions or modify records.                                                                        |

The backend must derive identity and company scope from the authenticated principal. Every create/read/write must verify the user's access to the inspection, company, and request; client-supplied InspectorId, company ID, or actor role is untrusted. UI route guards are not an authorization boundary.

## 4. Request Data and History

Each correction request should have a stable request ID and link to:

- Inspection visit ID and company ID.
- Inspector identity and creation timestamp.
- Vehicle/driver snapshot or a stable reference to the visit's vehicle and driver.
- One or more identified defects/checks and the inspector's observation. Preserve the original report text rather than overwrite it on reopen.
- Current lifecycle status and cycle number.
- Admin/Manager response: corrective action taken, detailed result description, actor, and timestamp.
- Inspector verification response: close or reopen decision, observation/comment, actor, and timestamp.
- Append-only event history sufficient to reconstruct every status transition and cycle.

The data contract must define whether one request covers one defect or a grouped set. Recommended default: one request per defect, with optional grouping in the UI by inspection visit. A reopen creates a new cycle/event on the same request ID; it must not erase the previous Admin response or create a duplicate request silently.

## 5. Lifecycle and State Machine

### 5.1 States

| State               | Meaning                                                                         | Visible next action                                 |
| ------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------- |
| `AwaitingAdmin`     | Inspector submitted a correction request; Admin has not completed a response.   | Admin: Record corrective action                     |
| `AwaitingInspector` | Admin saved a result and detailed action description; Inspector must verify it. | Inspector: Close request or Reopen with observation |
| `Closed`            | Inspector confirmed the correction is satisfactory. Terminal for this request.  | View history                                        |

`Reopened` is represented as a new cycle transitioning back to `AwaitingAdmin`, with a reopen event and comment retained in history. It may be shown as a distinct visual badge such as “Reopened · Cycle 2” while remaining queryable by the canonical current state `AwaitingAdmin`.

### 5.2 Allowed Transitions

```text
Inspection recorded
  -> Inspector submits Correction Request
  -> AwaitingAdmin
  -> Admin records corrective result + detailed action description
  -> AwaitingInspector
      -> Inspector closes as satisfactory -> Closed
      -> Inspector reopens with new observation -> AwaitingAdmin (cycle + 1)
          -> Admin records a new result -> AwaitingInspector
          -> ...
```

Transition rules:

- A transition and its history event are committed atomically by the backend/store-procedure operation. Return the saved canonical request/status projection to the caller.
- Creating a request sets `AwaitingAdmin`; the client does not send a chosen status.
- Admin response requires a non-empty corrective-action summary and detailed description, plus completion date/time as defined by the domain contract. Saving moves the request to `AwaitingInspector` atomically.
- Inspector close requires explicit confirmation and optionally a short verification note. It moves only `AwaitingInspector` to `Closed`.
- Inspector reopen requires a non-empty observation, preserves the prior Admin response, increments the cycle, and moves only `AwaitingInspector` to `AwaitingAdmin`.
- Closed requests cannot be reopened in place unless an approved business policy defines a separate “reopen closed request” permission and audit reason. Otherwise create a linked follow-up request.
- Stale/invalid transitions return a conflict response containing the latest request state; the UI refreshes and explains that the request changed elsewhere.
- Repeated submissions must be safe against duplicate creation/action events. Define idempotency or equivalent backend duplicate protection; disable the submit action while pending as a usability aid only.

### 5.3 Status Synchronization

The database procedure/workflow operation is the status authority. It must persist the event and current status together and return the resulting request projection. List and detail queries must read the same current status source. After every successful mutation, the client replaces/refreshes both detail and list state from the response or a canonical read; it must not optimistically invent a status.

If asynchronous sync is unavoidable, expose an explicit pending-sync state and retry/monitor it server-side. Do not report the transition as complete while list/detail may disagree. Prefer synchronous transactional persistence for request status and event history.

## 6. UI/UX Specification

### 6.1 Inspector: Inspection Application

**My Inspection Requests list**

- Show request ID, inspection date, vehicle/plate, defect/check summary, current status, last updated time, and cycle when greater than one.
- Default sort: most recently updated first. Filters: status, vehicle, date range; search by request ID/plate where supported.
- Status is a localized text badge with an icon or shape in addition to color. Use the same wording in list and detail.
- Empty state explains that no correction requests exist and links to the inspector's inspections if request creation is available there.
- Loading, access-denied, not-found, and retryable-error states must be distinct. Preserve search/filter state when returning from details.

**Create Correction Request**

- Entry point on an owned inspection detail: “Request correction” / localized equivalent.
- Show visit context (inspection ID/date, vehicle, driver) read-only so the inspector can verify the target.
- Select the defect/check being reported; show the original recorded check result and its human-readable label.
- Require a specific observation describing the issue. Show length guidance, inline validation, and a review step before submission when multiple defects can be selected.
- On success, route to the new request detail and show `Awaiting Admin` plus submission time. On ambiguous network failure, do not invite an immediate duplicate; refresh by request/inspection and explain verification.

**Request detail and inspector review**

- Header: request ID, current status badge, cycle, vehicle/driver, inspection date, and created/updated timestamps.
- Present a chronological timeline: request submitted, Admin action recorded, inspector reopened/closed, and each later cycle. Clearly identify actor role/name and time.
- Keep the initial observation and each reopen observation visually distinct from Admin's corrective-action response.
- In `AwaitingAdmin`, show a read-only “Waiting for Admin” state and no close/reopen controls.
- In `AwaitingInspector`, show Admin's result first, followed by two clearly distinct actions: primary “Close request” and secondary “Reopen request”. Reopen opens a required observation form. Closing uses a confirmation dialog summarizing that it finalizes the request.
- In `Closed`, show a terminal “Closed” state, closure actor/time, and full history; hide mutation controls.

### 6.2 Admin/Manager: Application Panel

**Correction Requests queue**

- Provide a dedicated “Correction Requests” queue, separate from the inspection-visit register/list so visit status is not mistaken for request status.
- Default view prioritizes `AwaitingAdmin`, then oldest update/creation first. Add tabs or filters for Awaiting Admin, Awaiting Inspector, Closed, and All.
- Columns: request ID, submitted date, company, inspector, driver, vehicle/plate, defect/check, current-cycle observation excerpt, status, cycle, last updated, and action.
- Support stable sorting and bounded paging; show an honest total only if the API provides one. Provide filters/search that are enforced server-side.
- Reopened requests must be visually prominent and carry a “Reopened · Cycle N” label without losing original submission age or priority context.

**Admin request detail/action**

- Use a two-column desktop layout: request/vehicle context and history on the left; current-cycle action form on the right. Stack content at narrow widths.
- Show the inspector's latest observation and associated check result at the top of the action area. Keep prior cycles collapsed but accessible.
- Admin form fields: corrective action taken (required), detailed result/notes (required), completion date/time (if the business contract requires it), and optional evidence attachment only if upload/storage is approved.
- CTA text must express the transition, e.g. “Send to inspector for verification”; do not label it merely “Save” when saving changes state.
- Confirm before submission, show pending/success/error states, and prevent duplicate submission during the request. After success, show `Awaiting Inspector` and refresh status in both the queue and detail.
- For requests in `AwaitingInspector` or `Closed`, render the Admin response/history read-only. Do not expose controls that bypass the inspector's verification decision.

### 6.3 Human-Readable Inspection Values

Never render raw Boolean strings (`true`, `false`, `1`, `0`) in request or inspection details. Use localized labels driven by each field's semantic type, for example:

| Field semantics                                                                                                                                                        | Stored value | Display label (English) | Display label (Persian) |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -----------: | ----------------------- | ----------------------- |
| Condition is satisfactory (`TiresCondition`, `LightsCondition`, `SeatsCondition`, `HeaterCondition`, `AirConditionerCondition`, `WipersCondition`, `WindowsCondition`) |         true | Satisfactory            | قابل قبول               |
| Same condition fields                                                                                                                                                  |        false | Not satisfactory        | غیرقابل قبول            |
| Required item/function is present (`HasSeatBelt`, `HasFirstAidKit`, `HasFireExtinguisher`, `HasTurnSignals`, `HasSafetyVestAndWarningTriangle`)                        |         true | Present                 | موجود                   |
| Same presence fields                                                                                                                                                   |        false | Missing                 | ناموجود                 |

These are proposed mappings and require domain-owner confirmation before release: the existing stored-procedure contract documents BIT fields but does not prove the meaning of true/false for each radio option. In particular, confirm the form's initial option labels and persisted value mapping, and confirm whether combined `HasSafetyVestAndWarningTriangle` should be split. If an item's input semantics differ, map its persisted value back to the exact human-readable option label the inspector selected. Preserve the raw Boolean only in API/storage, not user-facing text.

Use text plus non-color visual cues (icon, badge, or status text); do not rely on green/red alone. When an API value is missing or invalid, show a localized “Not recorded” label and log/monitor the contract issue rather than treating null as false.

### 6.4 Responsive, RTL, and Accessibility

- Support English LTR and Persian RTL. Keep IDs, dates, license plates, and other Latin/numeric identifiers directionally isolated with `dir="ltr"` or `bdi` as appropriate; align field labels and narrative to the active language.
- On mobile, convert wide tables to stacked cards or allow deliberate horizontal scrolling with a visible cue; keep status and primary action visible without requiring a wide viewport.
- All actions must be keyboard reachable with visible focus. Use semantic headings, table captions/headers, associated form labels, field-level errors, and `aria-live` announcements for async status changes.
- Confirmation dialogs must trap/restore focus and offer a clear cancel action. Avoid destructive wording for reopen/close, and do not make color the only status indicator.
- Maintain readable contrast and touch targets of at least 44 CSS px for primary controls.

## 7. Status Vocabulary and Localization

Use one canonical status enum/key in the API and localize at the presentation boundary. Recommended labels:

| Canonical key       | English                         | Persian               |
| ------------------- | ------------------------------- | --------------------- |
| `AwaitingAdmin`     | Awaiting Admin action           | در انتظار اقدام مدیر  |
| `AwaitingInspector` | Awaiting inspector verification | در انتظار تأیید بازرس |
| `Closed`            | Closed                          | بسته‌شده              |

When `cycle > 1` and the current state is `AwaitingAdmin`, add “Reopened · Cycle N” / «بازگشایی‌شده · دور N». Keep status label and transition rules independent of database integer IDs; lookup IDs and mappings belong to the backend contract, not hard-coded client assumptions.

## 8. API and Persistence Contract Requirements

Before implementation, define/verify stored procedures and DTOs for:

1. Create correction request (visit ID, defect/check reference, observation; actor derived from identity).
2. Search correction requests (authorized scope, status/filter/search, stable sort, bounded paging and total/continuation metadata).
3. Get request detail (request context, canonical current status, current cycle, all events/responses).
4. Record Admin corrective result (request ID, result description/action; actor derived from identity; transition to AwaitingInspector in the same transaction).
5. Inspector close and reopen commands with role/state validation and auditable event history.

Every read projection used by a list or detail must expose the same canonical current status and cycle. Status changes and history append must be atomic. Enforce valid from/to transitions, access checks, required content, and concurrency in the backend. Return a conflict for stale state instead of silently overwriting a later cycle. Keep dates in the database's Gregorian/date format; localized calendar formatting is presentation-only.

This is a new contract requirement, not a claim that these procedures or endpoints currently exist. Do not repurpose insert-only visit/defect/action procedures as update APIs. Do not use a client-side sequence of unrelated calls to emulate an atomic transition.

## 9. Acceptance Criteria

- An authorized inspector can create a correction request against an inspection they own; the request is persisted as `AwaitingAdmin` and appears in the Inspector list and Admin queue.
- An unauthorized inspector cannot create, read, close, or reopen another inspector's request by changing route/body IDs.
- Admin can record both corrective result and detailed action description; a successful save creates an auditable event and atomically changes the request to `AwaitingInspector`.
- The Inspector sees that response and can either close the request or reopen it with a required observation. Reopen increments the cycle and returns the same request to the Admin queue without deleting prior history.
- A closed request is read-only and displays its closure event/history.
- After each successful transition, list and detail return/display the same persisted status and cycle; a refresh or second authorized session shows the same state. No manual status edit or client-derived state is needed.
- Concurrent/stale transitions are rejected with a recoverable conflict response and latest state; retrying a successful request does not create duplicate events.
- All Boolean inspection data is displayed using its field-specific human label, never raw technical Boolean text. Tests cover every field in both languages and confirm the persisted value-to-label mapping with domain-approved input semantics.
- Statuses are understandable without color, usable with keyboard/screen reader, and readable in English LTR, Persian RTL, desktop, and mobile layouts.
- Contract tests verify authorization, transition validation, transactionally consistent status/history, list/detail projection parity, paging, localized labels, and failure/empty/loading states. Live database acceptance must separately verify deployed procedures and mappings.

## 10. Open Decisions / Release Gates

- Confirm true/false input meanings for every condition and presence flag, especially `HasTurnSignals` and the combined safety vest/triangle flag.
- Decide whether one request is per defect or can bundle multiple defects; the recommended default is one request per defect.
- Decide whether closing requires a verification note, and whether an Admin may ever close on an inspector's behalf.
- Define date/time and timezone semantics for Admin completion and transition audit timestamps.
- Define reopen-after-Closed policy; default recommendation is a linked follow-up request, not mutation of a terminal request.
- Confirm company scope rules and which Admin/Manager roles can see cross-company requests.
- Verify deployed stored-procedure schema and data/status mapping. Current source notes report invalid Inspection DDL and missing lifecycle concepts; a UI change alone cannot satisfy the workflow.
