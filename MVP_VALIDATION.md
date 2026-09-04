# Chore4More MVP validation

Validated on 2026-09-04 against the local FastAPI/SQLite stack from the live `e89c9e0` snapshot.

## Branding cleanup

- Browser title changed from **ChoreMap** to **Chore4More**.
- Frontend package renamed to `chore4more-frontend`.
- Local/Render database configuration renamed to `CHORE4MORE_DB_PATH` and `chore4more.db`.
- iOS source names, package name, permission strings, setup documentation and other remaining project references were updated to **Chore4More**.
- The backend keeps a legacy `CHOREMAP_DB_PATH` fallback only so an existing Render environment cannot break during migration.

## Critical-path validation

The following journey was executed through the API against a fresh SQLite database:

- [x] Create a senior account.
- [x] Sign in as that senior.
- [x] Post **Help carry groceries**.
- [x] Create and sign in to a volunteer account.
- [x] Confirm the volunteer can discover the new request.
- [x] Claim the chore.
- [x] Confirm it disappears from the open-request board data.
- [x] Confirm a second volunteer is rejected from claiming the same chore.
- [x] Confirm the senior endpoint sees the chore as `claimed` and records the claiming volunteer.
- [x] Confirm the volunteer endpoint sees the claimed chore.
- [x] Mark the chore complete.
- [x] Re-login/re-read both accounts and confirm the completed state is persisted in SQLite.
- [x] Confirm the volunteer receives 50 points and one completed-chore credit.

## Automated regression suite

`python -m pytest -q`

**49 passed**.

The suite now includes `backend/tests/test_core_journey.py`, which protects the senior → volunteer → claim → complete → persisted-status flow and the double-claim guard.
