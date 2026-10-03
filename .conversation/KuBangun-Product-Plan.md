# KuBangun — Web Application Plan

Version: 1.1  
Status: Draft for scope approval  
Date: 2026-10-03  
Owner: Product owner to be assigned

## 1. Purpose and confirmed scope

KuBangun helps homeowners and construction professionals in Indonesia organize building information, assess existing conditions, evaluate proposed construction or renovation, and produce traceable technical reports.

Confirmed requirements:
- Two project modes: Build from Scratch and Renovation.
- Serve homeowners and professionals.
- Support guided manual entry and drawing extraction.
- Support Indonesia first.
- Cover existing-building assessment and proposed-design calculations.
- Start with low-rise residential buildings, including new houses and house renovations.

Confirmed product boundary: the first release targets low-rise residential buildings. High-rise, industrial, unusual structures, and infrastructure are excluded initially. The precise floor-count, height, structural-system, and other engineering eligibility limits still need definition with a qualified engineering adviser.

## 2. Product promise and boundaries

Help users understand what is known, what is missing, and which questions need professional investigation before building.

Do not promise to “measure every aspect” in one release. Organize the long-term scope into geometry, existing condition, structure, ground/foundations, building services, quantities/costs, and regulatory documentation.

KuBangun is not an automatic structural-safety certificate, substitute for a site inspection, or permitting authority. Professional review inside the app is not equivalent to government approval.

## 3. Users and permissions

| Role | Main capabilities |
|---|---|
| Homeowner | Create projects, enter facts, upload files, understand findings, request review. |
| Professional | Verify inputs, document inspections, configure supported calculations, review findings, issue attributable reports. |
| Administrator | Manage access, templates, standards versions, and audit records; cannot silently alter reviewed reports. |

Distinguish engineers, architects, and contractors by actual permissions and competence. An architect or contractor account must not automatically receive structural-engineering approval authority. Verify relevant credentials before enabling professional approval; verification rules need local expert input.

## 4. Core journeys

### Build from Scratch
1. Create project: location, intended use, floor count, and proposed building details.
2. Enter dimensions manually or upload drawings.
3. Confirm extracted scale, units, dimensions, rooms, and identified elements.
4. Add structural system, materials, loading assumptions, and available ground/site information.
5. Run completeness checks and only the engineering modules validated for that project type.
6. Review results with explicit assumptions, applicability limits, and missing evidence.
7. Request professional review and export a versioned report.

### Renovation
1. Record the existing building and available drawings.
2. Capture observed defects, photos, inspection date, and component locations.
3. Describe proposed changes: additions, openings, demolition, layout changes, or added loads.
4. Compare existing and proposed states while preserving both records.
5. Identify questions requiring inspection, testing, or structural review.
6. Run supported calculations using verified information.
7. Obtain professional review and export the assessment.

If distress observations indicate a potentially urgent issue, show an engineer-approved escalation message. A photo or checklist alone cannot establish cause, severity, or safety.

## 5. Feature scope

| Area | First release | Later expansion |
|---|---|---|
| Projects | Two modes, guided setup, collaborators | Portfolio and multi-organization management |
| Building data | Floors, rooms, components, dimensions, materials | Complex geometry and richer component libraries |
| Drawings | PDF/JPG/PNG uploads; suggested extraction with mandatory verification | CAD/BIM import, multi-sheet coordination, 3D |
| Condition assessment | Defect records, annotated photos, evidence and inspection checklists | Validated specialist assessment modules |
| Engineering | One narrowly scoped, expert-selected and validated calculation module | Broader structural, seismic, foundation, and services modules |
| Comparisons | Existing versus proposed inputs and findings | Multiple design alternatives |
| Reports | PDF, assumptions, evidence, limitations, reviewer and revision history | Additional exports and organization templates |
| Costs | Not required for initial technical release | Quantities, RAB, regional prices |

The first engineering module must be chosen with a qualified Indonesian structural engineer. Do not commit to full-building analysis before the engineering method, supported systems, data needs, and validation are established.

## 6. Drawing extraction

Treat AI/OCR extraction as a suggestion, never ground truth.

- Preserve the original file and link extracted values to their source page or drawing region.
- Request scale or a known reference dimension; never infer real dimensions from pixels alone.
- Separate printed dimensions from geometry-derived suggestions.
- Flag inconsistent units, ambiguous labels, unreadable drawings, and discrepancies.
- Require users to confirm or correct values before calculations use them.
- Do not infer hidden reinforcement, material strength, soil capacity, or structural connectivity as verified facts.
- Fall back to manual entry when extraction fails.

Initial extraction coverage should be explicitly limited, for example to readable dimension labels and room labels. Arbitrary structural-model reconstruction is a separate future capability.

## 7. Engineering and standards governance

Use deterministic, versioned calculation code. AI may assist with extraction and explanations, but must not invent formulas or approve safety.

A qualified Indonesian engineering adviser must define:
- Applicable SNI standards and current editions for each supported calculation.
- Load cases, combinations, units, boundary conditions, and applicability limits.
- Required survey, geotechnical, material, and site inputs.
- Calculation benchmarks, numerical tolerances, and peer-review requirements.
- The distinction between preliminary findings and professionally reviewed conclusions.

