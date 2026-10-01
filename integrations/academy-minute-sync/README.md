# Academy → Time+ minute sync

This small Cloudflare Worker bridges the AHAVA Academy data to Time+ without changing either application.

## Rule

- Every unique Academy question result with `isCorrect=true` earns **1 screen minute**.
- `syncId` is the idempotency key. Re-running the sync never awards the same answer twice.
- Only profiles configured in `learning_profile_links` are processed.
- `enabled_from_ms` prevents historical answers from being credited before the chosen start point.
- The Worker scans only newly appended `questionHistory` entries using `last_history_index`.
- If the source history is reset/truncated, it safely rescans because `syncId` prevents duplicates.

## Data flow

`screen_tasks_db.ahava_sync_profiles.questionHistory`
→ `timeplus-db.learning_reward_credits`
→ D1 trigger
→ `children.available_minutes + 1`
→ immutable `minute_transactions` ledger entry.

## Runtime

Worker: `timeplus-academy-sync`

Cron: every 5 minutes.

Manual idempotent run: `GET /sync`

Health: `GET /health`
