# 3D models

Rule: one model per file.

Model code is organized by domain:

```text
assets/models/
  aircraft/
  characters/
  city/
  daynight/
  effects/
  environment/
  missions/
  police/
  props/
  rural/
  terrain/
  vehicles/
  weapons/
```

Do not add grouped model packs such as `effects.js`, `world-props.js`, or
`mission-models.js`. If a new visual 3D object is added, create a dedicated file
for that object and import it directly from gameplay code.

Gameplay systems in `js/` should orchestrate models, not define model geometry,
meshes, groups, sprites, lines, points, or visual materials.
