# Contribuer à FlyerMap

Merci de votre intérêt pour contribuer à FlyerMap ! Ce document explique comment participer au projet.

## Comment contribuer

### Signaler un bug

1. Vérifiez que le bug n'a pas déjà été signalé dans les [issues](https://github.com/mmaudet/flyermap/issues)
2. Créez une nouvelle issue avec :
   - Une description claire du problème
   - Les étapes pour reproduire le bug
   - Le comportement attendu vs observé
   - Votre environnement (navigateur, OS)
   - Des captures d'écran si pertinent

### Proposer une amélioration

1. Ouvrez une issue pour discuter de votre idée avant de coder
2. Expliquez le problème que vous souhaitez résoudre
3. Décrivez la solution envisagée

### Soumettre du code

1. **Fork** le dépôt
2. Créez une branche pour votre fonctionnalité (`git checkout -b feature/ma-fonctionnalite`)
3. Commitez vos changements avec des messages clairs
4. Assurez-vous que le build passe (`npm run build`)
5. Poussez votre branche (`git push origin feature/ma-fonctionnalite`)
6. Ouvrez une **Pull Request**

## Standards de code

### Style

- JavaScript ES6+ avec modules
- Pas de TypeScript (projet vanilla JS)
- Indentation : 2 espaces
- Commentaires JSDoc pour les fonctions exportées

### Commits

Format recommandé :
```
type(scope): description courte

Description détaillée si nécessaire
```

Types : `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`

Exemples :
- `feat(export): add batch PDF export for all zones`
- `fix(geocoding): add retry logic for 504 errors`
- `docs: update README with FAQ section`

### Architecture

- `src/data/` : accès aux données (storage, APIs communes)
- `src/map/` : composants Leaflet (markers, zones, layers)
- `src/services/` : APIs externes (geocoding, overpass)
- `src/state/` : store centralisé avec pub/sub
- `src/ui/` : composants d'interface (dialogs, panels, wizard)
- `src/utils/` : utilitaires partagés

## Environnement de développement

```bash
# Installation
npm install

# Développement avec hot-reload
npm run dev

# Build de production
npm run build

# Preview du build
npm run preview
```

## Tests

Actuellement, le projet n'a pas de suite de tests automatisés. Les contributions pour ajouter des tests sont particulièrement bienvenues !

## Questions

Si vous avez des questions, ouvrez une issue avec le label `question`.

---

Merci de contribuer à FlyerMap !
