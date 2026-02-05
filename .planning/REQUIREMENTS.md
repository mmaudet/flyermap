# Requirements: FlyerMap v1.1

**Defined:** 2026-02-05
**Core Value:** Voir sur une carte les zones de distribution et qui est assigné où

## v1.1 Requirements

Requirements pour milestone v1.1 (Généricité + Export). Chaque requirement mappe à une phase du roadmap.

### Wizard Onboarding

- [x] **WIZ-01**: L'utilisateur voit un écran de bienvenue expliquant l'application au premier lancement
- [x] **WIZ-02**: L'utilisateur voit un stepper de progression indiquant l'étape courante du wizard
- [x] **WIZ-03**: L'utilisateur peut saisir un code postal et voir la/les commune(s) correspondante(s)
- [x] **WIZ-04**: L'utilisateur peut choisir parmi plusieurs communes si le code postal en contient plusieurs
- [x] **WIZ-05**: L'utilisateur voit un aperçu du contour de la commune avant de confirmer
- [x] **WIZ-06**: L'utilisateur voit le format CSV attendu pour les colistiers (colonnes requises)
- [x] **WIZ-07**: L'utilisateur peut uploader un fichier CSV de colistiers
- [x] **WIZ-08**: L'utilisateur voit les erreurs de validation du CSV (colonnes manquantes, format incorrect)
- [x] **WIZ-09**: L'utilisateur peut confirmer et lancer la génération de la carte avec géocodage

### Reconfiguration

- [x] **RECONF-01**: L'utilisateur peut accéder à un bouton pour reconfigurer/changer de commune
- [x] **RECONF-02**: L'utilisateur voit un avertissement de perte de données avant reconfiguration
- [x] **RECONF-03**: L'utilisateur peut annuler la reconfiguration et garder ses données

### Export Zone

- [ ] **EXP-01**: L'utilisateur peut exporter une zone en PDF
- [ ] **EXP-02**: Le PDF contient le nom de la zone et les colistiers assignés
- [ ] **EXP-03**: Le PDF contient une carte visuelle de la zone
- [ ] **EXP-04**: Le PDF contient la liste des rues de la zone (depuis OpenStreetMap)
- [ ] **EXP-05**: L'utilisateur peut exporter une zone en CSV (données structurées)
- [ ] **EXP-06**: L'utilisateur voit un indicateur de chargement pendant la récupération des rues OSM

## Future Requirements (v1.2+)

### Wizard Enhancements

- **WIZ-10**: Drag-and-drop pour upload CSV
- **WIZ-11**: Reprise du wizard si fermé en cours de route
- **WIZ-12**: Détection automatique des colonnes CSV

### Export Enhancements

- **EXP-07**: Export batch de toutes les zones en un seul PDF
- **EXP-08**: Export batch de toutes les zones en un seul CSV

## Out of Scope

| Feature | Reason |
|---------|--------|
| Import automatique des rues depuis OSM pour pré-remplir les zones | Complexité élevée, les zones sont dessinées manuellement |
| Multi-utilisateurs / partage | Coordinateur seul, pas de serveur |
| Stockage cloud | RGPD, données locales uniquement |
| App mobile native | PWA suffisant pour v1.x |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| WIZ-01 | Phase 5 | Complete |
| WIZ-02 | Phase 5 | Complete |
| WIZ-03 | Phase 5 | Complete |
| WIZ-04 | Phase 5 | Complete |
| WIZ-05 | Phase 5 | Complete |
| WIZ-06 | Phase 6 | Complete |
| WIZ-07 | Phase 6 | Complete |
| WIZ-08 | Phase 6 | Complete |
| WIZ-09 | Phase 6 | Complete |
| RECONF-01 | Phase 7 | Complete |
| RECONF-02 | Phase 7 | Complete |
| RECONF-03 | Phase 7 | Complete |
| EXP-01 | Phase 8 | Pending |
| EXP-02 | Phase 8 | Pending |
| EXP-03 | Phase 8 | Pending |
| EXP-04 | Phase 8 | Pending |
| EXP-05 | Phase 8 | Pending |
| EXP-06 | Phase 8 | Pending |

**Coverage:**
- v1.1 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-05*
*Last updated: 2026-02-05 after initial definition*
