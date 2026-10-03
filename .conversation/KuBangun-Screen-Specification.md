# KuBangun — Screen and Form Specification

Version: 1.0  
Status: Draft implementation specification  
Scope: Low-rise residential buildings in Indonesia; new construction and renovation  
Related document: KuBangun-Product-Plan.md v1.1

## 1. Interface principles

- Proposed default language: Bahasa Indonesia; labels below include Indonesian examples.
- Responsive web interface; support phone-based photos and field observations.
- Homeowners see guided questions; professionals see technical detail and review tools.
- Use metric units. Show a unit alongside every numerical measurement.
- Store zero, unknown, not applicable, and not yet entered as different states.
- Label each value as manually entered, extracted/unverified, user-confirmed, or professionally verified.
- User confirmation establishes what was entered, not its engineering adequacy.
- Preserve original inputs and source evidence; no silent AI defaults.
- Capture physical state separately: Existing / Proposed. Never overwrite the existing building with proposed renovation details.
- Separate data readiness from engineering conclusions.

## 2. Navigation and main flows

Primary navigation: Dashboard, Projects, Review Tasks, Reports, Account.

Project navigation: Overview, Building Data, Drawings, Existing Condition (renovation), Proposed Changes (renovation), Calculations, Professional Review, Reports, Settings.

New construction:
Dashboard → Create Project → Site & Building Profile → Forms/Drawings → Verify Data → Calculations → Review → Report.

Renovation:
Dashboard → Create Project → Existing Building → Forms/Drawings → Condition Records → Proposed Changes → Verify Data → Calculations → Review → Report.

Users may save incomplete work and navigate non-linearly. The app blocks only actions whose prerequisites are missing.

## 3. Screen specifications

### 01 — Sign-in and onboarding / Masuk
Purpose: establish identity and interface needs.

Fields: name, email, account authentication, preferred language, homeowner/professional role.

Professional profile: discipline, organization (optional), credential details and verification evidence appropriate to the review role. These are submitted for verification, not self-approved.

Actions: sign in, create account, recover access, complete profile.

Rules: use established authentication; never store plaintext passwords. Separate personal role preferences from project permissions. A professional profile does not automatically grant review authority.

### 02 — Dashboard / Beranda
Purpose: resume work and see pending actions.

Show: project name, project mode, locality, latest revision, data completion, review status, last activity, and next missing requirement.

Filters: new construction/renovation, draft/awaiting review/reviewed, project membership.

Actions: create project, open project, open review task.

Empty state: explain both project modes and offer “Buat Proyek”.

### 03 — Create project / Buat Proyek
Required: project name, mode (Bangun Baru / Renovasi), province and city/regency, residential use, existing/proposed floor count as relevant.

Optional initially: descriptive address, site pin, owner reference, description, target dates.

Actions: save draft, continue, cancel.

Rules: location details become required only when needed by a supported calculation or local review. Precise location is private. Warn before mode changes invalidate mode-specific data; preserve history.

Out-of-scope projects: explain current product limits. A defined eligibility rule can block an unsupported calculation, not erase uploaded documentation.

### 04 — Project overview / Ringkasan Proyek
Show: mode, current revision, participants, building summary, unresolved data, pending extraction jobs, review requests, and available reports.

Checklist: building information → evidence → verification → supported calculations → review.

Actions: continue next task, invite professional, view revision history.

States: draft data, incomplete data, preliminary calculation, awaiting professional review, professionally reviewed. These labels do not indicate occupancy safety or regulatory approval.

### 05 — Site and building profile / Data Lahan & Bangunan
Shared inputs:
- Land area (m²), building footprint area (m²), total floor area (m²).
- Floor count; floor elevations/heights (m); roof type and geometry where known.
- Intended use by floor; attached/detached relationship to neighboring buildings.
- Structural system and material descriptions, with “unknown”.
- Site observations: slope, visible drainage issues, adjacent excavation or other relevant conditions.
- Available documents: drawings, inspection records, soil reports, prior calculation reports.

New-construction additions: proposed structural system, intended material specifications, proposed site levels, available geotechnical information.

Renovation additions: approximate construction year (optional/unknown), previous alterations, known damage history, available as-built information.

Rules: do not treat construction year as proof of condition. Site observations cannot substitute for geotechnical data. Distinguish approximate areas from verified geometry.

### 06 — Floors, rooms, and components / Lantai & Elemen
Hierarchy: building revision → floors → rooms and components. Components may span floors or serve multiple rooms.

