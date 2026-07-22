# Chore4More

Chore4More is a community prototype that helps older adults request assistance
with household chores and lets volunteers claim nearby tasks.

The original project was developed by a four-person team for the Young Coders'
Sphere competition. This repository is an archived team copy with later
reliability, deployment and interface refinements for portfolio demonstration.

## What works

- Senior and volunteer registration and sign-in
- Senior chore requests with an optional image
- Optional Gemini image analysis for suggested tools, steps and safety notes
- Safe fallback suggestions when no Gemini key is configured
- Volunteer request board, claiming and completion
- Senior status tracking
- Volunteer points and completion totals
- Responsive mobile and desktop interface
- Password-protected, unlisted pilot analytics dashboard
- Anonymous visitor, registration and chore-activation measurement
- CSV analytics snapshots for portfolio evidence
- One-server production setup: FastAPI serves the compiled React app

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

Image analysis returns a useful fallback without any API key. To use Gemini,
copy `.env.example` to `.env` and enter a private `GEMINI_API_KEY`. Never commit
the real `.env` file.

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
4. Mark it complete.
5. Sign back into the senior account and confirm its status is complete.

Run automated backend tests with:

```bash
python -m pytest -q
```

## Deploy without buying a domain

`render.yaml` contains a free-tier Render configuration. Connect this
repository to Render and it will build the frontend and start the FastAPI app.
The assigned `https://...onrender.com` address can be used as a public demo.
Render will prompt you to enter a private `ANALYTICS_PASSWORD` during setup.

For a real public pilot, replace the temporary SQLite storage with a persistent
managed database and add identity verification, moderation, privacy controls
and safeguarding before connecting unfamiliar seniors and volunteers.

## Technology

- React 18 and Vite
- FastAPI
- SQLite
- Optional Gemini image analysis

## Attribution

This is a team project. Preserve the original contributors and competition
context when sharing or submitting it. Later commits should be described as
post-competition refinements rather than part of the original submission.
