---
name: Multiplayer session writes need row locks
description: Token-claim / turn-gated multiplayer flows must serialize read-check-write under a row lock.
---

# Multiplayer session mutations must be row-locked transactions

Any endpoint that does "read a shared session row → validate (claim/turn/duplicate) →
write back" for a two-player flow (e.g. `draft_sessions` join/pick/finalize, and the
PvP `challenges` claim-lock) MUST run the read-check-write inside a single
`db.transaction` with `SELECT … FOR UPDATE` on the session row.

**Why:** without the lock it's a read-then-write race. Concrete failures seen:
- Two simultaneous joiners both pass the "joiner is null" check → second write clobbers
  the first → token/role confusion.
- Two same-turn picks both pass the turn gate → last write wins → a pick is dropped.
- A non-atomic finalize (insert tournament, then mark session complete as separate ops)
  can create orphan/duplicate cups if interleaved.

**How to apply:** lock the row first (`.for("update")`), re-derive everything from the
locked snapshot, and do the terminal insert + status update in the same transaction.
Return a discriminated result (`{ok}` vs `{status,error}`) from the txn and translate to
the HTTP response outside it.
