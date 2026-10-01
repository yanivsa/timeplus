# AHAVA sync API → Time+

Production source mirror for the Cloudflare Worker `ahava-sync-api`.

After each successful AHAVA snapshot save, the Worker retries recent Academy question results and inserts every correct unique `syncId` into `timeplus-db.learning_reward_credits`.

The Time+ D1 trigger credits exactly one screen minute and writes the immutable minute ledger entry.

Duplicate syncs are safe: the same `syncId` can never award a second minute.
