---
name: Browser regression checks
description: Native select option assertions in browser regression tests
---

Assert a native select option's disabled attribute or DOM property, not Playwright's `toBeDisabled()` matcher.

**Why:** The browser regression run reported an option as enabled even though its rendered HTML contained `disabled`; the matcher does not treat native option elements like form controls.

**How to apply:** When checking unavailable room pairings, assert the option's actual disabled attribute/property. Do not change functioning application logic to satisfy the unsupported matcher.