Room fields: name, use, shape, length/width or polygon geometry, clear height, area, source.

Component fields: identifier, type (wall, column, beam, slab, roof, foundation, opening), location, physical state, material, geometry, evidence.

Measurement examples:
| Component | Geometric inputs | Technical inputs, when required by a supported module |
|---|---|---|
| Wall | Length, height, thickness; opening positions and sizes | Material properties; load-bearing role verified by professional |
| Beam | Span, section dimensions, position | Supports, material properties, reinforcement details, loads |
| Column | Storey height, section dimensions, position | Connections, material properties, reinforcement, load path |
| Slab | Span geometry, thickness, openings | Support conditions, material/reinforcement, loading |
| Roof | Plan dimensions, slope, member spacing | Member sections, connections, material and loading |
| Foundation | Type and known dimensions/depth | Ground information, material details, loads and connections |

Technical fields are module-specific, not all mandatory at project creation. Hidden dimensions and reinforcement require documentary or investigation evidence; AI/photo guesses remain unverified.

Actions: add/edit component, attach evidence, mark unknown, compare revisions.

Rules: validate positive geometric values where appropriate, convert units explicitly, and warn about inconsistent dimensions. An isolated component result must not be presented as whole-building verification.

### 07 — Drawing library and viewer / Gambar & Denah
Upload: PDF, JPG, PNG. Metadata: title, drawing type, revision/date if known, existing/proposed state, origin (design/as-built/survey/unknown).

Viewer: page selection, zoom, rotation, annotations, component links, printed scale/reference dimensions.

Extraction suggestions: dimension labels and room labels within explicitly supported document coverage.

Actions: upload, start extraction, inspect suggestion, retry an eligible failed job, enter manually.

States: uploading, processing, ready, extraction failed, unsupported content, needs verification.

Rules: private access, upload limits and malware/file checks. Do not claim CAD/BIM support in this release. A proposed drawing does not prove existing construction.

### 08 — Verify measurements / Verifikasi Ukuran
Show each proposed value beside its source page and region.

Fields: original extracted text, interpreted value, unit, component link, reference dimension/scale, correction, confirmation actor/time.

Actions: accept individually, edit, reject, mark unresolved. For a bounded selection, bulk confirmation must show exactly which values will be confirmed.

Rules: printed dimensions are distinguished from geometry-derived measurements. Block pixel-to-real-size conversion without a verified reference. Flag contradictions without silently choosing a source. Extraction scores describe model confidence, not physical accuracy.

Exit: return to forms or continue when required inputs are verified.

### 09 — Existing condition / Kondisi Bangunan
Renovation-only inspection log.

Observation fields: component/location, category, description, observation date, observer, photos, measured dimensions if available, evidence method.

Categories: cracks, deformation, corrosion, moisture/leaks, surface deterioration, settlement indicators, connection issues, other.

Optional crack fields: measured width (mm), length (mm or m), orientation, measurement method, repeat observation. Observers do not assign structural cause automatically.

Actions: add observation, annotate photo, record follow-up, request professional inspection.

Professional-only fields: interpreted significance, additional investigation required, inspection limitations, recommended actions.

Rules: do not invent severity thresholds. Engineer-approved escalation rules and wording must be established before automated alerts launch.

### 10 — Proposed changes / Rencana Renovasi
Renovation-only form.

Fields: affected components/rooms, change type, description, proposed dimensions/materials, associated drawings.

Change types: add/remove opening, remove/modify wall, extend footprint, add floor, modify roof, change room use, introduce equipment/load, repair component, other.

Show: existing versus proposed data, unresolved structural role, affected observations.

Actions: create alternative revision, edit change, submit for review.

Rules: demolition, added floors, changed loading and uncertain load-bearing elements require professional evaluation; the app does not issue an automatic permission to proceed.

### 11 — Data readiness / Kelengkapan Data
Purpose: explain what each intended analysis still needs.

Show required input, current value/state, evidence source, verification state, and reason needed.

Actions: enter missing data, attach evidence, ask reviewer, select supported module.

Rules: readiness is specific to a calculation module. A project may be well documented yet insufficient for structural conclusions. No “100% complete” label should imply safety.

### 12 — Calculation workspace / Perhitungan Teknis
Professional-led; homeowners can view authorized explanations/results.

Module card: purpose, supported systems, exclusions, required inputs, method version, applicable standards references approved by the engineering adviser.

