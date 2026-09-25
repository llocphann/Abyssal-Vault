# Daily Schedule

Recurring weekday source notes live under `90_System/97_Daily_Schedule`:

```text
01_Monday.md
02_Tuesday.md
03_Wednesday.md
04_Thursday.md
05_Friday.md
06_Saturday.md
07_Sunday.md
```

Each note follows the same three-heading contract:

```markdown
## Daily Schedule
## Calisthenics
## Cardio
```

The heading names are configurable through `settings.md`.

## `01_Monday.md`

- **Daily Schedule** — stores Monday's timetable.
- **Calisthenics** — stores Monday's strength/bodyweight routine.
- **Cardio** — stores Monday's cardio plan.

The current sample Monday plan includes morning preparation, focused work, smaller tasks, lunch/breaks, project work, errands, Calisthenics, Cardio, dinner, reading/hobby time, daily review, wind-down, and sleep. The exercise section includes Push-up, Bodyweight Squat, Inverted Row, and Plank; the cardio section uses a brisk walk.

## `02_Tuesday.md`

- **Daily Schedule** — source for Tuesday schedule.
- **Calisthenics** — source for Tuesday exercise.
- **Cardio** — source for Tuesday cardio.

## `03_Wednesday.md`

- **Daily Schedule** — source for Wednesday schedule.
- **Calisthenics** — source for Wednesday exercise.
- **Cardio** — source for Wednesday cardio.

## `04_Thursday.md`

- **Daily Schedule** — source for Thursday schedule.
- **Calisthenics** — source for Thursday exercise.
- **Cardio** — source for Thursday cardio.

## `05_Friday.md`

- **Daily Schedule** — source for Friday schedule.
- **Calisthenics** — source for Friday exercise.
- **Cardio** — source for Friday cardio.

## `06_Saturday.md`

- **Daily Schedule** — source for Saturday schedule.
- **Calisthenics** — source for Saturday exercise.
- **Cardio** — source for Saturday cardio.

## `07_Sunday.md`

- **Daily Schedule** — stores a slower routine emphasizing reflection, weekly review, preparation, household tasks, hobbies, and recovery.
- **Calisthenics** — stores light/recovery movement.
- **Cardio** — stores recovery cardio.

The current Sunday exercise plan includes Full-body Mobility, Easy Squat, Wall Push-up, and Dead Bug; Cardio uses an easy recovery walk.

# Runtime flow

```text
Weekday source notes
   ├── Homepage → Dataview callout scripts
   └── Journal → Journal Custom View direct read
                    ↓
              configured headings
                    ↓
              compact snapshot
```

The Homepage continues to use `schedule-callout.js`, `exercise-callout.js`, and `cardio-callout.js`. Journal notes no longer contain those DataviewJS calls; the Journal Custom View reads the same weekday source file directly.

## Maintenance rule

Do not duplicate a recurring weekday schedule into the Homepage or Journal templates. Edit the weekday source note instead so every consumer receives the same data. Journal's template contains no schedule transclusion code.