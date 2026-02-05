# Vivons Chapet - Distribution Tracts

## What This Is

Application web interactive pour visualiser et gérer la répartition des zones de distribution de tracts pour la campagne électorale "Vivons Chapet" (élections municipales de Chapet, mars 2026). Permet au coordinateur de voir sur une carte où habitent les colistiers et d'assigner des zones de distribution en fonction de la proximité géographique.

## Core Value

**Voir sur une carte les zones de distribution et qui est assigné où.**

C'est l'outil qui permet au coordinateur de répartir efficacement le travail de distribution entre les colistiers, en privilégiant la proximité domicile-zone.

## Current Milestone: v1.1 Généricité + Export

**Goal:** Rendre l'application générique (wizard onboarding pour choisir la commune) et permettre l'export de fiches par zone avec rues OSM.

**Target features:**
- Wizard d'onboarding au premier lancement (code postal → commune → CSV colistiers)
- Option de reconfigurer/changer de commune après le premier lancement
- Export par zone : fiche avec colistiers assignés + rues depuis OpenStreetMap
- Deux formats d'export : PDF imprimable + CSV

## Requirements

### Validated

- ✓ Carte interactive centrée sur commune avec contour — v1.0
- ✓ Import CSV colistiers avec géocodage automatique — v1.0
- ✓ Marqueurs colorés pour chaque colistier — v1.0
- ✓ Zones de distribution dessinables et éditables — v1.0
- ✓ Assignation colistiers aux zones — v1.0
- ✓ Sauvegarde LocalStorage + Export/Import JSON — v1.0
- ✓ Estimation OSM du nombre de bâtiments par zone — v1.0

### Active

- [ ] Afficher une carte interactive centrée sur Chapet (78130) avec contour communal
- [ ] Importer les colistiers depuis un fichier CSV/JSON avec géocodage automatique des adresses
- [ ] Afficher un marqueur coloré pour chaque colistier sur la carte
- [ ] Permettre de dessiner des polygones pour définir des zones de distribution
- [ ] Permettre de modifier et supprimer les zones existantes
- [ ] Nommer chaque zone
- [ ] Assigner un ou plusieurs colistiers à chaque zone
- [ ] Afficher visuellement l'assignation (couleur de zone = couleur colistier)
- [ ] Sauvegarder les données localement (LocalStorage) pour ne pas perdre le travail

### Out of Scope

- Multi-scénarios / comparaison de répartitions — un seul état de travail suffit
- Exports (PDF, PNG, fiches individuelles) — nice to have, pas MVP
- Suivi de distribution (marquage rues distribuées) — v2
- Import automatique des rues depuis OSM — v2
- Optimisation automatique de répartition — v2
- Mode mobile optimisé — v2
- Multi-utilisateurs — coordinateur seul pour le MVP

## Context

**Campagne électorale "Vivons Chapet"** pour les municipales de mars 2026. L'équipe de colistiers doit distribuer des tracts dans toutes les boîtes aux lettres de la commune.

**Utilisateur principal :** Michel-Marie (coordinateur de campagne) — seul à utiliser l'outil pour créer et modifier les zones.

**Critère clé de répartition :** Proximité entre le domicile du colistier et la zone assignée.

**Données disponibles :**
- Liste des colistiers avec adresses (fichier CSV à fournir)
- Contour communal disponible via API geo.api.gouv.fr
- Géocodage via api-adresse.data.gouv.fr (gratuit, illimité)

**Volume :** Petite commune (~2000 habitants), données légères, pas de contrainte de performance.

## Constraints

- **Stack cartographique :** Leaflet.js + OpenStreetMap — gratuit et open-source
- **Hébergement :** Application statique (GitHub Pages, Vercel, ou fichier local)
- **RGPD :** Données colistiers sensibles (adresses, téléphones) — stockage local uniquement, pas de serveur tiers
- **Offline :** Doit fonctionner sans connexion après chargement initial
- **Navigateurs :** Chrome, Firefox, Safari, Edge (modernes)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| LocalStorage pour persistence | Simple, pas de backend, données restent locales (RGPD) | — Pending |
| Pas de multi-scénarios | Un seul état de travail suffit pour le besoin | — Pending |
| API Adresse gouv.fr pour géocodage | Gratuit, illimité, données françaises précises | — Pending |

---
*Last updated: 2025-02-05 after initialization*
