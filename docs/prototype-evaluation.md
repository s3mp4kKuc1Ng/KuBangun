# KuBangun prototype evaluation

## What this release is for

Evaluate the navigation, Indonesian wording, project forms, building-data organization, renovation evidence, and preliminary reporting flow before committing to the full engineering product.

The scope is low-rise residential construction and renovation in Indonesia. Exact engineering eligibility rules remain to be defined.

## Useful evaluation paths

### New construction
Create a Bangun Baru project, enter location and building details, add rooms/components, upload a drawing, and record manually confirmed measurements. Inspect readiness and export a preliminary report.

### Renovation
Create a Renovasi project, record the existing building, add observations and proposed changes, attach reference documents, and inspect how the report distinguishes known facts from unknowns.

### Persistence
Save changes and reload the page. Reopen uploaded documents. Data should remain in the same browser/origin until cleared. Export structured project data as a backup when supported; project JSON should not be assumed to include uploaded file bytes.

### Review preview
Try the local role-view preference and review-request preview. These help evaluate the interface only. No request reaches a professional and no credential or structural conclusion is verified.

## Deliberate limits

- No production accounts, authentication, shared teams, or cross-device synchronization.
- Uploaded files stay in browser storage; this is not hosted project storage.
- No automated OCR/drawing extraction.
- No structural analysis or engineering safety certification.
- No permitting approval or universal SNI-compliance claim.
- Print/save-as-PDF output is a preliminary documentation report, not a signed engineering assessment.
- Example projects are fictional evaluation data.

Do not use the prototype to decide whether demolition, added loads, altered structural elements, or occupancy is safe.

## Feedback to collect

- Which questions are confusing or too technical for a homeowner?
- Which measurements and source documents are missing?
- Is existing versus proposed data clear for renovation?
- Can users distinguish unknown, entered, and confirmed information?
- Does the preliminary report clearly identify its limitations?
- Which technical workflow should be validated first with an engineering adviser?