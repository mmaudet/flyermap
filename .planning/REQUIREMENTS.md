# Requirements: Vivons Chapet - Distribution Tracts

**Defined:** 2025-02-05
**Core Value:** Voir sur une carte les zones de distribution et qui est assigné où

## v1 Requirements

Requirements pour la version initiale. Chaque requirement est mappé aux phases du roadmap.

### Carte

- [x] **MAP-01**: Afficher une carte Leaflet centrée sur Chapet (78130) avec zoom/pan ✓
- [x] **MAP-02**: Afficher le contour communal de Chapet (via geo.api.gouv.fr) ✓
- [x] **MAP-03**: Afficher les noms des rues sur la carte (tuiles OpenStreetMap) ✓

### Colistiers

- [x] **TEAM-01**: Importer les colistiers depuis un fichier CSV/JSON avec géocodage automatique (Géoplateforme API) ✓
- [x] **TEAM-02**: Afficher un marqueur coloré pour chaque colistier sur la carte ✓
- [x] **TEAM-03**: Afficher popup avec nom, adresse, téléphone au clic sur un marqueur ✓
- [x] **TEAM-04**: Afficher un panneau latéral avec la liste des colistiers et leurs couleurs ✓

### Zones

- [x] **ZONE-01**: Dessiner des polygones pour définir des zones de distribution (Leaflet-Geoman) ✓
- [x] **ZONE-02**: Modifier les zones existantes (déplacer les sommets, ajuster la forme) ✓
- [x] **ZONE-03**: Supprimer des zones de la carte ✓
- [x] **ZONE-04**: Nommer chaque zone (ex: "Zone Nord", "Quartier Gare") ✓

### Assignation

- [ ] **ASGN-01**: Assigner un ou plusieurs colistiers à chaque zone
- [ ] **ASGN-02**: La zone prend visuellement la couleur du colistier assigné
- [ ] **ASGN-03**: Afficher un panneau d'édition au clic sur une zone (nom, assignation, notes)
- [ ] **ASGN-04**: Saisir une estimation du nombre de boîtes aux lettres par zone

### Persistance

- [x] **DATA-01**: Sauvegarder automatiquement les données dans LocalStorage ✓
- [ ] **DATA-02**: Exporter les données complètes en fichier JSON
- [ ] **DATA-03**: Importer les données depuis un fichier JSON sauvegardé

## v2 Requirements

Déféré à une version future. Tracké mais pas dans le roadmap actuel.

### Exports

- **EXPO-01**: Export image PNG de la carte avec zones
- **EXPO-02**: Export PDF de la carte
- **EXPO-03**: Génération d'une fiche PDF par colistier avec sa zone

### Suivi de Distribution

- **DIST-01**: Marquer les zones comme "distribuées"
- **DIST-02**: Barre de progression par colistier
- **DIST-03**: Historique des distributions avec dates

### Optimisation

- **OPTI-01**: Suggestion automatique de répartition basée sur proximité
- **OPTI-02**: Import automatique des rues depuis OpenStreetMap

### Mobile

- **MOBI-01**: Interface responsive pour smartphone
- **MOBI-02**: Géolocalisation pour voir sa position pendant la distribution

## Out of Scope

Explicitement exclu. Documenté pour éviter le scope creep.

| Feature | Reason |
|---------|--------|
| Multi-scénarios / comparaison | Un seul état de travail suffit pour le besoin |
| Multi-utilisateurs | Coordinateur seul pour le MVP |
| Backend / base de données | LocalStorage + fichiers suffisent, RGPD compliant |
| Authentification | Pas nécessaire pour un usage local |
| Route optimization / navigation | Hors scope, les colistiers connaissent leur quartier |
| Chat temps réel | Complexité excessive pour le besoin |

## Traceability

Quelle phase couvre quel requirement. Mis à jour lors de la création du roadmap.

| Requirement | Phase | Status |
|-------------|-------|--------|
| MAP-01 | Phase 1 | Complete |
| MAP-02 | Phase 1 | Complete |
| MAP-03 | Phase 1 | Complete |
| TEAM-01 | Phase 2 | Complete |
| TEAM-02 | Phase 2 | Complete |
| TEAM-03 | Phase 2 | Complete |
| TEAM-04 | Phase 2 | Complete |
| DATA-01 | Phase 2 | Complete |
| ZONE-01 | Phase 3 | Complete |
| ZONE-02 | Phase 3 | Complete |
| ZONE-03 | Phase 3 | Complete |
| ZONE-04 | Phase 3 | Complete |
| ASGN-01 | Phase 4 | Pending |
| ASGN-02 | Phase 4 | Pending |
| ASGN-03 | Phase 4 | Pending |
| ASGN-04 | Phase 4 | Pending |
| DATA-02 | Phase 4 | Pending |
| DATA-03 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0 ✓

---
*Requirements defined: 2025-02-05*
*Last updated: 2026-02-05 after Phase 3 completion*
