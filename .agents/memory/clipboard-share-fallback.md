---
name: Share/copy features need fallbacks
description: navigator.clipboard is blocked in preview iframes & webviews — share UIs must degrade gracefully.
---

# Share/copy must never rely on clipboard alone

`navigator.clipboard.writeText` throws (NotAllowedError) in contexts this app
actually runs in: the Replit preview iframe and many in-app / mobile webviews.
A "Copy link" button that only calls the clipboard API will silently do nothing
for real users.

**How to apply to any share surface** (draft invite, challenge links, perfect-day
share, etc.):
1. Prefer `navigator.share(...)` when present (mobile native sheet) — and on
   cancel/reject, do nothing (don't fall through to an error).
2. Try `navigator.clipboard.writeText`.
3. Fall back to selecting a visible read-only `<input>` + `document.execCommand("copy")`.
4. **Always render the full link in a selectable field** so manual copy works even
   when every programmatic path is blocked.

**Why:** symptom reported as "create and share doesn't work" — create was fine; the
copy button was failing in the preview/webview and there was no link to grab by hand.
