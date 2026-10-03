---
name: Construction planning boundaries
description: User-defined estimates, browser-local execution, and historic progress constraints
---

Construction work and material coefficients are user-supplied assumptions, not engineering recommendations or validated manufacturer specifications. Roof surface area must be entered explicitly, never inferred from a room footprint or automatic renovation deductions.

**Why:** The user explicitly limited this product to editable planning and preliminary evidence, without structural calculations or certified estimates.

**How to apply:** Keep geometric bases, coefficients, procurement rounding, and overrides visible. Missing coefficients are actionable gaps, not zero quantities or inferred defaults.

Execution is independent of simulated review. Owner notifications are a saved inbox in the current browser only, without remote delivery, shared accounts, push, or background timers.

**Why:** The user chose a browser-local prototype, and did not authorize external integrations or collaboration.

**How to apply:** Persist progress and notifications together before reporting success. Reading notifications does not change engineering revisions. Preserve original baselines and append corrections rather than changing historic estimates.

Deleting a room must also account for historical baseline references of work that has since moved elsewhere. Keep that room until the dependent work and its history are explicitly deleted.

**Why:** Looking only at a work's current room allowed the former room to be deleted while its baseline still referenced it, making the project's own backup impossible to restore.

**How to apply:** Check every baseline as well as the live work scope. Rebaselining does not remove older references; protect them during deletion and remap them during duplicate restores.

Resolve cross-tab conflicts by preserving the latest saved history and offering draft export before reload, not by silently merging old execution snapshots. Reject writes when safe cross-tab locking is unavailable.

**Why:** Local-only execution has no shared-account authority or remote conflict resolver. Preserving baseline/progress history is more important than allowing writes in an unsupported browser; a compare-then-write alone cannot protect simultaneous writers.

**How to apply:** Keep the same data-safety guarantee for every project mutation, including inbox read status, restore, and deletion. Do not add an unlocked compatibility fallback or use engineering revision as the only freshness check.