Each calculation records inputs, units, evidence, assumptions, method version, standards references, results, and warnings. Block dependent calculations when critical inputs are missing; do not replace unknown inputs with silent defaults.

Output states: Incomplete, Preliminary, Awaiting Professional Review, and Professionally Reviewed. Avoid an automatic “building safe” badge.

Local permitting and documentation requirements need separate verification by jurisdiction. Do not advertise universal Indonesian compliance.

## 8. Main application screens

- Dashboard: projects and review status.
- Project setup: construction mode, location, and building profile.
- Building workspace: floors, rooms, elements, and existing/proposed versions.
- Drawing viewer: source evidence, extraction suggestions, and corrections.
- Condition assessment: defects, photographs, and inspection records.
- Calculation workspace: supported modules, inputs, results, and limitations.
- Review workspace: comments, revision requests, and attributable review decisions.
- Reports: draft and reviewed versions with export.
- Administration: accounts, templates, permissions, and method versions.

Use Bahasa Indonesia as the proposed default, metric units, mobile-friendly data capture, and plain-language homeowner explanations alongside professional detail.

## 9. Recommended architecture

- Frontend: React and TypeScript.
- Backend: TypeScript API with server-side authorization.
- Data: PostgreSQL for projects, structured inputs, findings, and revisions.
- Files: private object storage with authorized access.
- Workers: asynchronous extraction and report-generation jobs.
- Engineering: isolated, deterministic calculation modules with regression tests.
- AI: provider abstraction for OCR/extraction; no authority to approve engineering results.

Primary records: User, Organization, Project, Membership, BuildingVersion, Floor, Room, Component, Drawing, ExtractionSuggestion, VerifiedMeasurement, DefectObservation, CalculationRun, MethodVersion, Review, ReportVersion, and AuditEvent.

Project revisions and reports must remain reproducible. Editing an input after review creates a new revision and makes the prior review inapplicable to the changed result.

Protect drawings and building locations as private project data. Include role-based access, upload validation, encrypted transport, backups, retention/deletion controls, and consent for external AI processing. Do not expose drawings through public links by default.

## 10. Phased delivery

### Now — Foundation and assessment workflow
Build accounts, permissions, both project modes, structured manual inputs, uploads, bounded drawing extraction, verification, defect records, professional review workflow, and draft reporting.

### Next — Validated engineering pilot
Select one calculation module with an engineering adviser. Implement and benchmark it, document applicability, introduce immutable calculation/report versions, and pilot with professionals. Both project modes exist before this phase, but technical calculation coverage remains limited until validation passes.

### Later — Broader coverage
Expand validated modules, seismic and foundation workflows, services assessments, advanced drawing imports, quantities/RAB, and optional project-execution tracking.

Provisional planning ranges for a small experienced team: 2–4 weeks for discovery and prototype, 6–10 weeks for the foundation release, and 4–8+ weeks for a bounded engineering pilot. These are low-confidence planning ranges, not commitments. Expert availability, extraction accuracy, and calculation complexity may change them substantially.

## 11. Acceptance criteria and launch gates

- Given a new project, choosing Renovation or Build from Scratch produces the corresponding workflow.
- Given an extracted dimension, it cannot enter engineering calculations until verified.
- Given a critical missing input, dependent calculations are blocked and explain what is needed.
- Given a supported benchmark, results meet engineer-defined numerical tolerances.
- Given a changed calculation input, the app creates a new version and requires renewed review.
- Given a homeowner account, it cannot approve an engineering report.
- Given a user outside the project, private drawings and reports are inaccessible.
- Given an exported report, it identifies its project revision, evidence, assumptions, method versions, limitations, and review status.

Launch gates: expert approval of calculation scope and test suite; permission/isolation tests; reliable reporting; manual fallback for extraction; and a pilot with representative homeowner/professional pairs.

Measure task completion, extraction correction frequency, blocked-input issues, review turnaround, and benchmark correctness. Set usage and business targets after a pilot baseline, rather than inventing targets now.

## 12. Alternatives and differentiation

Alternatives to evaluate during discovery include manual spreadsheets, engineering calculation packages, CAD/BIM tools, and inspection reports. No competitive market scan has been performed for this draft.

Proposed differentiation: one guided Indonesian workflow connecting homeowner evidence, verified drawing measurements, professional calculations, and traceable review.

## 13. Decisions required before implementation

- Define the engineering eligibility limits within the confirmed low-rise residential scope.
- Appoint a qualified engineering adviser and choose the first supported calculation module.
- Define eligible professional reviewers and credential checks.
- Agree on the initial drawing-extraction coverage and test examples.
- Confirm whether professional review happens within a user's own team or through a future marketplace.
- Assign the product owner, approver, and engineering/design contributors.

Suggested initial operating model: owners invite their own professionals. A paid expert marketplace and professional-service payments are not part of the first release.

## Changelog

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-10-03 | Initial plan based on confirmed audience, country, input methods, and project modes. |
| 1.1 | 2026-10-03 | User confirmed low-rise residential buildings as the initial scope. |