Inputs: verified geometry, material properties, loading, supports/connections, and site/ground information required by the chosen method. Display unknowns and assumptions.

Actions: validate input, run, inspect calculation steps, compare revision, request review.

Outputs: numerical result with units, intermediate values, warnings, applicability statement, input snapshot, method version, and benchmark-tested checks.

Rules: only validated modules are enabled. No invented standards editions, hard-coded “safe” thresholds, or hidden material/load defaults. Mark unimplemented modules unavailable, not simulated. Critical missing inputs block execution.

The first module is deliberately not selected in this specification; a qualified Indonesian structural engineer must define its method and eligibility before implementation.

### 13 — Professional review / Tinjauan Profesional
Show: project revision, changed inputs, evidence, missing information, calculation runs, findings, reviewer credentials/role.

Actions: request information, comment on a field, return for revision, complete an attributable review within the reviewer's authorized discipline.

Review record: reviewer identity, scope, evidence inspected, limitations, findings, recommendations, timestamp.

Rules: explicit final confirmation before recording the review decision. Changes afterward create a new revision requiring renewed review. Approval of a component cannot be represented as approval of the whole building. Review is not a permit or automatic legal certification.

### 14 — Reports / Laporan
Report sections: project identity/mode, revision, building description, source documents, verified measurements, observations, proposed changes, calculation methods/results, unknowns, assumptions, reviewer record, limitations, recommended next actions.

Actions: preview, export PDF, download prior version, revoke an app sharing link if enabled.

Rules: draft/preliminary marks remain visible on unreviewed reports. Exports remain immutable and retain revision identifiers. Do not label a report professionally reviewed when its current input revision has not been reviewed. Sharing outside the team is private by default and requires explicit permission.

### 15 — Project team, settings, and history / Pengaturan Proyek
Fields: name, locality, members, role grants, language, data retention preference where supported.

Actions: invite collaborators with disclosed access scope, remove access, view audit history, archive project, request export/deletion.

Rules: server-side membership checks on every project resource. Confirm externally visible invitations and destructive actions. Do not expose credential evidence to homeowners by default; display verified status and authorized discipline as appropriate.

## 4. Measurement data contract

Every measurement must store:
- Stable measurement/component identifier.
- Quantity type, numerical value, original unit, normalized unit.
- Existing/proposed state and building revision.
- Source type, document/page/region or inspection reference.
- Approximate/exact-as-recorded designation; do not imply physical precision.
- Confirmation/verification actor and timestamp.
- Supporting evidence and unresolved discrepancies.

Separate inputs from computed values. Derived areas and volumes reference the input measurements and formula version used. Data changes invalidate dependent calculation runs for the current revision while retaining historical results.

## 5. Key UX and validation cases

| Situation | Required behavior |
|---|---|
| User does not know a material or hidden detail | Save unknown; explain evidence needed; never invent a value. |
| Upload is unreadable or extraction fails | Preserve original file and offer manual entry. |
| Plans have conflicting dimensions | Highlight both sources; require resolution or professional review. |
| Renovation drawing lacks structural information | Continue documentation; block analyses needing it. |
| User edits a reviewed value | Create new revision; show review pending for changed results. |
| Reviewer lacks the required discipline/verification | Prevent the relevant review decision. |
| Calculation service fails | Preserve inputs; show failure, not fabricated results. |
| Project is outside calculation eligibility | Explain limits and allow documentation without unsupported analysis. |

## 6. Implementation order

1. Identity, permissions, dashboard, project setup and revision model.
2. Building forms, component hierarchy, private file uploads and drawing viewer.
3. Bounded extraction, source-linked verification and manual fallback.
4. Condition records, renovation changes and readiness checks.
5. Review workflow, audit history and PDF reports.
6. Expert-defined calculation module after method review and benchmark validation.

Acceptance gate: test both full journeys, permission isolation, revision invalidation, extraction failures, unknown inputs, unit conversions, and report provenance. Do not present a workflow prototype as a validated engineering product.

## 7. Outstanding engineering and product decisions

- Numerical definition of low-rise eligibility and supported structural systems.
- First calculation module, standards editions, required inputs and test benchmarks.
- Reviewer credential verification and discipline-specific permissions.
- Extraction file/page limits and representative Indonesian drawing samples.
- Approved escalation guidance for potentially urgent observations.
- Whether an invited professional supplies onsite services outside the application; the initial app does not promise to provide inspectors.