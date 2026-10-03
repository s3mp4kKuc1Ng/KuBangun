---
name: Cross-tab storage coherence
description: Browser-local concurrency and localStorage cache visibility under exclusive Web Locks
---

Do not assume a tab reads another tab's latest localStorage value immediately after acquiring the same exclusive Web Lock. Use a coherent shared version check in addition to the localStorage snapshot comparison.

**Why:** The simultaneous-writer browser regression intermittently let both tabs save old snapshots under the lock when storage events were suppressed. Both reported success while only one progress entry remained. Mutual exclusion did not ensure localStorage cache visibility.

**How to apply:** Keep the version guard in transactional browser storage, publish its new version before releasing a successful writer's lock, and roll it back before releasing the lock when localStorage fails. Retain the missed-event simultaneous-writer regression; do not replace coordination with a fixed delay or a notification-only check.