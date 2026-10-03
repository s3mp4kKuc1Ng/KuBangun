---
name: Localization boundaries
description: Preserve authored content and canonical data while changing the interface language
---

Language switching changes presentation, not project records. Indonesian and English must share the same persisted enum values and backup schema. Authored names, notes, descriptions, and filenames are not translation requests.

**Why:** Display labels can coincide with authored text; translating both would change the displayed meaning of user content and can silently alter implicit select values used by old backups.

**How to apply:** Localize interface copy and generated calculation grammar only. Protect authored text, keep explicit canonical select values, and check that changing language retains unsaved forms and leaves stored project data unchanged.