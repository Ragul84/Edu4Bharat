# Heartbeat Tasks

This file is checked every 30 minutes by the runtime agent.

## Active Tasks

- Every heartbeat (30m): check `miga2` health endpoint and log failures.
- Every heartbeat (30m): trigger `api/broadcast?action=goal_resume` and log result.
- Twice daily: verify broadcast actions (`daily_challenge`, `reminder`, `goal_resume`).
- Daily: run quiz integrity checks (duplicates + answer validity summary).
- Daily: queue safe reseed note if a subject bank is under target volume.

## Completed

- Move completed heartbeat jobs here or delete them.
