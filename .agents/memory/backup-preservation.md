---
name: Backup preservation
description: Non-destructive local restore and metadata-only document evidence
---

Preserve omitted legacy room labels rather than materializing `unknown` during loading or unrelated writes. Readers may treat an omitted label as unclassified.

**Why:** Importing a separate project must not change pre-existing records. Normalizing labels on load caused unrelated records to change when the whole local project list was saved.

**How to apply:** Keep read-time interpretation separate from persistence. Only an explicit user edit should change a room's classification.

Treat JSON backup documents as unavailable metadata, even when a local file shares the old document ID. Allocate fresh document IDs and remap every evidence reference together.

**Why:** JSON backups exclude file bytes; a coincidentally matching local ID is not proof that the file belongs to the restored evidence.

**How to apply:** Preserve source labels and user confirmations, but mark missing bytes explicitly in document controls, readiness, and preliminary reports until original files are supplied. Matching filename/type/size does not verify content.