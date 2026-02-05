# Roadmap: FlyerMap

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (shipped 2026-02-05) — [Archive](milestones/v1.0-ROADMAP.md)
- 🔄 **v1.1 Généricité + Export** — Phases 5-8 (current)

---

## v1.1 Généricité + Export

**Goal:** Rendre l'application générique (wizard onboarding pour choisir la commune) et permettre l'export de fiches par zone avec rues OSM.

**Status:** Planning
**Depth:** Quick (4 phases)
**Coverage:** 18/18 requirements mapped

### Phase 5: Wizard Foundation

**Goal:** L'utilisateur peut sélectionner sa commune via code postal au premier lancement

**Dependencies:** v1.0 completed

**Requirements:**
- WIZ-01: Écran de bienvenue au premier lancement
- WIZ-02: Stepper de progression
- WIZ-03: Saisie code postal et lookup communes
- WIZ-04: Choix si plusieurs communes
- WIZ-05: Aperçu contour commune avant confirmation

**Success Criteria:**
1. User sees welcome screen explaining the app on first launch
2. User can enter postal code and see matching commune(s)
3. User can select from multiple communes when postal code has several
4. User sees commune boundary preview on map before confirming
5. Stepper shows progress through wizard steps

**Plans:** 0/TBD

---

### Phase 6: CSV Import in Wizard

**Goal:** L'utilisateur peut uploader et valider son fichier CSV de colistiers dans le wizard

**Dependencies:** Phase 5 (wizard foundation must exist)

**Requirements:**
- WIZ-06: Format CSV expliqué
- WIZ-07: Upload CSV colistiers
- WIZ-08: Validation CSV avec erreurs
- WIZ-09: Confirmation et génération carte + géocodage

**Success Criteria:**
1. User sees clear explanation of expected CSV format (required columns)
2. User can upload CSV file containing team members
3. User sees validation errors (missing columns, incorrect format) before proceeding
4. User can confirm and launch map generation with automatic geocoding
5. Map loads with selected commune and geocoded team members

**Plans:** 0/TBD

---

### Phase 7: Reconfiguration

**Goal:** L'utilisateur peut réinitialiser et changer de commune sans perdre de données accidentellement

**Dependencies:** Phase 5 (wizard must be reusable)

**Requirements:**
- RECONF-01: Bouton pour reconfigurer/changer commune
- RECONF-02: Avertissement perte données
- RECONF-03: Annulation possible

**Success Criteria:**
1. User can access reconfiguration button from main interface
2. User sees clear warning about data loss before proceeding
3. User can cancel reconfiguration and keep existing data
4. User can confirm and restart wizard to change commune

**Plans:** 0/TBD

---

### Phase 8: Zone Export

**Goal:** L'utilisateur peut exporter une fiche détaillée par zone avec rues OSM et colistiers assignés

**Dependencies:** v1.0 (zones must exist), Phase 6 (team members must exist)

**Requirements:**
- EXP-01: Export PDF par zone
- EXP-02: PDF avec nom zone + colistiers
- EXP-03: PDF avec carte visuelle zone
- EXP-04: PDF avec liste rues OSM
- EXP-05: Export CSV par zone
- EXP-06: Indicateur chargement pendant récup rues

**Success Criteria:**
1. User can export any zone as PDF from zone editor
2. PDF includes zone name and assigned team members
3. PDF includes visual map of zone boundary
4. PDF includes list of streets from OpenStreetMap within zone
5. User can export zone as CSV with structured data
6. User sees loading indicator while OSM streets are being fetched

**Plans:** 0/TBD

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 1/1 | Complete | 2026-02-05 |
| 2. Team Management | v1.0 | 3/3 | Complete | 2026-02-05 |
| 3. Zone Creation | v1.0 | 3/3 | Complete | 2026-02-05 |
| 4. Assignment System | v1.0 | 3/3 | Complete | 2026-02-05 |
| 5. Wizard Foundation | v1.1 | 0/TBD | Pending | — |
| 6. CSV Import in Wizard | v1.1 | 0/TBD | Pending | — |
| 7. Reconfiguration | v1.1 | 0/TBD | Pending | — |
| 8. Zone Export | v1.1 | 0/TBD | Pending | — |

---

## Archived Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-4) — SHIPPED 2026-02-05</summary>

- [x] Phase 1: Foundation (1/1 plans) — completed 2026-02-05
- [x] Phase 2: Team Management (3/3 plans) — completed 2026-02-05
- [x] Phase 3: Zone Creation (3/3 plans) — completed 2026-02-05
- [x] Phase 4: Assignment System (3/3 plans) — completed 2026-02-05

See [v1.0 Archive](milestones/v1.0-ROADMAP.md) for full details.

</details>

---

## Next Steps

To start Phase 5:
```
/gsd:plan-phase 5
```

---
*Roadmap updated: 2026-02-05 after v1.1 roadmap creation*
