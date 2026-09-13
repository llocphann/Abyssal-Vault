# Bodybuilding

`20_Personal_Life/33_Bodybuilding/Gym_n_Calisthenics_Exercises` is a local exercise library containing Markdown records plus preview images and animated demonstrations.

## Exercise records

Examples include `34_Sit-Up.md`, `90_90_Hamstring.md`, `Ab_Crunch_Machine.md`, `Ab_Roller.md`, `Adductor.md`, `Advanced_Kettlebell_Windmill.md`, and `Air_Bike.md`.

The library is large, but the records share one schema.

### Functions of an Exercise note

- **`name`** — stores the exercise name.
- **`level`** — stores Beginner, Intermediate, or Advanced.
- **`force`** — stores the force pattern.
- **`mechanic`** — stores mechanic classification.
- **`equipment`** — stores required equipment.
- **`category`** — stores exercise category.
- **`primaryMuscles`** — stores the main muscle groups.
- **`secondaryMuscles`** — stores supporting muscle groups.
- **`preview`** — points to a static `.webp` preview.
- **`animation`** — points to an animated demonstration.
- **Local media** — keeps movement references available without depending on remote images.

## `Bodybuilding.base`

### Functions

- **Exercise scope** — queries the dedicated exercise-library folder.
- **Level grouping** — normalizes Beginner, Intermediate, and Advanced groups.
- **Animated demo** — exposes the animation field for movement demonstration.
- **Packed exercise card** — displays level, exercise name, primary muscles, and equipment.
- **Preview image** — uses the static preview as the card image.
- **Exercise Library** — provides the card collection.
- **Exercise Data — Edit** — provides an editable metadata table.

Because exercise records share a common schema, documentation focuses on field behavior rather than listing every exercise file individually.