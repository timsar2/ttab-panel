# Support Requests TODO

[Main TODO and mandatory agent instructions](../TODO.md)

**Status:** legacy routed support list/details/delete surface exists; not migrated.
These records are support tickets, not ride bookings or dispatch assignments.

## Library Ownership and Dependencies

Generate reusable transport support data-access/feature libraries, with public
route factories and explicit forms/views. Reuse [shared tables](00-foundation-and-shared-controls.md),
[auth](01-authentication.md), [company context](03-company-context-and-shell.md),
and [notification transport](18-realtime-tracking.md) when delivered.

## Tasks

[ ] SUPPORT-01 Confirm support search/detail/delete contracts, applicant-type IDs, authorized visibility, and retention policy against Q05/Q26.
[ ] SUPPORT-02 Generate library-owned API/state/feature/component boundaries and register public aliases, Nx tags, and Sheriff mappings.
[ ] SUPPORT-03 Implement typed applicant/person/contact/date/subject/description adapters without confusing support with booking.
[ ] SUPPORT-04 Implement scoped search/list/paging/detail state and accurate counts without legacy detail-load list pollution or unscoped background searches.
[ ] SUPPORT-05 Implement reusable TanStack/Spartan list and readable details with correct request-ID navigation, loading/empty/error/access-denied states.
[ ] SUPPORT-06 Implement approved deletion confirmation and state invalidation without guessing cascades or exposing another company's records.
[ ] SUPPORT-07 Decide intended navigation visibility and make notification actions link to the actual authorized request route.
[ ] SUPPORT-08 Add deduplicated realtime request updates only when the shared notification lifecycle exists, respecting current filters and page totals.
[ ] SUPPORT-09 Resolve whether panel creation is required before enabling the dormant create wrapper; gate any creation form behind an approved contract.
[ ] SUPPORT-10 Do not invent approval, response, status, priority, resolution, SLA, or assignment workflows without separate product/backend scope.
[ ] SUPPORT-11 Test alternate consumers/mount paths, correct request-ID handling, unauthorized records, deletion failures, and repeated notification delivery.
[ ] SUPPORT-12 Verify library/store tests, RTL/mobile keyboard flows, private rendering/cache policy, and browser list/detail/delete acceptance.

## Evidence

Record request lifecycle decisions, source-backed scope, permissions, navigation
tests, and fixture versus live API results. A dormant wrapper is not a completed
panel workflow.
