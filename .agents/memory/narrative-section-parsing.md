---
name: AI narrative section parsing
description: Why section bodies must be cleaned per-section, not just per-half, in the fight narrative parser.
---

# Fight narrative section parsing

The fight narrative parser splits AI output by walking `=== MARKER ===`
delimiter to delimiter — each section's body is everything between its marker
and the next marker.

**Constraint:** trailing markdown junk a model emits between sections (a `---`
horizontal rule, a bare `###` heading line) lands at the END of the PRECEDING
section's body, in the middle of the narrative — not at the end of the whole
text.

**Why:** the half-level cleaner only strips the TAIL of a whole generated half
(the parallel narrative is generated as two halves). Interior separators sit
inside a half, so a tail-only strip never reaches them. They surface as stray
`---`/`###` at the end of an interior round.

**How to apply:** any cleanup of separator/meta junk must run per-section (on
each parsed section body, head and tail), not only per-half. Match
separator-ONLY lines (e.g. `^[ \t]*(?:[-*_]{2,}|#{1,6})[ \t]*$`) so real lines
like `### Final Blow` or `--- then he struck` are preserved.
