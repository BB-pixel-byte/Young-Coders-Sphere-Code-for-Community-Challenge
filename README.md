# Chore4More

Chore4More is a community prototype that helps older adults request assistance
with household chores and lets volunteers claim nearby tasks.

The original project was developed by a four-person team for the Young Coders'
Sphere competition. This repository is an archived team copy with later
reliability, deployment and interface refinements for portfolio demonstration.

## What works

- Senior and volunteer registration and sign-in
- Invitation-only senior and volunteer registration with salted passwords and
  server-issued sessions
- Text-only chore requests in the pilot flow; no saved photos or public uploads
- Volunteer request board and account-authorized claiming
- Senior confirmation before completion counts or points are awarded
- Senior status tracking
- Volunteer points and completion totals
- Responsive mobile and desktop interface
- Password-protected, unlisted pilot analytics dashboard
- Anonymous visitor, registration and chore-activation measurement
- CSV analytics snapshots for portfolio evidence
- One-server setup: FastAPI serves the compiled React app

## Run locally

Use Python 3.12 or 3.13. From the repository root:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
npm install
npm run build
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Open <http://127.0.0.1:8000>.

The current pilot flow does not accept photos or run image analysis. Legacy
image endpoints remain available only in the isolated test mode. For a local
pilot test, choose a private `PILOT_INVITE_CODE` in `.env`. Never commit `.env`.

To use the private analytics dashboard, also set `ANALYTICS_PASSWORD` in the
private `.env` file, restart the server, and open
<http://127.0.0.1:8000/analytics>. The route is not linked from the public site,
and its data endpoints require a short-lived signed access token. The tracker
stores random browser and session identifiers; the dashboard does not display
names, emails or IP addresses.

## Test the core journey

1. Create a senior account and post a request.
2. Sign out.
3. Create a volunteer account and claim the request.
4. Mark it finished as the volunteer.
5. Sign back into the senior account and confirm it was done. The status is
   now complete and points are awarded.

Run automated backend tests with:

```bash
python -m pytest -q
```

## Deploy without buying a domain

`render.yaml` retains the free-tier demo configuration. Its `/tmp` SQLite data
is temporary. Pilot registration refuses to open on that path, even with an
invitation code. The separate `render.persistent.example.yaml` is a reviewable
paid-disk option; applying it changes costs and must be reviewed first.

For a real pilot, verify persistent storage, an adult host's screening and
supervision process, private coordination, and consent before inviting people.

## Technology

- React 18 and Vite
- FastAPI
- SQLite
- Optional Gemini image analysis

## Attribution

This is a team project. Preserve the original contributors and competition
context when sharing or submitting it. Later commits should be described as
post-competition refinements rather than part of the original submission.
